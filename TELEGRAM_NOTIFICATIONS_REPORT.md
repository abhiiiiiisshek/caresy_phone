# TELEGRAM NOTIFICATIONS REPORT — CARESY-3

**Branch:** `feature/telegram-notify` (off `origin/main` @ `5437ba1`, the CARESY-1 merge)
**Worktree:** `/Users/1234/Desktop/Caresy phone/caresy_m3_worktree`
**Date:** 2026-08-20
**Commit:** see `git log --oneline -1` on branch

---

## 1) Event-surface audit — single chokepoint `notifications`

All portals write to the same table; `api/cron/send-push/route.ts` already drains it.
Audit covers triggers/RPCs that `INSERT INTO notifications` and portal actions that **do not**.

### Already enqueued (reuse, no code needed)

| # | Portal | User action / DB event | Enqueue path (file:line) | Event / Recipient |
|---|---|---|---|---|
| 1 | Customer — website `/booking` / mobile `app/booking` / `/quick-help` | **Booking INSERT** (new request) | `30_LAUNCH_FIXES.sql:197-217` `enqueue_new_booking_notification()` AFTER INSERT on `bookings` (when `status != 'DRAFT'`) | `BOOKING_CREATED` → `ADMIN` (ops dispatch). This is why `/admin/ops` and `OPS_WEBHOOK_URL` see new requests. |
| 2 | All portals (anyone who updates `bookings.status`) | **Booking status change** (PENDING→ACCEPTED→IN_PROGRESS→COMPLETED/CANCELLED/EXPIRED) | `13_LIFECYCLE.sql:225-241` `enqueue_booking_notification()` AFTER UPDATE on `bookings` when `NEW.status IS DISTINCT FROM OLD.status` | `STATUS_<STATUS>` → `CUSTOMER` (title `Booking <ref> is now <STATUS>`) |
| 3 | Customer — `/my-bookings` cancel | **Cancel RPC** | `31_CUSTOMER_ACTIONS.sql:28-67` `cancel_booking(p_booking)` → INSERTs | `BOOKING_CANCELLED` → `COMPANION` (if assigned, `recipient_user_id = companion`) **and** `ADMIN` |
| 4 | Customer — `/my-bookings` reschedule | **Reschedule RPC** | `31_CUSTOMER_ACTIONS.sql:90-139` `reschedule_booking(p_booking,p_start)` → INSERTs | `BOOKING_RESCHEDULED` → `COMPANION` (if assigned) **and** `ADMIN` |
| 5 | Care portal — `/care` / mobile care | **Care event INSERT** | `23_CARE.sql:236-259` `enqueue_care_event_notification()` AFTER INSERT on `care_events` → one row per circle member minus creator | `CARE_EVENT_<kind>` → `CUSTOMER` (`recipient_user_id` = `patients.customer_user_id` + `patient_members.user_id`), with `patient_id` + `booking_id` |

`13_LIFECYCLE` also creates `expire_stale_bookings()` (sweeps PENDING→EXPIRED), which then fires #2.

Delivery columns added incrementally: `23_CARE.sql` adds `patient_id` + `recipient_user_id`, `24_PUSH_DELIVERY.sql` adds `error`, `20_NOTIFICATION_DELIVERY.sql` adds `sent_at`; all `status` transitions (`QUEUED|SENT|FAILED`, plus `SKIPPED` used by the cron) are drained by the cron.

### Gaps — portal updates that do NOT enqueue a `notifications` row

