import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { accessToken, projectId, sendPush } from '@/lib/fcm';
import { mapLimit } from '@/lib/mapLimit';
import { actionKeyboard, alertEngineering, chatIdsForRow, escapeHtml, formatTelegramBatchForRows, formatTelegramForRow, sendTelegram } from '@/lib/telegram';
import { classify, dedupeKeyFor } from '@/lib/notificationPolicy';

// notification_digest_buckets and its RPC aren't in the generated DB types
// yet (no Database generic is threaded through this route at all — every
// existing .from()/.rpc() call here relies on the same untyped default).
type SupabaseAdmin = SupabaseClient;

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
// TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (+ optional TELEGRAM_CHAT_ID_ADMIN/_CUSTOMER/_COMPANION/_ENGINEERING)
// for Telegram fan-out — without them Telegram is a silent no-op.
// NOTIFICATION_DIGEST_WINDOW_MINUTES (default 5) sets how long INFORMATIONAL
// events (notificationPolicy.ts) sit in notification_digest_buckets before
// they flush as one summary — see flushDueDigestBuckets below.
// CRITICAL/IMPORTANT sends are gated per-entity through notification_attention
// (50_NOTIFICATION_ATTENTION.sql) — repeats of the same status inside cooldown
// are suppressed, not resent; see fanoutTelegram/escalateStuckBookings below.
// Admin Ack/Snooze/Escalate/Resolve buttons post back to /api/telegram/webhook.

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
  telegram_sent_at?: string | null;
}

interface AttentionDecision {
  should_send: boolean;
  attention_id: string;
  tier: number;
  notify_count: number;
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
// Telegram fan-out: priority-routed via notificationPolicy.classify(). CRITICAL/
// IMPORTANT rows send individually, same as before; INFORMATIONAL rows append to
// a digest bucket instead (notification_digest_buckets, flushed by
// flushDueDigestBuckets on its own schedule) — no individual send.
// Env-gated: if TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing, no-ops silently.
// Per-role routing via TELEGRAM_CHAT_ID_ADMIN etc. falls back to TELEGRAM_CHAT_ID.
// Idempotency: per-tick in-memory Set + DB .eq('status','SENDING') on final
// transitions ensures a concurrent tick (which claimed a disjoint set via SKIP LOCKED)
// has no durable duplicate; SENDING stale-reclaim handles crash mid-send. Buffering
// a row never touches notifications.status, so it can't interact with that reclaim.
//
// Attention gate (50_NOTIFICATION_ATTENTION.sql): a row's OWN channel status
// (telegram_sent_at) stops the FCM/ops retry-reclaim from re-driving Telegram
// once Telegram already delivered — that reclaim loop was the actual cause of
// "still pending" repeating every 5-60 min. resolve_notification_attention()
// then decides, per entity (booking/patient), whether this send is real news
// (status changed, tier crossed, or cooldown elapsed) or a repeat to suppress.
// Attention checks run sequentially (not mapLimit) — row volume here is small
// and two rows for the same entity in one tick must not race the same key.
const TELEGRAM_CONCURRENCY = 5;

async function fanoutTelegram(rows: QueuedRow[], supabase: SupabaseAdmin): Promise<{ sent: number; skipped: number; failed: number; buffered: number; suppressed: number }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { sent: 0, skipped: rows.length, failed: 0, buffered: 0, suppressed: 0 };
  // In-memory per-tick dedupe: if the same id appears twice in one tick, send once.
  const seen = new Set<string>();
  const toSend = rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return chatIdsForRow(r).length > 0;
  });
  if (!toSend.length) return { sent: 0, skipped: rows.length - toSend.length, failed: 0, buffered: 0, suppressed: 0 };

  const immediate: QueuedRow[] = [];
  const buffered: QueuedRow[] = [];
  for (const row of toSend) {
    if (classify(row.event, row.recipient_role).mode === 'BUFFERED') buffered.push(row);
    else immediate.push(row);
  }

  // Buffered rows: append to their aggregation bucket now, send nothing —
  // flushDueDigestBuckets renders and sends the digest once its window elapses.
  if (buffered.length) {
    const byKey = new Map<string, { role: string | null; ids: string[] }>();
    for (const row of buffered) {
      const policy = classify(row.event, row.recipient_role);
      const key = policy.aggregationKey as string;
      const bucket = byKey.get(key) ?? { role: row.recipient_role, ids: [] };
      bucket.ids.push(row.id);
      byKey.set(key, bucket);
    }
    await Promise.all(
      [...byKey.entries()].map(([key, { role, ids }]) =>
        supabase.rpc('append_to_digest_bucket', { p_key: key, p_role: role, p_ids: ids }),
      ),
    );
  }

  let suppressed = 0;
  const gated: Array<{ row: QueuedRow; attentionId: string }> = [];
  for (const row of immediate) {
    if (row.telegram_sent_at) { suppressed++; continue; } // already delivered; don't let an FCM/ops retry resend it
    const { key, entityType } = dedupeKeyFor(row);
    const { priority } = classify(row.event, row.recipient_role);
    const { data, error } = await supabase.rpc('resolve_notification_attention', {
      p_dedupe_key: key,
      p_entity_type: entityType,
      p_status: row.event,
      p_priority: priority,
    });
    if (error) { gated.push({ row, attentionId: '' }); continue; } // attention RPC down: fail open, never silently drop
    const decision = (Array.isArray(data) ? data[0] : data) as AttentionDecision | undefined;
    if (!decision?.should_send) { suppressed++; continue; }
    gated.push({ row, attentionId: decision.attention_id });
  }

  const results = await mapLimit(gated, TELEGRAM_CONCURRENCY, async ({ row, attentionId }) => {
    const chats = chatIdsForRow(row);
    const { priority } = classify(row.event, row.recipient_role);
    const text = formatTelegramForRow(row as any, priority);
    const replyMarkup = attentionId ? actionKeyboard(attentionId) : undefined;
    // fan out to every chat for this role (usually 1)
    const outs = await Promise.all(
      chats.map((chatId) => sendTelegram(text, { chatId, replyMarkup })),
    );
    const first = outs.find((o) => o.ok) as { ok: true; messageId?: number } | undefined;
    const failed = outs.find((o) => !o.ok) as { ok: false; error: string } | undefined;
    if (first) {
      await supabase.from('notifications').update({
        telegram_sent_at: new Date().toISOString(),
        telegram_message_id: first.messageId ?? null,
        telegram_chat_id: chats[0] ?? null,
      }).eq('id', row.id);
      if (attentionId) {
        await supabase.from('notification_attention').update({
          last_message_id: first.messageId ?? null,
          last_chat_id: chats[0] ?? null,
        }).eq('id', attentionId);
      }
    }
    return failed ? { ok: false as const, error: failed.error } : { ok: true as const };
  });

  let sent = 0;
  let failed = 0;
  results.forEach((r) => (r.ok ? sent++ : failed++));
  // rows with no chat configured count as skipped (env missing for that role)
  const skipped = rows.length - toSend.length;
  return { sent, skipped, failed, buffered: buffered.length, suppressed };
}

