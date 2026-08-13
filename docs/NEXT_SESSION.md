# NEXT_SESSION.md — "where we are & what's next"

Fast-moving. **Read this first on restart. Update it before every `/clear` or
when context is about to fill.** Durable facts live in
[PROJECT_MEMORY.md](./PROJECT_MEMORY.md).

_Last updated: 2026-08-13 — branch `feature/structured-data`, working tree clean._

## Just shipped (on `main`, deployed)

- `da99940` — companion signup now requires **Aadhaar back** upload
  alongside front (`AADHAAR_BACK` added to `DOC_TYPES` in
  `apps/companion/src/app/page.tsx`). `feature/structured-data` and `main`
  point at the same commit — pushed, Vercel building production.
  Verify live at companion.caresy.co.in once the build finishes.
- `8dd8515`, `43f3ce1` — mobile-app (Expo/RN): design-system foundation,
  Home/Booking/My-Bookings screens, live Tracking screen. See
  `apps/mobile-app/NATIVE_CHECKLIST.md` for what's deferred and store-submission
  blockers.

## In progress (uncommitted WIP)

None — `git status` is clean as of this update. Re-check before trusting this.

Still outstanding from before (not touched this session):

- `apps/website/src/app/login/page.tsx` — custom OTP flow + Ellie mascot.
- `packages/auth/src/msg91.ts`, `packages/auth/src/AuthContext.tsx` — phone OTP.
- `apps/website/src/app/{privacy,terms}/page.tsx` — legal copy.
- `supabase/migrations/{27_TRANSPORT,29_FIX_AUDIT_RLS,32_MERGE_DUPLICATE_PATIENTS}.sql`.

Confirm these are still present/uncommitted on next restart — this list is
carried forward from 2026-08-10 and may be stale.

## Next tasks (do these)

1. **Privacy policy: fill 5 `FILL` blanks** before deploy. Blocking legal go-live.
2. **Ship login bundle:** commit login/page.tsx + msg91.ts + AuthContext.tsx
   together (corrected TOKEN_AUTH build + Ellie UI in one deploy), then
   end-to-end re-test live login on caresy.co.in/login.
3. **iOS App Store blockers:** signing done; **Sign in with Apple config still
   pending** on the app side. `xcodebuild` unavailable in sandbox (only CLI
   tools) — needs a real Xcode/mac to archive + upload.
4. **Companion docs, later (optional):** no self-serve re-upload UI post-signup;
   companions send police/licence to ops via WhatsApp. Add an upload widget if
   self-serve is wanted.

## Open decisions / unknowns

- Whether to gate driving *jobs* on licence in the UI too (DB already refuses
  via `can_drive` — admin sets it after verifying).

## On restart / low-context ritual

1. `git status` + `git log --oneline -5` — reconcile against "In progress" above.
2. Read `docs/CURRENT.md` for anything not captured here.
3. When you finish or change state: edit this file, move done items into
   `PROJECT_MEMORY.md`'s milestones, then `graphify update .`.