| Portal | Update | Currently enqueues? | Verdict |
|---|---|---|---|
| Companion app — trips | **Trip status advances** `advance_trip_status(p_trip, p_next)` (`assigned`→`en_route_pickup`→`picked_up`→…→`completed`) | **No**. `16_TRIPS_AND_LIVE_TRACKING.sql:292-337` only `UPDATE trips`. No trigger enqueues. Live location is Realtime `broadcast` (`trip:<id>`), not DB. | **Gap — clearly in-scope for Telegram?** Companion moving toward pickup/hospital is a customer-visible event. A minimal `AFTER UPDATE OF status ON trips` trigger could enqueue `TRIP_<status>`→`CUSTOMER`. **Per BOUNDARIES ("prefer NO new DB migration") we did NOT add it** — flagged for god. If god confirms, add `enqueue_trip_status_notification()` + `idx_notifications`-style index. |
| Companion/ops | **Trip created** `start_trip_for_booking` / `ensure_trip_for_booking` (18_BOOKING_TRIP_LINK) | **No**. `INSERT INTO trips` via trigger/RPC, no notification. | Same as above — gap, same decision needed. Could piggyback on `BOOKING_ACCEPTED` (already enqueues) so not urgent. |
| Companion admin | **Companion approval** `companions.approval_status` change | **No** | Ambiguous — companion onboarding is ops-internal; Telegram spam vs. useful. **List, don't guess.** |
| Customer | **Patient/family creation** (`patients` INSERT), `patient_members` invite, `patient_documents` upload | **No** | Ambiguous — family-circle changes are not booking-visits; care events already cover clinical notes. Patient CRUD alone likely not Telegram-worthy. |
| Auth | **New signup / profile creation** (`profiles`, `auth.users`) | **No** | Ambiguous — high volume, PII. Probably not. |
| Admin/ops | **Manual booking edits other than status** (service_metadata, billing columns, companion reassignment without status change) | **No** (only status triggers enqueue) | Ambiguous — ops edits without status change would be silent today. If god wants every `UPDATE` audited, a broader trigger or RPC could enqueue, but risk noise. |
| Billing | **Payment/bill finalization** (`26_BILLING`) | **No** | Ambiguous — billing guard blocks direct writes; payment is post-visit cash/UPI, not a DB event yet. |
| Support | **WhatsApp/support messages** | No DB | Out of scope — not a DB portal update. |

**Action taken:** No new `INSERT INTO notifications` triggers/RPCs were added in this PR. The five enqueued paths above already cover every **customer/ops-critical** visit lifecycle event. The trip-status gap is the only clearly in-scope candidate; per "ask god — don't guess" and "prefer NO new DB migration" we report it and await confirmation. All ambiguous rows are listed above for god to triage.

---

## 2) Telegram channel — new lib

**File:** `apps/website/src/lib/telegram.ts` (new, 98 lines)

Exports:
- `sendTelegram(text, opts?: { chatId?, parseMode?, disablePreview? })` — POSTs `https://api.telegram.org/bot<token>/sendMessage` with `{ chat_id, text, parse_mode:'HTML', disable_web_page_preview:true }`. Reads `TELEGRAM_BOT_TOKEN` from env; missing token or empty `chatIds` → silent `{ok:true}` no-op (same as ops webhook path). Never hardcodes a token; never uses `NEXT_PUBLIC_*`.
- `chatIdsForRow(row)` — resolves `TELEGRAM_CHAT_ID_<ROLE>` (e.g. `TELEGRAM_CHAT_ID_ADMIN`) if set, else `TELEGRAM_CHAT_ID`. Supports comma/space-separated lists.
- `formatTelegramForRow(row)` — concise HTML: `<b>EVENT</b> • ROLE → uid8` / `Title` / `Body` / `booking abcd1234 • patient … • 20 Aug 2026, 12:34 pm IST` / `<code>notif-id8</code>`. Escapes HTML, truncates title 200/body 300.

No secrets in repo; `docs/.env.example` pattern (if present) would be `TELEGRAM_BOT_TOKEN=` placeholder — not committed here per no-prod-creds rule.

---

## 3) Wired fan-out — cron delivery path

**File:** `apps/website/src/app/api/cron/send-push/route.ts`

### Exact fan-out flow (line numbers at commit)

- `route.ts:1-5` Imports: added `chatIdsForRow, formatTelegramForRow, sendTelegram` from `@/lib/telegram`.
- `route.ts:8-18` Header comment: env now documents `TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (+ optional per-role)`.
- `route.ts:23-39` `QueuedRow` adds `created_at?: string|null` (needed for Telegram timestamp).
- `route.ts:43-75` **New `fanoutTelegram(rows)`** before `pageOps`:
  - `TELEGRAM_CONCURRENCY = 5`
  - Env gate `TELEGRAM_BOT_TOKEN` missing → `{sent:0, skipped:n, failed:0}` no-op
  - Per-tick in-memory `Set<string>` dedupes same `id` within one tick
  - `toSend = rows.filter(r => chatIdsForRow(r).length>0)` (rows with no chat for that role count as skipped)
  - `mapLimit(toSend, 5, row => { chats = chatIdsForRow(row); text = formatTelegramForRow(row); await Promise.all(chats.map(chatId => sendTelegram(text,{chatId}))) })`
  - Returns `{sent, skipped, failed}`

