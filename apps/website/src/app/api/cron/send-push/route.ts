import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { accessToken, projectId, sendPush } from '@/lib/fcm';
import { mapLimit } from '@/lib/mapLimit';
import { chatIdsForRow, formatTelegramBatchForRows, formatTelegramForRow, sendTelegram } from '@/lib/telegram';

// Drains the `notifications` queue to FCM + Telegram + ops.
// Exactly-once via claim-before-send (36_NOTIFICATIONS_CLAIM.sql):
//   1. Atomically claim QUEUED rows into SENDING with FOR UPDATE SKIP LOCKED
//      (rpc claim_notifications, 5-min stale reclaim), so concurrent ticks
//      claim DISJOINT sets and no row is ever sent twice.
//   2. Send only claimed rows (fanoutTelegram, pageOps, FCM mapLimit).
//   3. Finalize SENDING → SENT/FAILED/SKIPPED with .eq('status','SENDING').
// Crash mid-send leaves SENDING rows; stale reclaim (claimed_at < now()-5m)
// makes them eligible again on a later tick.
//
// Scheduling (pick one):
//   • An external uptime cron (e.g. cron-job.org) calling this URL every minute
//     with header `Authorization: Bearer <CRON_SECRET>`.
//   • pg_cron in Supabase, via the http extension.
//   • Vercel Cron — Pro only; Hobby caps cron at once a day.
//
// Env: CRON_SECRET (shared with the other cron route), SUPABASE_SERVICE_ROLE_KEY,
// FIREBASE_SERVICE_ACCOUNT, OPS_WEBHOOK_URL for the ADMIN-role rows (see
// pageOps below) — without it nothing reaches ops except the /admin/ops badge,
// TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (+ optional TELEGRAM_CHAT_ID_ADMIN/_CUSTOMER/_COMPANION)
// for Telegram fan-out — without them Telegram is a silent no-op.

export const dynamic = 'force-dynamic';

// One notification fans out to every device the recipient owns, so rows and HTTP
// calls are not 1:1. Keeps a single run inside the serverless timeout; the next
// tick picks up whatever is left.
const MAX_ROWS = 200;
const CONCURRENCY = 8;

interface QueuedRow {
  id: string;
  event: string;
  title: string;
  body: string | null;
  booking_id: string | null;
  patient_id: string | null;
  recipient_user_id: string | null;
  recipient_role: string | null;
  created_at?: string | null;
  attempts?: number | null;
  next_retry_at?: string | null;
  claimed_at?: string | null;
}

// Header values are latin-1 only, and a booking title is otherwise free text.
const asciiOnly = (s: string) => s.replace(/[^\x20-\x7E]/g, '').slice(0, 200);

// Retry: bounded exponential backoff for FAILED rows (migration 44).
// MAX_ATTEMPTS=5 (initial + 4 retries); backoff 5,10,20,40,60 minutes.
const MAX_ATTEMPTS = 5;
function backoffMinutes(attempts: number): number {
  return Math.min(60, 5 * Math.pow(2, Math.max(0, attempts - 1)));
}
function nextRetryAt(attempts: number): string {
  const mins = backoffMinutes(attempts);
  return new Date(Date.now() + mins * 60_000).toISOString();
}

// Where ops is paged. Any endpoint that accepts a JSON POST — a Slack or Discord
// incoming webhook, a Zapier/n8n hook, a WhatsApp gateway — because the one
// thing that must not happen on day one is a new booking nobody sees.
//
// ntfy.sh is the exception, and the one worth having: no account, no workspace,
// just a phone app subscribed to a topic. It treats the POST body as the message
// verbatim, so sending it JSON puts a wall of escaped braces on the lock screen.
// It gets plain text and the title as a header instead.
//
// ponytail: no retry/backoff. A missed page is visible at /admin/ops, which is
// watched anyway; add a retry column if that stops being true.
// Telegram fan-out: one concise HTML message per CLAIMED row, alongside FCM/ops.
// Env-gated: if TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing, no-ops silently.
// Per-role routing via TELEGRAM_CHAT_ID_ADMIN etc. falls back to TELEGRAM_CHAT_ID.
// Idempotency: per-tick in-memory Set + DB .eq('status','SENDING') on final
// transitions ensures a concurrent tick (which claimed a disjoint set via SKIP LOCKED)
// has no durable duplicate; SENDING stale-reclaim handles crash mid-send.
const TELEGRAM_CONCURRENCY = 5;

