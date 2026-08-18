# NEXT_SESSION.md — "where we are & what's next"

Fast-moving. **Read this first on restart. Update it before every `/clear` or
when context is about to fill.** Durable facts live in
[PROJECT_MEMORY.md](./PROJECT_MEMORY.md).

_Last updated: 2026-08-18 12:30 — branch `feature/mobile-quick-help`, `ef2e26f` pushed, deferred sign-in + MSG91 per user, proceeding to Phase 5/6 Ship._

## Just shipped (committed + pushed, not yet deployed)

- `ef2e26f` — **chore(mobile): bump expo-constants 57.0.10→57.0.11, add expo-device, align expo-notifications 0.32→57.0.11** — SDK 57 alignment for dev-client. `tsc 0` both apps. Deferred per user: sign-in button + MSG91 OTP setup.
- `60470cc` — guard push + gradient for Expo Go, `npx expo prebuild --clean` done (ios/ generated, tsc 0). `55645f3`/`fd3758e`/`b511055` — push crash guards for Expo Go (lazy require).
- `4c6a719` — **mobile home now website-identical** (user: "red urgent help above is a disaster" → fixed): removed `stickyUrgentWrap` 210px fixed red banner outside `ScrollView` in `apps/mobile-app/app/index.tsx`; new `primaryActions` inside scroll with two 132px `ActionCard`s matching `apps/website/src/app/page.tsx:334` — `Urgent Booking` + `Schedule Appointment`, trust chips moved to `Verified Companions` card. Images copied `website/public/assets/*.webp` → `mobile-app/assets/`. Prior: `family.tsx` new, `quick-help.tsx` picker, `booking.tsx` pincode debounce 400ms, `my-bookings.tsx` limit 50, `ui.tsx` skeletons, `expo-symbols ^57.0.2` hybrid.
- `3700524` — bottom sheet for service/transport pickers (replace plain Chip cards). `f2c367d` — true gradient fade `LinearGradient` 36%→84% (storeClient guarded).
- `af3558a`, `6c3e052` — audit fixes (deletion, RLS hardening, FAQ, tracking honesty) — prior. Ledger `30/31/33/34` → ✅.

## In progress (deferred per user, proceed to next phase)

Deferred (leave for later):
- `apps/website/src/app/login/page.tsx` — custom OTP + Ellie mascot — sign-in button.
- `packages/auth/src/msg91.ts` + `apps/website/src/app/api/auth/phone/route.ts` + `33_PHONE_SIGNIN.sql` — MSG91 OTP (needs `MSG91_AUTH_KEY`/`TEMPLATE_ID` env).

Proceeding → **Phase 5/6 Ship** (Phase 4 ~90% considered done: MapView+Realtime+10s poll ✅, image-picker ✅, location ✅, push guarded ✅, bottom-sheet ✅, gradient ✅). Remaining verification is device-only: push `QUEUED→SENT` via `api/cron/send-push` + bottom-sheet on dev-client.

Outstanding still (not sign-in/MSG91):
- `apps/website/src/app/{privacy,terms}/page.tsx` — legal copy (placeholder).
- `supabase/migrations/32_MERGE_DUPLICATE_PATIENTS.sql` — one-off patient dedup `⬜*`.

## Next tasks (do these) — user: "leave we can set them later proceed to the phase"

1. **EAS Ship (Phase 6):** `npx expo prebuild --clean` already done (ios/ + android via Capacitor). Next: `eas build --platform ios --profile production` → TestFlight + `eas build --platform android --profile production` → AAB → Play Console 12×14 closed testing (keystore + tester list not started). Verify on TestFlight: bottom-sheet pickers, `LinearGradient` fade, push `push_tokens` upsert (needs `google-services.json` + `SUPABASE_SERVICE_ROLE_KEY` + `projectId f1c994af-5e87-43f4-8d64-f33366e6756d`).
2. **Deploy website:** Vercel deploy (already `30/31/33/34` → ✅, but verify prod `SELECT prosecdef FROM pg_proc WHERE proname='is_admin'` + `SELECT tgname FROM pg_trigger WHERE tgname='trg_guard_trip_status'`).
3. **Before first customer (CURRENT.md):** set `NEXT_PUBLIC_UPI_VPA` + `OPS_WEBHOOK_URL` (ntfy.sh, no www/trailing slash) + `CRON_SECRET`, enable `pg_cron` 5min expiry sweep + `cron-job.org` 1min push drain, create `patient-docs` bucket, approve 1 companion at `/admin/companions`, walk money loop book→accept→Start→Complete&bill→collect→`/admin/payments` on 2 phones.
4. **Later (deferred):** re-enable full sign-in + MSG91 OTP (`MSG91_AUTH_KEY`, `TEMPLATE_ID`, Ellie mascot `login/page.tsx`).

## Open decisions / unknowns

- Whether to gate driving jobs on licence in UI too (DB already refuses via `can_drive`).
- SwiftUI vs Expo — answered this session: Expo correct now (reuse, speed, Android). Native feel achieved via website-identical cards; SwiftUI would be ~3mo delay for same.

## On restart / low-context ritual

1. `git status` + `git log --oneline -5` — reconcile against "In progress" above. **Read `/NEXT_SESSION_HANDOFF_2026_08_16.md` first** — it has the full urgent-fix detail + preview command.
2. Read `docs/CURRENT.md` for anything not captured here.
3. When you finish or change state: edit this file, move done items into `PROJECT_MEMORY.md`'s milestones, then `graphify update .`.
