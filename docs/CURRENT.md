# Current state

_Updated: 2026-08-01. First real customers expected 2026-08-02._

Short-lived working memory: what is in flight, what is known-broken, what is
next. Not architecture — a thing that settles here for good belongs in
`docs/ARCHITECTURE.md` or a `docs/ADR/` entry. Prune ruthlessly; anything stale
here is worse than nothing.

Read this first after a `/clear`.

## Before the first customer — in order

1. **Run `supabase/migrations/30_LAUNCH_FIXES.sql`, then `31_CUSTOMER_ACTIONS.sql`**
   in the SQL editor, in that order. Nothing below them works without them. Both
   end in assertions, so they fail loudly rather than half-applying.
2. **Set the env vars** in the table below. Without `NEXT_PUBLIC_UPI_VPA`
   the whole operation is cash-only; without `OPS_WEBHOOK_URL` nobody is paged
   when a booking arrives.
3. **Schedule the expiry sweep** — `pg_cron` every 5 minutes, per the note at
   the end of `13_LIFECYCLE.sql`. Without it nothing ever expires; with it and
   *without* migration 30, same-day bookings were killed on arrival.
4. **Approve at least one companion** at `/admin/companions`, and clear them for
   driving there if you intend to offer `CUSTOMER_VEHICLE` at all.
5. **Walk the money loop on two phones**: book → accept → Start → Complete &
   bill → collect → confirm the row at `/admin/payments`. Still never run end to
   end by a human.

## In flight

- **Mascot design system replaces emoji illustration.** One owned character,
  requested by pose — `<Mascot pose="…" />` and the `EmptyState`/`LoadingState`/
  `ErrorState`/`SuccessState` wrappers, all in `@caresy/ui` (ADR-0011). Art is a
  registry swap (`POSE_ART`), not a code change; the placeholder character ships
  until real art is registered (Lottie path per ADR-0010, dep already installed).
  Wired: `login` (5 poses incl. covering-eyes on OTP), `my-bookings`, `profile`,
  `care`. **Still emoji:** the 12 `careGuides.ts` topic thumbnails (content
  taxonomy, not a mascot state — needs its own icon decision) and the ✓/✗ text
  prefixes in `booking`/`quick-help` service-area copy. tsc + `build` green.

- **Migration 31 gives the customer their own two verbs.** Reschedule and Cancel
  in `my-bookings` were buttons that closed the sheet; every plan change arrived
  as a WhatsApp message. They now call `cancel_booking()` / `reschedule_booking()`,
  which check ownership, the status window (nothing after Start) and the 60-minute
  lead window server-side, tell the companion and ops, and reset `expires_at` so a
  moved visit is not swept to `EXPIRED`. The same migration closes the hole that
  made the RPCs advisory: the customer's own session could PATCH `status` straight
  to `COMPLETED` or unassign the companion, because the UPDATE policy checked who
  owned the row and never what changed in it.
- **Ops rows in the notification queue reached the wrong person.** The push cron
  resolved *every* row without a `recipient_user_id` to the booking's customer,
  so "a HOSPITAL_COMPANION request needs a companion assigned" was pushed to the
  customer and ops was never told. ADMIN-role rows now POST to `OPS_WEBHOOK_URL`
  (Slack/Discord/Zapier/n8n/WhatsApp gateway — any JSON endpoint); with it unset
  they stay `QUEUED` so the `/admin/ops` badge still counts them.
- **`ACCEPTED` renders on the home screen too**, not just in `my-bookings` — the
  live booking card was listed for `ASSIGNED` only, so the self-accept path left
  the home screen blank.
- **`/quick-help` reuses the patient** it already has for that customer instead of
  minting a row per urgent request. Old duplicates still need the merge script.
- **`/admin/analytics` renders `transport_fare_reference`** — what rides to each
  drop point have actually cost, by hour. Every fare the companions logged was
  invisible outside the SQL editor.
- **Migration 30 closes the day-one gaps found by walking the live loop.** The
  four a customer would have hit: a same-day booking got `expires_at` in the
  past and was swept to `EXPIRED` before anyone saw it; a companion accepting
  from their own phone left the customer with no name, no photo and no number
  (only the admin board wrote `service_metadata.companion` — the database
  stamps it now, whoever assigns); `can_drive` was writable by the companion it
  gated; and creating a booking notified nobody at all.
- **Both sides can now reach each other.** The companion's job card shows the
  customer and emergency numbers as `tel:` links — they were in the row all
  along and simply never rendered. `my-bookings` shows the companion's number
  once the job is theirs.