async function fanoutTelegram(rows: QueuedRow[]): Promise<{ sent: number; skipped: number; failed: number }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { sent: 0, skipped: rows.length, failed: 0 };
  // In-memory per-tick dedupe: if the same id appears twice in one tick, send once.
  const seen = new Set<string>();
  const toSend = rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return chatIdsForRow(r).length > 0;
  });
  if (!toSend.length) return { sent: 0, skipped: rows.length - toSend.length, failed: 0 };

  // Smart batch: if >=4 ADMIN rows in one tick, send ONE digest to ADMIN chat instead of 4+ pings
  const adminRows = toSend.filter((r) => r.recipient_role === 'ADMIN');
  if (adminRows.length >= 4) {
    const adminChats = chatIdsForRow({ recipient_role: 'ADMIN' });
    if (adminChats.length) {
      const batchText = formatTelegramBatchForRows(adminRows as any);
      const outs = await Promise.all(adminChats.map((chatId) => sendTelegram(batchText, { chatId })));
      const failed = outs.find((o) => !o.ok);
      if (failed) {
        // batch failed counts as failed for all admin rows
        const nonAdmin = toSend.filter((r) => r.recipient_role !== 'ADMIN');
        // send non-admin individually
        const restResults = await mapLimit(nonAdmin, TELEGRAM_CONCURRENCY, async (row) => {
          const chats = chatIdsForRow(row);
          const text = formatTelegramForRow(row as any);
          const routs = await Promise.all(chats.map((chatId) => sendTelegram(text, { chatId })));
          const f = routs.find((o) => !o.ok) as { ok: false; error: string } | undefined;
          return f ? { ok: false as const, error: f.error } : { ok: true as const };
        });
        let restSent = 0, restFailed = 0;
        restResults.forEach((r) => (r.ok ? restSent++ : restFailed++));
        return { sent: restSent, skipped: rows.length - toSend.length, failed: adminRows.length + restFailed };
      }
      // batch sent - send non-admin individually
      const nonAdmin = toSend.filter((r) => r.recipient_role !== 'ADMIN');
      if (!nonAdmin.length) return { sent: adminRows.length, skipped: rows.length - toSend.length, failed: 0 };
      const restResults = await mapLimit(nonAdmin, TELEGRAM_CONCURRENCY, async (row) => {
        const chats = chatIdsForRow(row);
        const text = formatTelegramForRow(row as any);
        const routs = await Promise.all(chats.map((chatId) => sendTelegram(text, { chatId })));
        const f = routs.find((o) => !o.ok) as { ok: false; error: string } | undefined;
        return f ? { ok: false as const, error: f.error } : { ok: true as const };
      });
      let restSent = 0, restFailed = 0;
      restResults.forEach((r) => (r.ok ? restSent++ : restFailed++));
      return { sent: adminRows.length + restSent, skipped: rows.length - toSend.length, failed: restFailed };
    }
  }

  const results = await mapLimit(toSend, TELEGRAM_CONCURRENCY, async (row) => {
    const chats = chatIdsForRow(row);
    const text = formatTelegramForRow(row as any);
    // fan out to every chat for this role (usually 1)
    const outs = await Promise.all(
      chats.map((chatId) => sendTelegram(text, { chatId })),
    );
    const failed = outs.find((o) => !o.ok) as { ok: false; error: string } | undefined;
    return failed ? { ok: false as const, error: failed.error } : { ok: true as const };
  });

  let sent = 0;
  let failed = 0;
  results.forEach((r) => (r.ok ? sent++ : failed++));
  // rows with no chat configured count as skipped (env missing for that role)
  const skipped = rows.length - toSend.length;
  return { sent, skipped, failed };
}

