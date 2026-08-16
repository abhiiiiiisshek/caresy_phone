# NEXT_SESSION.md — "where we are & what's next"

Fast-moving. **Read this first on restart. Update it before every `/clear` or
when context is about to fill.** Durable facts live in
[PROJECT_MEMORY.md](./PROJECT_MEMORY.md).

_Last updated: 2026-08-16 13:42 — branch `feature/mobile-quick-help`, `4c6a719` pushed, working tree clean._

## Just shipped (committed + pushed, not yet deployed)

- `4c6a719` — **mobile home now website-identical** (user: "red urgent help above is a disaster" → fixed): removed `stickyUrgentWrap` 210px fixed red banner outside `ScrollView` in `apps/mobile-app/app/index.tsx`; new `primaryActions` inside scroll with two 132px `ActionCard`s matching `apps/website/src/app/page.tsx:334` — `Urgent Booking` (`urgentBg/urgentInk/urgent`, `bolt.heart`, `caresy-hospital-support.webp` 64% bleed + 58% solid fade) and `Schedule Appointment` (`green`, `caresy-family-app.webp`), trust chips moved to `Verified Companions` card below Quick Actions. Images copied `website/public/assets/*.webp` → `mobile-app/assets/`. `tsc 0` both apps, pushed to `feature/mobile-quick-help`.
- Prior in same push: `apps/mobile-app/app/family.tsx` new (7294B patients CRUD + soft-delete), `quick-help.tsx` family picker (limit 20), `booking.tsx` pincode debounce 400ms, `my-bookings.tsx` limit 50, `profile.tsx` glow, `ui.tsx` skeletons, `expo-symbols ^57.0.2` hybrid. Detail in `/NEXT_SESSION_HANDOFF_2026_08_16.md`.
- `af3558a`, `6c3e052` — audit fixes (deletion, RLS hardening, FAQ, tracking honesty) — prior.

## In progress (uncommitted WIP)

None — `git status` clean except handoff docs. `NEXT_SESSION_HANDOFF_2026_08_16.md` at root is the detailed handover (13:40 approved). Re-check `git log --oneline -5` on restart.

Outstanding from backlog (not touched yet):
- `apps/website/src/app/login/page.tsx` — custom OTP + Ellie mascot.
- `packages/auth/src/msg91.ts`, `packages/auth/src/AuthContext.tsx` — phone OTP.
- `apps/website/src/app/{privacy,terms}/page.tsx` — legal copy.
- `supabase/migrations/{27_TRANSPORT,29_FIX_AUDIT_RLS,32_MERGE_DUPLICATE_PATIENTS}.sql`.

## Next tasks (do these)

1. **User decision: true gradient?** If they reply `gradient`, add `expo-linear-gradient` to replace solid 58% fade with `<LinearGradient colors={[bg,'transparent']}>` matching website `linear-gradient(90deg, bg 0%, bg 36%, transparent 84%)` → `npx expo prebuild --clean` → `eas build --platform ios --profile production` → TestFlight. If `keep`, stay with solid fade (ship-ready without extra dep).
2. **Phase 4 remaining:** re-enable push (remove early return `apps/mobile-app/lib/AuthProvider.tsx:48`), test `api/cron/send-push` QUEUED→SENT; add bottom sheet for service/transport pickers. Do not start Phase 5 until push verified.
3. **Deploy:** Vercel website deploy + verify prod `is_admin() SECURITY DEFINER` / `trg_guard_trip_status` after migrations 30/31/33/34, update `docs/DATABASE.md` ⬜→✅.
4. **Play Store:** 12×14 tester clock not started — needs keystore + tester list.

## Open decisions / unknowns

- Whether to gate driving jobs on licence in UI too (DB already refuses via `can_drive`).
- SwiftUI vs Expo — answered this session: Expo correct now (reuse, speed, Android). Native feel achieved via website-identical cards; SwiftUI would be ~3mo delay for same.

## On restart / low-context ritual

1. `git status` + `git log --oneline -5` — reconcile against "In progress" above. **Read `/NEXT_SESSION_HANDOFF_2026_08_16.md` first** — it has the full urgent-fix detail + preview command.
2. Read `docs/CURRENT.md` for anything not captured here.
3. When you finish or change state: edit this file, move done items into `PROJECT_MEMORY.md`'s milestones, then `graphify update .`.