// Time-based escalation for bookings stuck PENDING — reuses bookings.expires_at
// (already set per booking_type by 13_LIFECYCLE) instead of a new threshold:
// tier 1 at 50% of the booking's own expiry window elapsed, tier 2 at 80%.
// Goes through the same resolve_notification_attention() gate as event-driven
// sends, so a tier only pings once, not every tick it stays crossed.
// ponytail: two fixed fractions, not a config table — the event set here is
// one query, not 9 SQL triggers like notificationPolicy; add a setting if that changes.
async function escalateStuckBookings(supabase: SupabaseAdmin): Promise<{ escalated: number }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { escalated: 0 };
  const { data: stuck } = await supabase.rpc('stuck_pending_bookings');
  if (!stuck?.length) return { escalated: 0 };

  let escalated = 0;
  for (const b of stuck as Array<{ booking_id: string; reference_code: string | null; service_type: string | null; expires_at: string; elapsed_fraction: number }>) {
    const fraction = Number(b.elapsed_fraction) || 0;
    const tier = fraction >= 0.8 ? 2 : fraction >= 0.5 ? 1 : 0;
    if (tier === 0) continue;

    const priority = tier >= 2 ? 'CRITICAL' : 'IMPORTANT';
    const { data, error } = await supabase.rpc('resolve_notification_attention', {
      p_dedupe_key: `booking:${b.booking_id}`,
      p_entity_type: 'BOOKING',
      p_status: `STUCK_TIER_${tier}`,
      p_priority: priority,
      p_forced_tier: tier,
    });
    if (error) continue;
    const decision = (Array.isArray(data) ? data[0] : data) as AttentionDecision | undefined;
    if (!decision?.should_send) continue;

    const chats = chatIdsForRow({ recipient_role: 'ADMIN' });
    if (!chats.length) continue;

    const minsLeft = Math.max(0, Math.round((new Date(b.expires_at).getTime() - Date.now()) / 60_000));
    const ref = escapeHtml(b.reference_code ?? b.booking_id.slice(0, 8));
    const text = `${tier >= 2 ? '🚨' : '⏳'} <b>Still unassigned</b> — booking <code>${ref}</code>\n`
      + `${escapeHtml(b.service_type ?? '')} • expires in ~${minsLeft} min\n`
      + `<code>${escapeHtml(b.booking_id.slice(0, 8))}</code>`;
    const outs = await Promise.all(chats.map((chatId) => sendTelegram(text, { chatId, replyMarkup: actionKeyboard(decision.attention_id) })));
    const first = outs.find((o) => o.ok) as { ok: true; messageId?: number } | undefined;
    if (first) {
      await supabase.from('notification_attention').update({
        last_message_id: first.messageId ?? null,
        last_chat_id: chats[0] ?? null,
      }).eq('id', decision.attention_id);
      escalated++;
    }
  }
  return { escalated };
}

