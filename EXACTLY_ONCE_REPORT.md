# EXACTLY ONCE REPORT — CARESY-4 (claim-before-send)

**Branch:** `feature/notify-exactly-once` (off `origin/main@cfca9ff` — CARESY-3b merge)
**Worktree:** `/Users/1234/Desktop/Caresy phone/caresy_m3_worktree`
**Date:** 2026-08-20
**Commits on branch:** `36_NOTIFICATIONS_CLAIM.sql` + `route.ts` claim wiring (see git log)
**Prior reports:** `PUSH_PIPELINE_REPORT.md` (CARESY-1), `TELEGRAM_NOTIFICATIONS_REPORT.md` (+3b)

---

## Why — double-send risk before this

CARESY-1/3 left `route.ts` as `SELECT ... WHERE status='QUEUED' LIMIT 200` then
`UPDATE ... SET status='SENT' WHERE id=? AND status='QUEUED'`. Two concurrent
cron ticks could `SELECT` the same `QUEUED` rows before either `UPDATE`, so
FCM + Telegram + ops each fired twice while only one DB status update stuck.
Documented as CARESY-4 debt. Now closed.

---

## 1) Status column type — assumption flagged

`13_LIFECYCLE.sql:205-209` defines:
```sql
status TEXT NOT NULL DEFAULT 'QUEUED' -- QUEUED | SENT | FAILED
```
No `CHECK`, no enum — **free TEXT**. So `SENDING` needs **no** `ALTER TYPE`
or `CHECK` DDL. Migration asserts `data_type='text'` and bails with
`'if CHECK/enum, extend it to allow SENDING'` if the assumption ever breaks.
`24_PUSH_DELIVERY.sql` only adds `error TEXT` and an index; `20` adds
`sent_at`; neither constrains `status`. **Flag:** if a future migration ever
adds `CHECK (status IN (...))`, it must be extended to include `SENDING`.

---

## 2) Migration — `supabase/migrations/36_NOTIFICATIONS_CLAIM.sql` (90 lines)

**Authorized override** of earlier “prefer no migration” — this migration is the
claim primitive.

**DDL:**
- `ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ`
  — when the row entered `SENDING`. Nullable; existing `QUEUED` rows have NULL.
- `CREATE INDEX IF NOT EXISTS idx_notifications_sending_claimed ON public.notifications(claimed_at) WHERE status='SENDING'`
  — helps the stale `claimed_at < now()-'5 minutes'` filter.

**RPC `claim_notifications(p_limit INT) RETURNS SETOF public.notifications`:**
```sql
SECURITY DEFINER SET search_path=public
UPDATE public.notifications
   SET status='SENDING', claimed_at=now()
 WHERE id IN (
   SELECT id FROM public.notifications
    WHERE status='QUEUED'
       OR (status='SENDING' AND claimed_at < now() - interval '5 minutes')
    ORDER BY created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
 )
RETURNING *;
```
- `FOR UPDATE SKIP LOCKED` — locks selected rows, skips already-locked rows,
  so concurrent callers claim **disjoint sets** (Postgres guarantee).
- `OR stale SENDING` — rows that crashed mid-send (claimed but never
  finalized to `SENT/FAILED/SKIPPED`) become re-eligible after 5 min.
- `p_limit` null/≤0 defaults to 200 (matches `MAX_ROWS`).
- `GRANT EXECUTE ... TO authenticated, service_role, anon` — cron uses
  `service_role` via Supabase JS `rpc()`.
- Sanity `DO` asserts: `claimed_at` column exists, `claim_notifications` exists,
  `status` is `text`.

Human must apply: `psql` / Supabase SQL editor → run `36_NOTIFICATIONS_CLAIM.sql`
(not auto-applied here).

---

## 3) Cron — `apps/website/src/app/api/cron/send-push/route.ts`

**Before (CARESY-3b):**
```ts
const { data: rows } = await supabase.from('notifications')
  .select('id,event,title,body,booking_id,patient_id,recipient_user_id,recipient_role,created_at')
  .eq('status','QUEUED').order('created_at').limit(MAX_ROWS);
...
.update({status:o.status}).eq('id',o.id).eq('status','QUEUED')  // ×3
```

**After (CARESY-4 claim-before-send):**
- `route.ts:1-16` header rewritten to describe 3-step lifecycle
  `QUEUED → claim → SENDING → SENT/FAILED/SKIPPED` with `FOR UPDATE SKIP LOCKED`
  and stale reclaim.
- `route.ts:43-68` Telegram header updated to `CLAIMED` + `SENDING` guard.
- `route.ts:159-161` **Claim point** — replaces the `SELECT` with atomic claim:
  ```ts
  const { data: rows, error: readErr } = await supabase.rpc('claim_notifications', { p_limit: MAX_ROWS });
  ```
  Rows arrive already `SENDING` with `claimed_at=now()`. `rows` may be stale
  reclaimed `SENDING` rows — same path, no special case.
- `route.ts:170` Telegram comment: “for EVERY CLAIMED row” (was QUEUED).
- `route.ts:195` `opsOutcomes` finalizer → `.eq('status','SENDING')` (was `QUEUED`)
- `route.ts:223` undeliverable `SKIPPED` → `.eq('status','SENDING')`
- `route.ts:306` `outcomes` (FCM) finalizer → `.eq('status','SENDING')`
- `route.ts:250` `accessToken` failure path now says “Leave everything SENDING
  — stale-reclaim (5m) will make them eligible again”.