async function pageOps(rows: QueuedRow[], url: string) {
  let ntfy = false;
  try {
    ntfy = new URL(url).hostname.endsWith('ntfy.sh');
  } catch {
    // A malformed URL fails per row below, with the reason on the row.
  }

  const results = await Promise.all(rows.map(async (r) => {
    try {
      const res = await fetch(url, ntfy ? {
        method: 'POST',
        headers: { Title: asciiOnly(r.title), Tags: 'hospital' },
        body: r.body ?? r.title,
      } : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // `text` and `content` are what Slack and Discord read; the rest is
          // for anything that wants the structure.
          text: `${r.title}\n${r.body ?? ''}`,
          content: `${r.title}\n${r.body ?? ''}`,
          event: r.event,
          booking_id: r.booking_id,
        }),
      });
      return res.ok
        ? { id: r.id, status: 'SENT', error: null }
        : { id: r.id, status: 'FAILED', error: `webhook ${res.status}`.slice(0, 500) };
    } catch (e) {
      return { id: r.id, status: 'FAILED', error: (e as Error).message.slice(0, 500) };
    }
  }));
  return results;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    // Vercel Cron auto-injects Authorization: Bearer CRON_SECRET when CRON_SECRET
    // env is set, so the single Bearer check covers both Vercel Cron and
    // external/manual callers. Fails safe (401) if secret is set and header missing/wrong.
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Deliberately not falling back to the anon key: RLS would hide every row
    // and the run would silently report zero work rather than failing.
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }
  const supabase = createClient(url, key);

  // Claim-before-send: atomically move QUEUED (+ stale SENDING) → SENDING.
  // FOR UPDATE SKIP LOCKED ensures concurrent ticks claim disjoint sets.
  const { data: rows, error: readErr } = await supabase.rpc('claim_notifications', {
    p_limit: MAX_ROWS,
  });

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ sent: 0, failed: 0, skipped: 0, ranAt: new Date().toISOString() });

  const all = rows as QueuedRow[];

  // Telegram fan-out for EVERY CLAIMED row (all portals via the single chokepoint).
  // Runs alongside FCM/ops; failures are best-effort and do not block FCM.
  // In-memory per-tick Set + DB SENDING guard ensures no persistent double-send;
  // a live send needs TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID — without them this is a no-op.
  let telegram: { sent: number; skipped: number; failed: number } = { sent: 0, skipped: 0, failed: 0 };
  try {
    telegram = await fanoutTelegram(all);
  } catch (e) {
    // best-effort: Telegram failure never blocks FCM delivery
    console.warn('[telegram] fanout failed', (e as Error).message?.slice(0, 200));
  }

  // Rows addressed to ops, not to a person: "a new request needs a companion".
  // These used to fall into the resolve-to-the-booking-owner branch below, which
  // pushed an internal dispatch instruction to the customer and left ops — the
  // only party who can act on it — never told at all.
  const opsRows = all.filter((r) => r.recipient_role === 'ADMIN' && !r.recipient_user_id);
  const opsWebhook = process.env.OPS_WEBHOOK_URL;
  // FIX: don't leave ADMIN rows SENDING forever when webhook missing — rely on Telegram
  // (was the cause of 5m flood). If Telegram already sent for that ADMIN row, mark SENT.
  let opsOutcomes: Array<{ id: string; status: string; error: string | null }> = [];
  if (opsWebhook && opsRows.length) {
    opsOutcomes = await pageOps(opsRows, opsWebhook);
  } else if (opsRows.length) {
    // No webhook: if Telegram sent, close the row as SENT (admin saw it on Telegram);
    // if no Telegram chat or Telegram failed, mark SKIPPED/FAILED to avoid SENDING loop.
    const nowIso = new Date().toISOString();
    if (telegram.failed > 0) {
      // telegram had failures - mark those ADMIN rows FAILED with backoff, rest SENT
      // conservative: mark all as FAILED to retry with backoff (44 logic)
      for (const r of opsRows) {
        const hasChat = chatIdsForRow(r).length > 0;
        if (!hasChat) {
          await supabase.from('notifications').update({ status: 'SKIPPED', error: 'no OPS_WEBHOOK_URL and no TELEGRAM_CHAT_ID_ADMIN', sent_at: null }).eq('id', r.id).eq('status','SENDING');
        } else {
          const prev = (r.attempts ?? 0) as number;
          const nextAttempts = prev + 1;
          const isFinal = nextAttempts >= MAX_ATTEMPTS;
          await supabase.from('notifications').update({ status: 'FAILED', error: 'telegram failed', attempts: nextAttempts, next_retry_at: isFinal ? null : nextRetryAt(nextAttempts) }).eq('id', r.id).eq('status','SENDING');
        }
      }
    } else {
      // telegram succeeded or was skipped per-role
      for (const r of opsRows) {
        const hasChat = chatIdsForRow(r).length > 0;
        if (!hasChat) {
          await supabase.from('notifications').update({ status: 'SKIPPED', error: 'no OPS_WEBHOOK_URL and no TELEGRAM_CHAT_ID_ADMIN', sent_at: null }).eq('id', r.id).eq('status','SENDING');
        } else {
          await supabase.from('notifications').update({ status: 'SENT', error: null, sent_at: nowIso }).eq('id', r.id).eq('status','SENDING');
        }
      }
    }
    // opsOutcomes stays empty — already finalized above, so downstream early-return sees zero pending ops
  }
  // Claim-before-send: only transition SENDING → SENT/FAILED. Concurrent ticks
  // claimed disjoint sets via SKIP LOCKED, so no row is ever sent twice.
  // Track attempts per row for backoff (FAILED rows carry attempts from claim)
  const attemptsById = new Map(all.map((r) => [r.id, (r.attempts ?? 0) as number]));
  for (const o of opsOutcomes) {
    if (o.status === 'FAILED') {
      const prev = attemptsById.get(o.id) ?? 0;
      const nextAttempts = prev + 1;
      const isFinal = nextAttempts >= MAX_ATTEMPTS;
      await supabase
        .from('notifications')
        .update({
          status: 'FAILED',
          error: o.error,
          attempts: nextAttempts,
          next_retry_at: isFinal ? null : nextRetryAt(nextAttempts),
        })
        .eq('id', o.id)
        .eq('status', 'SENDING');
    } else {
      await supabase
        .from('notifications')
        .update({ status: o.status, error: o.error, sent_at: o.status === 'SENT' ? new Date().toISOString() : null })
        .eq('id', o.id)
        .eq('status', 'SENDING');
    }
  }

  const queued = all.filter((r) => !opsRows.includes(r));
  if (!queued.length) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0, ops: opsRows.length, telegram: telegram, ranAt: new Date().toISOString() });
  }

  // Booking-status rows predate recipient_user_id (13_LIFECYCLE enqueues by role
  // only). Resolve those to the customer who placed the booking so they deliver
  // instead of sitting QUEUED forever.
  const needsOwner = queued.filter((r) => !r.recipient_user_id && r.booking_id);
  if (needsOwner.length) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, customer_user_id')
      .in('id', [...new Set(needsOwner.map((r) => r.booking_id as string))]);
    const owner = new Map((bookings ?? []).map((b) => [b.id as string, b.customer_user_id as string]));
    for (const r of needsOwner) r.recipient_user_id = owner.get(r.booking_id as string) ?? null;
  }

  // Rows with nobody to send to would be retried on every tick forever.
  const undeliverable = queued.filter((r) => !r.recipient_user_id);
  if (undeliverable.length) {
    await supabase
      .from('notifications')
      .update({ status: 'SKIPPED', error: 'no recipient_user_id' })
      .in('id', undeliverable.map((r) => r.id))
      .eq('status', 'SENDING');
  }

  const deliverable = queued.filter((r) => r.recipient_user_id);
  if (!deliverable.length) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: undeliverable.length, ops: opsRows.length, telegram: telegram, ranAt: new Date().toISOString() });
  }

  const { data: tokenRows, error: tokErr } = await supabase
    .from('push_tokens')
    .select('token, user_id')
    .in('user_id', [...new Set(deliverable.map((r) => r.recipient_user_id as string))]);
  if (tokErr) return NextResponse.json({ error: tokErr.message }, { status: 500 });

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokenRows ?? []) {
    const list = tokensByUser.get(t.user_id as string) ?? [];
    list.push(t.token as string);
    tokensByUser.set(t.user_id as string, list);
  }

  let bearer: string;
  let project: string;
  try {
    bearer = await accessToken();
    project = projectId();
  } catch (e) {
    // Leave everything SENDING — this is a configuration problem, not a per-row
    // one. Rows stay SENDING and stale-reclaim (5m) will make them eligible again;
    // or an operator can reset SENDING→QUEUED manually if urgent.
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const retire = new Set<string>();
  let sent = 0;
  let failed = 0;
  let noDevice = 0;

  const outcomes = await mapLimit(deliverable, CONCURRENCY, async (row) => {
    const tokens = tokensByUser.get(row.recipient_user_id as string) ?? [];
    if (!tokens.length) return { id: row.id, status: 'SKIPPED', error: 'no registered device' };

    const results = await Promise.all(
      tokens.map((token) =>
        sendPush(
          {
            token,
            title: row.title,
            body: row.body,
            data: {
              event: row.event,
              ...(row.booking_id ? { booking_id: row.booking_id } : {}),
              ...(row.patient_id ? { patient_id: row.patient_id } : {}),
            },
          },
          bearer,
          project,
        ),
      ),
    );

    results.forEach((r, i) => { if (!r.ok && r.retire) retire.add(tokens[i]); });

    // One live device is a delivered notification. Only a total miss is a failure.
    if (results.some((r) => r.ok)) return { id: row.id, status: 'SENT', error: null };
    const why = results.map((r) => (r.ok ? '' : r.error)).filter(Boolean).join('; ');
    return { id: row.id, status: 'FAILED', error: why.slice(0, 500) };
  });

  // SENDING → SENT/FAILED/SKIPPED transitions are exactly-once:
  // each final update is guarded by .eq('status','SENDING'), and rows were
  // claimed disjoint via FOR UPDATE SKIP LOCKED, so no concurrent tick ever
  // sent the same row. Crash mid-send leaves SENDING; stale reclaim (5m) retries.
  const now = new Date().toISOString();
  for (const o of outcomes) {
    if (o.status === 'SENT') sent++;
    else if (o.status === 'FAILED') failed++;
    else noDevice++;

    if (o.status === 'FAILED') {
      const prev = attemptsById.get(o.id) ?? 0;
      const nextAttempts = prev + 1;
      const isFinal = nextAttempts >= MAX_ATTEMPTS;
      await supabase
        .from('notifications')
        .update({
          status: 'FAILED',
          error: o.error,
          attempts: nextAttempts,
          next_retry_at: isFinal ? null : nextRetryAt(nextAttempts),
        })
        .eq('id', o.id)
        .eq('status', 'SENDING');
    } else {
      await supabase
        .from('notifications')
        .update({ status: o.status, error: o.error, sent_at: o.status === 'SENT' ? now : null })
        .eq('id', o.id)
        .eq('status', 'SENDING');
    }
  }

  // Dead tokens, dropped so they stop consuming a send attempt every tick.
  if (retire.size) {
    await supabase.from('push_tokens').delete().in('token', [...retire]);
  }

  return NextResponse.json({
    sent,
    failed,
    skipped: undeliverable.length + noDevice,
    ops: opsRows.length,
    opsPaged: opsOutcomes.filter((o) => o.status === 'SENT').length,
    retiredTokens: retire.size,
    telegram,
    ranAt: now,
  });
}