- `route.ts:148-164` `supabase.from('notifications').select('id, event, …, created_at')` — added `created_at` to select for formatting.

- `route.ts:170-182` **Wire point — every QUEUED row:** Immediately after `const all = rows as QueuedRow[]`:
  ```ts
  let telegram = {sent:0, skipped:0, failed:0};
  try { telegram = await fanoutTelegram(all); } catch (e) { console.warn('[telegram] fanout failed', …); }
  ```
  Runs **before** branching into ops/FCM so every portal's row (ADMIN, CUSTOMER, COMPANION, care events, cancel/reschedule) is fanned out. Failures are best-effort and never block FCM.

- `route.ts:203,215,340` Return JSON now includes `telegram` alongside `sent/failed/skipped/ops/opsPaged/retiredTokens/ranAt` in three exit paths (no-queued-after-ops, no-deliverable, final).

Preserved CARESY-1 idempotency guards:
- `route.ts:191` ops updates `.eq('id',…).eq('status','QUEUED')`
- `route.ts:222` undeliverable `.in('id',…).eq('status','QUEUED')`
- `route.ts:305` final outcomes `.eq('id',…).eq('status','QUEUED')`

No DB migration added.

---

## 4) Env vars required

Set in **Vercel → website project → Settings → Environment Variables** (and locally in `.env.local` for dry-run, never committed):

| Var | Required | Value |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **Yes** for live send | Bot token from `@BotFather` → `/newbot`. Example: `1234567890:AAH…`. **Never hardcode, never `NEXT_PUBLIC_`** |
| `TELEGRAM_CHAT_ID` | **Yes** for live send | Default chat/channel id: numeric (`-100123…` for channel, `123456` for user) or `@mychannel`. Comma-separated for multi-chat. |
| `TELEGRAM_CHAT_ID_ADMIN` | No | Override for `ADMIN` rows (ops alerts). Falls back to `TELEGRAM_CHAT_ID` |
| `TELEGRAM_CHAT_ID_CUSTOMER` | No | Override for `CUSTOMER` rows |
| `TELEGRAM_CHAT_ID_COMPANION` | No | Override for `COMPANION` rows |

Existing cron vars unchanged: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `FIREBASE_SERVICE_ACCOUNT`, `OPS_WEBHOOK_URL`.

If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is missing/empty, the cron still runs and returns `telegram: {sent:0, skipped:n, failed:0}` — **silent no-op**, same as ops webhook without `OPS_WEBHOOK_URL`.

---

## 5) What needs the human bot token to verify live

You CANNOT live-test without a real bot token (per task). Dry-run/trace instead:

**Dry-run (no token, autonomous):**
- With no env, `GET /api/cron/send-push` (with `Authorization: Bearer <CRON_SECRET>` if set) returns `telegram.skipped == n` and does not throw — proves no-op path.
- With `TELEGRAM_BOT_TOKEN` set but `TELEGRAM_CHAT_ID` empty, same no-op for that role — proves per-role gate.

