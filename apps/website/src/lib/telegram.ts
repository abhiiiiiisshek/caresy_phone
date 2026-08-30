/**
 * Telegram channel for Caresy notifications.
 *
 * Reuses the single chokepoint `notifications` — every QUEUED row that
 * the cron already drains is fanned out here alongside FCM/ops.
 *
 * Env (Vercel → website Settings → Environment Variables):
 *   TELEGRAM_BOT_TOKEN   Bot token from @BotFather (never hardcode, never NEXT_PUBLIC)
 *   TELEGRAM_CHAT_ID     Default chat/channel id (numeric or @channel). Single value or comma-separated.
 *   TELEGRAM_CHAT_ID_ADMIN / _CUSTOMER / _COMPANION  Optional per-role routing; falls back to TELEGRAM_CHAT_ID
 *
 * If TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing, this is a silent no-op
 * (mirrors the ops webhook path which stays QUEUED without a webhook).
 */

function envChatIds(role?: string | null): string[] {
  const fallback = (process.env.TELEGRAM_CHAT_ID ?? '').trim();
  const perRoleKey = role ? `TELEGRAM_CHAT_ID_${role.toUpperCase()}` : '';
  const perRole = perRoleKey ? (process.env[perRoleKey as keyof NodeJS.ProcessEnv] as string | undefined)?.trim() : '';
  const raw = perRole || fallback;
  if (!raw) return [];
  return raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

function botToken(): string | null {
  const t = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  return t || null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface TelegramOpts {
  chatId?: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  disablePreview?: boolean;
}

export async function sendTelegram(
  text: string,
  opts?: TelegramOpts,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = botToken();
  if (!token) return { ok: true }; // env missing → silent no-op

  const chatIds = opts?.chatId
    ? [opts.chatId]
    : []; // caller must supply or we resolve per-role elsewhere; if empty, no-op

  if (!chatIds.length) return { ok: true };

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: opts?.parseMode ?? 'HTML',
            disable_web_page_preview: opts?.disablePreview ?? true,
          }),
        });
        if (res.ok) return { ok: true as const };
        const body = await res.text().catch(() => '');
        return {
          ok: false as const,
          error: `telegram ${res.status} ${body.slice(0, 300)}`,
        };
      } catch (e) {
        return { ok: false as const, error: (e as Error).message.slice(0, 500) };
      }
    }),
  );

  const failed = results.find((r) => !r.ok) as { ok: false; error: string } | undefined;
  if (failed) return failed;
  return { ok: true };
}

/**
 * Build a concise HTML message for a single notifications row.
 * Keep it short for the Telegram preview — event, role, booking/trip, timestamp.
 */
export function formatTelegramForRow(row: {
  id: string;
  event: string;
  title: string;
  body?: string | null;
  booking_id?: string | null;
  patient_id?: string | null;
  recipient_role?: string | null;
  recipient_user_id?: string | null;
  created_at?: string | null;
}): string {
  const when = row.created_at ? new Date(row.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const role = row.recipient_role ? ` • ${escapeHtml(row.recipient_role)}` : '';
  const booking = row.booking_id ? `booking <code>${escapeHtml(row.booking_id.slice(0, 8))}</code>` : 'no booking';
  const patient = row.patient_id ? ` • patient <code>${escapeHtml(row.patient_id.slice(0, 8))}</code>` : '';
  const to = row.recipient_user_id ? ` → <code>${escapeHtml(row.recipient_user_id.slice(0, 8))}</code>` : '';
  const title = escapeHtml(row.title.slice(0, 200));
  const body = row.body ? escapeHtml(row.body.slice(0, 300)) : '';
  const event = escapeHtml(row.event);

  // Example:
  // <b>BOOKING_CREATED</b> • ADMIN → a1b2c3d4
  // Urgent request ABC123
  // A HOSPITAL_COMPANION request needs a companion.
  // booking a1b2c3d4 • 20 Aug 2026, 12:34 pm IST
  let msg = `<b>${event}</b>${role}${to}\n`;
  msg += `${title}\n`;
  if (body) msg += `${body}\n`;
  msg += `${booking}${patient} • ${escapeHtml(when)}\n`;
  msg += `<code>${escapeHtml(row.id.slice(0, 8))}</code>`;
  return msg;
}

/** Resolve chat ids for a row's role, with per-role override. */
export function chatIdsForRow(row: { recipient_role?: string | null }): string[] {
  return envChatIds(row.recipient_role);
}

/**
 * Batch summary for ADMIN flood control: if many ADMIN rows claimed in one
 * tick (e.g. 5 bookings in 1m), send ONE summary instead of 5 pings.
 */
export function formatTelegramBatchForRows(rows: Array<{
  id: string;
  event: string;
  title: string;
  booking_id?: string | null;
  recipient_role?: string | null;
  created_at?: string | null;
}>): string {
  const n = rows.length;
  const byEvent = rows.reduce<Record<string, number>>((m, r) => {
    m[r.event] = (m[r.event] || 0) + 1;
    return m;
  }, {});
  const events = Object.entries(byEvent).map(([e,c]) => `${escapeHtml(e)}×${c}`).join(', ');
  const samples = rows.slice(0, 3).map(r => r.booking_id ? `<code>${escapeHtml(r.booking_id.slice(0,8))}</code>` : `<code>${escapeHtml(r.id.slice(0,8))}</code>`).join(', ');
  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  let msg = `<b>ADMIN digest • ${n} updates</b> • ${events}\n`;
  msg += samples + (n > 3 ? ` +${n-3} more` : '') + ` • ${escapeHtml(when)}\n`;
  // include titles of first 3 for context
  for (const r of rows.slice(0, 3)) {
    msg += `• ${escapeHtml(r.title.slice(0, 100))}\n`;
  }
  return msg;
}