// Flushes any digest bucket whose aggregation window has elapsed into one
// Telegram summary message. Must run every tick regardless of whether this
// tick claimed any new rows — a quiet period still needs a bucket to flush
// on schedule. Never writes to notifications; those rows already finalized
// independently (FCM/ops) when they were buffered.
async function flushDueDigestBuckets(supabase: SupabaseAdmin, windowMinutes: number): Promise<{ flushed: number }> {
  const cutoff = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { data: buckets } = await supabase
    .from('notification_digest_buckets')
    .select('id, aggregation_key, recipient_role, notification_ids')
    .is('flushed_at', null)
    .lte('first_seen_at', cutoff);

  if (!buckets?.length) return { flushed: 0 };

  const closeBucket = (id: string) =>
    supabase.from('notification_digest_buckets').update({ flushed_at: new Date().toISOString() }).eq('id', id).is('flushed_at', null);

  let flushed = 0;
  for (const bucket of buckets) {
    const ids = (bucket.notification_ids as string[] | null) ?? [];
    const chats = chatIdsForRow({ recipient_role: bucket.recipient_role as string | null });
    if (!ids.length || !chats.length) {
      await closeBucket(bucket.id as string);
      continue;
    }
    const { data: digestRows } = await supabase
      .from('notifications')
      .select('id, event, title, booking_id, recipient_role, created_at')
      .in('id', ids);
    if (!digestRows?.length) {
      await closeBucket(bucket.id as string);
      continue;
    }
    const text = formatTelegramBatchForRows(digestRows as any, { windowMinutes });
    const outs = await Promise.all(chats.map((chatId) => sendTelegram(text, { chatId })));
    if (outs.every((o) => o.ok)) {
      await closeBucket(bucket.id as string);
      flushed++;
    }
    // Send failure: leave unflushed, retried next tick. Same tradeoff as
    // pageOps' no-retry-column note above — a non-critical channel doesn't
    // need a second backoff path.
  }
  return { flushed };
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

  // Flush any digest bucket whose window elapsed BEFORE the early-return below —
  // a tick with zero freshly-claimed rows must still deliver a due digest.
  const digestWindowMinutes = Number(process.env.NOTIFICATION_DIGEST_WINDOW_MINUTES) || 5;
  try {
    await flushDueDigestBuckets(supabase, digestWindowMinutes);
  } catch (e) {
    await alertEngineering(`send-push digest flush failed: ${(e as Error).message}`);
  }

  // Time-based escalation for stuck PENDING bookings — must also run on a
  // tick with zero freshly-claimed rows, same reasoning as the digest flush.
  try {
    await escalateStuckBookings(supabase);
  } catch (e) {
    await alertEngineering(`send-push stuck-booking escalation failed: ${(e as Error).message}`);
  }

  // Claim-before-send: atomically move QUEUED (+ stale SENDING) → SENDING.
  // FOR UPDATE SKIP LOCKED ensures concurrent ticks claim disjoint sets.
  const { data: rows, error: readErr } = await supabase.rpc('claim_notifications', {
    p_limit: MAX_ROWS,
  });

  if (readErr) {
    await alertEngineering(`send-push claim_notifications failed: ${readErr.message}`);
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!rows?.length) return NextResponse.json({ sent: 0, failed: 0, skipped: 0, ranAt: new Date().toISOString() });

  const all = rows as QueuedRow[];

  // Telegram fan-out for EVERY CLAIMED row (all portals via the single chokepoint).
  // Runs alongside FCM/ops; failures are best-effort and do not block FCM.
  // In-memory per-tick Set + DB SENDING guard ensures no persistent double-send;
  // a live send needs TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID — without them this is a no-op.
  let telegram: { sent: number; skipped: number; failed: number; buffered: number; suppressed: number } = { sent: 0, skipped: 0, failed: 0, buffered: 0, suppressed: 0 };
  try {
    telegram = await fanoutTelegram(all, supabase);
  } catch (e) {
    // best-effort: Telegram failure never blocks FCM delivery
    console.warn('[telegram] fanout failed', (e as Error).message?.slice(0, 200));
    await alertEngineering(`send-push telegram fanout failed: ${(e as Error).message}`);
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
  if (tokErr) {
    await alertEngineering(`send-push push_tokens fetch failed: ${tokErr.message}`);
    return NextResponse.json({ error: tokErr.message }, { status: 500 });
  }

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
    await alertEngineering(`send-push FCM config failed: ${(e as Error).message}`);
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
