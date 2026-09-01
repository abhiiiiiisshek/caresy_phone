# Current state

_Updated: 2026-08-31. First real customers expected 2026-08-02._

Short-lived working memory: what is in flight, what is known-broken, what is
next. Not architecture — a thing that settles here for good belongs in
`docs/ARCHITECTURE.md` or a `docs/ADR/` entry. Prune ruthlessly; anything stale
here is worse than nothing.

Read this first after a `/clear`.

## Android release readiness — audit done, rebuild pending (2026-08-31)

Branch `fix/android-release-readiness`, three commits, **not pushed**. Full
detail in `docs/PLAY_STORE_RELEASE.md`; the short version:

- The versionCode 4 AAB **must not ship**. Uploading it burns 14 days of
  closed-test clock on a build with a placeholder icon and dead push.
- `eval("require")` had hidden `expo-device`, `expo-notifications` and
  `react-native-maps` from Metro, so they were absent from the production
  bundle. Push registration and the tracking map were silently dead on every
  store build. Now static imports, verified against a bundle sourcemap.
- App icon, splash and notification icon were Expo's placeholder on **both**
  platforms — so the TestFlight build carries it too. `apps/mobile-app/scripts/make-icons.py`
  regenerates all six from the website's brand mark.
- `expo-image-picker` was pulling `RECORD_AUDIO` into the manifest.
  `app.json` now pins `android.permissions` / `blockedPermissions`.
- `LargeSecureStore.getItem` crashed on launch after an Android backup-restore.
  Pure half extracted to `lib/sessionCrypto.ts` with a self-check.

**Open, and only you can do them:** rotate the App Review demo password
(`DEMO_APP_REVIEW_PASSWORD`, see `docs/APP_REVIEW_NOTES.md` — the old one was
public on GitHub), rotate the GitHub PAT pasted in plaintext 2026-08-27, and
finish App Store Connect (`ascAppId`, API key, privacy questionnaire).

Deliberately **not** done: R8/ProGuard is still off. Turning on minification days
before a release risks a crashing build from a missing keep-rule, and the JS
bundle dominates size anyway. Do it after the clock starts, verified with a
preview build. No crash reporting either — that needs an ADR and a new dependency.

## Where the code lives (read before cloning — 2026-08-27)

**`origin/main` is authoritative.** Clone it fresh; do not copy a folder off
anyone's machine. Seven working copies existed on the original dev machine and
several were badly stale — one was 20 migrations behind. All work found in them
has been merged to `main` or pushed to a branch; nothing is left stranded.

Branches on GitHub, and what to do with each:

| Branch | State |
| --- | --- |
| `main` | Authoritative. All four apps typecheck; website/companion/admin all build. |
| `wip/docs-consolidation` | **Not merged.** Folds `CURRENT.md`/`DEVELOPER_HANDOFF.md`/`DEV_ONBOARDING.md`/`LIVE_TRACKING_HANDOFF.md` into `ENGINEER_ONBOARDING.md` + a new `JUNIOR_ONBOARDING.md`, gitignores `graphify-out`, deletes `vanilla-backup/`. Based behind `main` — rebase before reviewing. |
| `feature/structured-data` | **Stale**, 45 commits behind. Its useful commits were already ported to `feature/companion-portal`. Delete once confirmed. |
| `feature/mobile-reschedule` | Fully merged, 0 ahead. Safe to delete. |

Migrations 37–40 are merged **and applied** (verified 2026-08-27 by probing
`stamp_companion_on_booking`, `is_valid_booking_transition`,
`admin_override_booking_status`, `reassign_booking`, `complete_booking`,
`reschedule_booking` — all present). Companion `accept()`, broken since
CARESY-7, is fixed. Background in `docs/BOOKING_LIFECYCLE_FIXES.md`.

Verify a clone with `npx tsc --noEmit` per app, `npm run build`, and
`npm run smoke` (backend checks: service-area validation, expiry sweep, RLS
wall — needs Supabase URL + anon key in env or `apps/website/.env.local`).
Note the anon key is now Supabase's newer `sb_publishable_…` format; legacy JWT
anon keys are rejected by this project.

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

- **Illustration is Phosphor duotone + Motion One, not a mascot.** ADR-0012
  (2026-08-11) supersedes ADR-0010/0011 and deleted `packages/ui/src/mascot/`;
  illustrated slots are `MotionSpot`, the 12 care-guide categories are
  `apps/website/src/lib/guideIcons.tsx`. Issue #18 (the ✓/✗ text prefixes in the
  website's `booking`/`quick-help` service-area copy) is **closed** — replaced
  with `CheckCircle2`/`XCircle` in `cc7839e`, which also widened
  `@caresy/ui` `Input`'s `hint` to `ReactNode`. The mobile app still uses a 📍
  glyph in the same copy; it is now hidden from TalkBack behind an explicit
  `accessibilityLabel` rather than read aloud as "round pushpin".

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
  Polish items are now closed (2026-08-29, merged in d1de649): the combined admin
  save is one transactional RPC (`42_ADMIN_SAVE_INTENT.sql` — explicit
  `p_change_status`/`p_change_companion` flags, `FOR UPDATE`; migration 41 was a
  first attempt whose NULL-means-two-things defect it supersedes); both native
  `confirm()` sites use the app's two-step pattern; `reassign_booking` has a
  `can_drive` pre-check before the RPC. Admin gates all green on `main`: tsc,
  lint 0 errors, `next build` 14/14 routes, self-check exit 0. Companion app's
  3 lint errors and its `npm run build` remain open (issues #20, #12).
- **`is_admin()` failed open for anonymous callers — fixed 2026-08-29.** COALESCE
  sat inside the scalar subquery, so a session with no `auth.uid()` returned NULL
  rather than FALSE, and plpgsql does not take `IF NOT NULL THEN`. Three admin
  RPCs were callable over PostgREST with only the publishable anon key. RLS still
  hid booking IDs so exploitation needed a UUID leaked from elsewhere. Fixed in
  `43_FIX_IS_ADMIN_NULL.sql` (applied); re-probed after — all three now 401.
  Rule recorded in `docs/SECURITY.md`.
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