**Live (needs human):**
1. Create bot: DM `@BotFather` → `/newbot` → copy token → set `TELEGRAM_BOT_TOKEN` in Vercel env, redeploy (or `vercel env pull`).
2. Get chat id: add bot to a Telegram group/channel or DM it, send a message, then `curl https://api.telegram.org/bot<token>/getUpdates` and read `chat.id` (or use `@userinfobot`). Set `TELEGRAM_CHAT_ID` (or per-role vars).
3. Create a test event: on website or mobile, place a booking → `BOOKING_CREATED` (ADMIN) should appear; or change booking status in Supabase `update bookings set status='ACCEPTED' where id=…` → `STATUS_ACCEPTED` → customer; or `insert into care_events …` → `CARE_EVENT_*`.
4. Hit cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/send-push` → expect JSON `telegram.sent >=1` and a Telegram message: `<b>BOOKING_CREATED</b> • ADMIN … Urgent request … booking abcd…`
5. Verify idempotency: hit the same `GET` again immediately — second call should `sent:0` (rows now `SENT`, `SELECT ... WHERE status='QUEUED'` returns 0), and no duplicate Telegram.

**Local code trace (no network):**
- `formatTelegramForRow({id:'…', event:'BOOKING_CANCELLED', title:'Cancelled ABC', body:'Reason: …', booking_id:'…', recipient_role:'COMPANION'})` → HTML string with escaped entities, `booking <code>aaaa</code>`.
- `chatIdsForRow({recipient_role:'ADMIN'})` → reads `TELEGRAM_CHAT_ID_ADMIN` or fallback.

---

## 6) Idempotency reasoning

- **DB status guard (durable):** Like CARESY-1, every final `notifications` transition is `UPDATE … SET status='SENT'|'FAILED'|'SKIPPED' WHERE id=? AND status='QUEUED'`. A concurrent tick that already claimed the row touches 0 rows, so the row won't be durable-duplicated and the next tick's `SELECT … WHERE status='QUEUED'` won't refetch it. Telegram fan-out happens **before** these updates, so a row's Telegram is sent once per durable claim.
- **In-memory per-tick guard (ephemeral):** `fanoutTelegram` holds a `Set<string>` of `id`s seen in this tick. If the same `id` somehow appears twice in `all` (or duplicated via `all.filter`), it sends once. `TELEGRAM_CONCURRENCY=5` with `mapLimit` preserves order but doesn't duplicate.
- **Residual risk:** If two cron ticks `SELECT` the same `QUEUED` rows **concurrently before either `UPDATE`**, both will call `fanoutTelegram` and both will POST to Telegram → one durable double-send, even though only one DB update will stick. This is identical to the FCM double-send risk documented in `PUSH_PIPELINE_REPORT.md`. True exactly-once would need a `telegram_sent_at` column (or `SENDING` state) and `UPDATE … SET telegram_sent_at=NOW() WHERE status='QUEUED' AND telegram_sent_at IS NULL RETURNING id` then only fan out `RETURNING` ids, or `SELECT FOR UPDATE SKIP LOCKED` via `claim_notifications(limit)` RPC — per BOUNDARIES we flag it and use the in-memory guard instead of a migration.
- **No retry amplification:** `SENT` rows are never reselected; `FAILED`/`SKIPPED` are terminal for that tick; Telegram failure does not revert `status`, so no retry storm.
- **Chat routing does not duplicate:** `chatIdsForRow` resolves once per row; `sendTelegram` fan-outs to each `chat_id` in that role's list, but each row is sent once per chat, not per device.

If per-channel exactly-once is required, add `ALTER TABLE notifications ADD COLUMN telegram_sent_at TIMESTAMPTZ` + update it with `IS NULL` guard; until then the per-tick Set + status guard is the minimal non-migration solution.

---

## 7) Files changed

- `apps/website/src/lib/telegram.ts` — **new** Telegram channel (sendTelegram, chatIdsForRow, formatTelegramForRow)
- `apps/website/src/app/api/cron/send-push/route.ts` — imports, QueuedRow.created_at, fanoutTelegram, wire point after SELECT, include `created_at` in select, return `telegram` counts

No DB migration, no mobile changes, no home-card/UI changes, no `expo prebuild`/`eas`/`vercel` deploy, no prod Supabase writes.

---

## 8) Verification

- `tsc --noEmit -p apps/website/tsconfig.json` → **0**
- `tsc --noEmit -p apps/mobile-app/tsconfig.json` → **0**
- Telegram lib type-checks (fetch, HTML escape, env access all tsc-clean)
- Route still type-checks with new telegram import and `created_at` select

---

## 9) Next steps / open questions for god

1. **Approve or skip trip-status Telegram:** Should `advance_trip_status` enqueue `TRIP_<status>`→`CUSTOMER`? If yes, we add `migrations/35_TRIP_NOTIFICATIONS.sql` with `enqueue_trip_status_notification() AFTER UPDATE OF status ON trips`.
2. **Ambiguous gaps triage:** Do you want Telegram for companion approval, patient creation, or billing events, or keep those silent?
3. **Exact-once requirement:** Is the concurrent-SELECT double-send risk acceptable for now, or should we add `telegram_sent_at` column + claim RPC in a follow-up?
4. **Channel routing:** Single `TELEGRAM_CHAT_ID` vs. separate ops/customer channels — keep single for now unless you want per-role isolation.
