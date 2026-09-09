import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { answerCallbackQuery, editTelegramReplyMarkup, escapeHtml, statusKeyboard } from '@/lib/telegram';

// Receives Telegram button presses (Ack/Snooze/Escalate/Resolve) posted by
// actionKeyboard() in send-push/route.ts. Register with Telegram once:
//   POST https://api.telegram.org/bot<TOKEN>/setWebhook
//     ?url=https://<site>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
// Telegram echoes secret_token back as the X-Telegram-Bot-Api-Secret-Token
// header on every call — that's the auth check below, not the bot token.
//
// Writes go through apply_attention_action() (50_NOTIFICATION_ATTENTION.sql),
// the same RPC pattern as claim_notifications/append_to_digest_bucket — no
// direct table writes from a route.

export const dynamic = 'force-dynamic';

const ACTIONS = new Set(['ACK', 'SNOOZE', 'ESCALATE', 'RESOLVE']);

const LABEL: Record<string, (actor: string, snoozedUntil: string | null) => string> = {
  ACK: (actor) => `✅ Acked by ${actor}`,
  SNOOZE: (actor, until) => `⏰ Snoozed by ${actor}${until ? ` until ${new Date(until).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}` : ''}`,
  ESCALATE: (actor) => `⬆️ Escalated by ${actor}`,
  RESOLVE: (actor) => `✔️ Resolved by ${actor}`,
};

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await request.json().catch(() => null) as { callback_query?: { id: string; data?: string; from?: { id?: number; username?: string } } } | null;
  const cb = update?.callback_query;
  if (!cb) return NextResponse.json({ ok: true }); // not a button press — nothing to do

  const [action, attentionId] = String(cb.data ?? '').split(':');
  if (action === 'NOOP') {
    await answerCallbackQuery(cb.id);
    return NextResponse.json({ ok: true });
  }
  if (!ACTIONS.has(action) || !attentionId) {
    await answerCallbackQuery(cb.id, 'Unknown action');
    return NextResponse.json({ ok: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    await answerCallbackQuery(cb.id, 'Server not configured');
    return NextResponse.json({ ok: true });
  }
  const supabase = createClient(url, key);

  const actor = cb.from?.username ? `@${cb.from.username}` : String(cb.from?.id ?? 'admin');
  const { data, error } = await supabase.rpc('apply_attention_action', {
    p_attention_id: attentionId,
    p_action: action,
    p_actor: actor,
    p_snooze_minutes: 30,
  });
  const result = (Array.isArray(data) ? data[0] : data) as
    | { last_chat_id: string | null; last_message_id: number | null; snoozed_until: string | null }
    | undefined;

  if (error || !result) {
    await answerCallbackQuery(cb.id, 'Could not update — item may be gone');
    return NextResponse.json({ ok: true });
  }

  await answerCallbackQuery(cb.id, `${action.charAt(0)}${action.slice(1).toLowerCase()} recorded`);

  if (result.last_chat_id && result.last_message_id) {
    const label = LABEL[action](escapeHtml(actor), result.snoozed_until);
    await editTelegramReplyMarkup(result.last_chat_id, result.last_message_id, statusKeyboard(label));
  }

  return NextResponse.json({ ok: true });
}