- **`ACCEPTED` renders for customers.** `my-bookings` understood only
  `ASSIGNED`, so the self-accept path — the normal one — showed a raw status
  string and never offered the Track button.
- **The booking form refuses the past.** Slots inside a 60-minute lead window
  are not offered, and the slot is re-checked at submit. Logic and its
  self-check live in `packages/utils/src/slots.ts`.
- **Booking lifecycle state machine shipped (migrations 37-40).** `bookings.status` is now DB-enforced (`is_valid_booking_transition` + `trg_enforce_booking_transition`); status overrides require `admin_override_booking_status` with reason audit; companion reassignment is a first-class `reassign_booking` RPC (clock reset if IN_PROGRESS, dual notifications); `complete_booking`/`reschedule_booking` races closed with FOR UPDATE; companion Accept preflight overload unblocks every Accept; admin waive is stale-safe and companion suspend warns on live jobs; companion portal now polls every 60s when live, shows 20-row Updates panel, and handles 0-row races. Migrations 37-40 confirmed applied by hand in the Supabase SQL editor.
  Reviewed line-by-line against source (not just the diff) after first-pass implementation: found and fixed one real crash — `apps/companion/src/app/page.tsx`'s new poll `useEffect` referenced `fetchNotifications` before its own `const` declaration (temporal-dead-zone `ReferenceError` on every render of the companion dashboard). Fixed by reordering; `npx tsc --noEmit` clean on both `@caresy/admin` and `@caresy/companion` after the fix. Lint errors present in both apps (4 admin, 3 companion, all `no-explicit-any`/`react-hooks/set-state-in-effect`) traced individually to files/lines this work never touched — pre-existing, not regressions. `npm run build` for either app was **not** run as part of this review — do that before calling this fully shipped, since this repo's own `CLAUDE.md` calls it the real gate (catches server/client boundary issues `tsc` alone won't).
  Open, non-blocking polish noted but not fixed: the combined admin "status + companion changed" save is two separate RPC calls, not one transaction (a mid-sequence failure leaves a partial save, correctly rejected but visible to the operator as two steps); the suspend/reject live-job warning uses a native `window.confirm` instead of the app's existing two-step-button confirm pattern; `reassign_booking` has no driving-licence pre-check, so reassigning a `CUSTOMER_VEHICLE` job to an unlicensed companion surfaces `guard_drive_assignment`'s raw trigger exception rather than a friendly message.
- **Billing pipeline (migration 26) is shipped but still never exercised end to
  end by a human.** See step 5 above.
- **Admin coverage is nearly complete.** `/payments` (owed / collected / waive)
  exists; `/companions` now has driving-licence verification; `/ops` shows the
  transport mode and warns before a driving assignment the database will refuse;
  `/analytics` now renders the fare reference.
- **Play Store**: personal-account registration needs 12 testers × 14 continuous
  days before production. Keystore + tester list not started.

## Known broken / blocked

| Thing | Effect | Fix |
|---|---|---|
| `NEXT_PUBLIC_UPI_VPA` unset | UPI buttons hidden, cash-only | set in Vercel env (website + companion) |
| `SUPABASE_SERVICE_ROLE_KEY` unset | push delivery dead; `notifications` queue grows unread | set on website server env |
| A `FAILED` notification is never retried | one bad run strands the row; requeue by hand with `update notifications set status='QUEUED', error=null where …` | add a retry counter if it happens twice |
| Duplicate patient rows | old ones from before `/quick-help` reused patients | run `32_MERGE_DUPLICATE_PATIENTS.sql`; it skips any duplicate that owns documents, so re-run the query at its foot afterwards |
| `patient-docs` bucket | must be created by hand in the dashboard | migration 25 only adds policies |

## Live in production (2026-08-02)

Both cron routes run on cron-job.org every 1 min (push drain) and 5 min (expiry
sweep), authenticated with `CRON_SECRET`. `OPS_WEBHOOK_URL` points at an
**ntfy.sh** topic — no workspace account, the topic string is the only secret, and
the phone app is the pager. A new booking, a cancellation and a reschedule all
buzz the ops phone within a minute. Two traps, both hit once already: the URL
must have no `www.` and no trailing slash (either gives a 308 that cron-job.org
counts as failure), and a Vercel env var does nothing until the next redeploy.

## Next up (rough order)

1. Play Store keystore + testers.
2. Walk cancel and reschedule on two phones — both are shipped and neither has
   been run by a human.

## Stale docs

`docs/DEVELOPER_HANDOFF.md` (2026-07-09) predates the monorepo — its repository
map and pending-work sections describe the old single-app `src/` tree. Useful as
history; do not follow its layout. `docs/ARCHITECTURE.md` supersedes it.
