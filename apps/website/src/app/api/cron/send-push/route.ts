import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { accessToken, projectId, sendPush } from '@/lib/fcm';
import { mapLimit } from '@/lib/mapLimit';

// Drains the `notifications` queue to FCM. Meant to be hit on a schedule, the
// same way /api/cron/expire-bookings is.
//
// Scheduling (pick one):
//   • An external uptime cron (e.g. cron-job.org) calling this URL every minute
//     with header `Authorization: Bearer <CRON_SECRET>`.
//   • pg_cron in Supabase, via the http extension.
//   • Vercel Cron — Pro only; Hobby caps cron at once a day.
//
// Env: CRON_SECRET (shared with the other cron route), SUPABASE_SERVICE_ROLE_KEY,
// FIREBASE_SERVICE_ACCOUNT, and OPS_WEBHOOK_URL for the ADMIN-role rows (see
// pageOps below) — without it nothing reaches ops except the /admin/ops badge.

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
}

// Header values are latin-1 only, and a booking title is otherwise free text.
const asciiOnly = (s: string) => s.replace(/[^\x20-\x7E]/g, '').slice(0, 200);

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

  const { data: rows, error: readErr } = await supabase
    .from('notifications')
    .select('id, event, title, body, booking_id, patient_id, recipient_user_id, recipient_role')
    .eq('status', 'QUEUED')
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS);

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ sent: 0, failed: 0, skipped: 0, ranAt: new Date().toISOString() });

  const all = rows as QueuedRow[];

  // Rows addressed to ops, not to a person: "a new request needs a companion".
  // These used to fall into the resolve-to-the-booking-owner branch below, which
  // pushed an internal dispatch instruction to the customer and left ops — the
  // only party who can act on it — never told at all.
  const opsRows = all.filter((r) => r.recipient_role === 'ADMIN' && !r.recipient_user_id);
  const opsWebhook = process.env.OPS_WEBHOOK_URL;
  const opsOutcomes = opsWebhook && opsRows.length ? await pageOps(opsRows, opsWebhook) : [];
  // With no webhook configured they stay QUEUED on purpose: /admin/ops counts
  // them, and that badge is the only ops signal left.
  // Idempotent: only transition QUEUED → SENT/FAILED. If two cron ticks race,
  // the second's update touches 0 rows and won't overwrite the first.
  for (const o of opsOutcomes) {
    await supabase
      .from('notifications')
      .update({ status: o.status, error: o.error, sent_at: o.status === 'SENT' ? new Date().toISOString() : null })
      .eq('id', o.id)
      .eq('status', 'QUEUED');
  }

  const queued = all.filter((r) => !opsRows.includes(r));
  if (!queued.length) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0, ops: opsRows.length, ranAt: new Date().toISOString() });
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
      .eq('status', 'QUEUED');
  }

  const deliverable = queued.filter((r) => r.recipient_user_id);
  if (!deliverable.length) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: undeliverable.length, ops: opsRows.length, ranAt: new Date().toISOString() });
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
    // Leave everything QUEUED — this is a configuration problem, not a per-row
    // one, and the next run should retry the lot.
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

  // QUEUED → SENT/FAILED/SKIPPED transitions are idempotent and no-double-send:
  // each final update is guarded by .eq('status','QUEUED'), so a concurrent tick
  // that already claimed the row will cause this update to affect 0 rows.
  // True double-send prevention (claim-before-send) would need a SENDING state
  // or SELECT FOR UPDATE SKIP LOCKED; documented as residual risk in report.
  const now = new Date().toISOString();
  for (const o of outcomes) {
    if (o.status === 'SENT') sent++;
    else if (o.status === 'FAILED') failed++;
    else noDevice++;

    await supabase
      .from('notifications')
      .update({ status: o.status, error: o.error, sent_at: o.status === 'SENT' ? now : null })
      .eq('id', o.id)
      .eq('status', 'QUEUED');
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
    ranAt: now,
  });
}