Net: `fanoutTelegram(all)` + `pageOps(opsRows)` + `FCM mapLimit(deliverable)`
all run on **claimed `SENDING` rows**, not `QUEUED`. Per-tick in-memory `Set`
dedupe inside `fanoutTelegram` is kept (cheap, handles duplicate `id` in one
`all`).

**Lifecycle:**
```
QUEUED --claim_notifications()--> SENDING --fanout--> SENT / FAILED / SKIPPED
  ^                                 |  (crash before finalize)
  |                                 v
  '--- stale reclaim (< now()-5m) --'
```
Single-tick behavior is identical: claim grabs up to 200 oldest
`QUEUED` (ordered `created_at`), sends, finalizes. If only one tick runs,
`SENDING` is just an intermediate that was already idempotent.

---

## 4) Why concurrent ticks are now disjoint

1. Tick A `CALL claim_notifications(200)` does `SELECT ... FOR UPDATE SKIP LOCKED`
   — Postgres locks those 200 rows inside the `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED)`.
2. Tick B concurrently executes same `SELECT ... FOR UPDATE SKIP LOCKED` — rows
   locked by A are **skipped**, B locks the *next* 200 `QUEUED` rows (or
   stale `SENDING` rows >5 min).
3. Each tick `RETURNING *` its own `SENDING` set; their `all` arrays do not
   overlap, so `fanoutTelegram`/`FCM`/`pageOps` never send the same
   `notifications.id` twice.
4. Finalizers `UPDATE ... WHERE id=? AND status='SENDING'` only affect the
   caller’s own `SENDING` rows; the other tick’s rows are elsewhere.

Crash: tick claims → `SENDING` → crashes before `UPDATE` → row stays
`SENDING` with `claimed_at`. After 5 min, next `claim_notifications` sees
`status='SENDING' AND claimed_at < now()-5m` and reclaims it via `SKIP LOCKED`
(locked rows are not stale, so not double-claimed).

---

## 5) Stale-reclaim + failure semantics

- **Ops without webhook:** `opsRows` with no `OPS_WEBHOOK_URL` used to “stay
  QUEUED on purpose” for `/admin/ops` badge. Now they **stay `SENDING`**
  (claimed but no webhook to finalize to `SENT/FAILED`). After 5 min they are
  reclaimed and again stay `SENDING` until the webhook exists or an operator
  manually `UPDATE notifications SET status='QUEUED'` (or adds the webhook).
  Badge query should count `WHERE status IN ('QUEUED','SENDING')` — or just
  `WHERE status='SENDING'` if badge lags — document for operator.
- **Undeliverable `no recipient_user_id` → `SKIPPED`** — same as before, but
  now `SENDING→SKIPPED` with `SENDING` guard.
- **`no registered device` → `SKIPPED`** — same.
- **`accessToken` failure (FCM config) → stays `SENDING`** — stale reclaim
  will retry later (previously stayed `QUEUED`).
- **Telegram/FCM failure per row → `FAILED`** — `SENDING→FAILED`, terminal for
  now; re-queue would need explicit retry policy (not added).

If an operator needs immediate retry of stuck `SENDING` rows (not 5 min wait):
```sql
UPDATE notifications SET status='QUEUED', claimed_at=NULL WHERE status='SENDING';
```

---

## 6) Files changed

- `supabase/migrations/36_NOTIFICATIONS_CLAIM.sql` — **new** (90 lines)
- `apps/website/src/app/api/cron/send-push/route.ts` — claim header, `rpc('claim_notifications')` instead of `select … status='QUEUED'`, all three final guards `QUEUED→SENDING`, stale-reclaim comments

No Telegram/FCM content change, no mobile changes, no other tables, no
`expo/eas/vercel` deploy.

---

## 7) What needs prod (migration 36 apply)

Human applies migration 36 in Supabase SQL editor (or `supabase db push`),
then the existing cron route (deployed via Vercel) immediately uses the claim
path — no code deploy beyond the route is needed, but the route deploy must be
after the migration or `rpc('claim_notifications')` will 404 until the function
exists (fallback: cron returns `500` until migration is applied).

Env still `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (single chat, per god Q4).

---

## 8) Verification

- `tsc --noEmit -p apps/website/tsconfig.json` → **0**
- `tsc --noEmit -p apps/mobile-app/tsconfig.json` → **0**
- `36` syntax validated locally as PL/pgSQL (no live DB to `EXPLAIN` the
  `FOR UPDATE SKIP LOCKED` plan — human can `EXPLAIN` after apply).
- Route type-checks with `supabase.rpc('claim_notifications', {p_limit})`
  returning `notifications[]` (Supabase JS `rpc` generic is `any`, but the
  downstream `rows as QueuedRow[]` cast is unchanged).

---

## 9) Risks / follow-up

- `/admin/ops` badge query that counted `status='QUEUED'` should now count
  `IN ('QUEUED','SENDING')` or be updated to `='SENDING'` to surface claimed
  but webhook-missing rows (minor).
- 5-min stale window is a trade-off: too short → live `SENDING` row reclaimed
  while earlier tick still sending; too long → crash recovery slow. 5 min matches
  a serverless timeout + FCM `mapLimit` worst-case; tune via interval if needed.
