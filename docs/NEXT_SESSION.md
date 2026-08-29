# NEXT_SESSION.md — SINGLE SOURCE OF TRUTH FOR PROGRESS

**Read this first on restart — this is the ONE file for all progress. All other handoff/progress files are deprecated. Update this file before every `/clear`. Durable facts live in [PROJECT_MEMORY.md](./PROJECT_MEMORY.md). Claude + Muse both use this.**

_Last updated: 2026-08-29 (evening). Branch `main`, clean. All apps typecheck; admin builds._

## Where things stand

Everything from the 2026-08-28/29 sessions is **merged to `main` and pushed**.
There is no in-flight branch and no uncommitted work. The Android build failure
is **solved**; what remains is one credential step that needs your go-ahead, plus
the PAT rotation.

### Blocked on you — do these first

1. ~~**Paste the failing build log.**~~ **Done 2026-08-29 — cause found and fixed.**
   The log blob is **brotli** (`content-encoding: br`), not gzip — that is why
   the three earlier decode attempts failed. Decoded with
   `zlib.brotliDecompressSync`; the buried error was:

   ```
   Runtime version calculated on local machine: 139d9597536f4cabe1be1a4e897f3ac233ed470e
   Runtime version calculated on EAS:           f54cd506e602721fdaecc48ff3a69d12f991e6d2
   ```

   `runtimeVersion` uses the `fingerprint` policy. The only real difference was
   `node_modules/react-native-maps`: a local Gradle run had left `.gradle/` and
   `android/build/` inside it, which a fresh install on the builder does not have.
   Reinstalled the package — local now computes `f54cd506…`, matching EAS — and
   added `apps/mobile-app/fingerprint.config.js` to ignore that class of build
   pollution permanently (verified: recreating the dirs no longer moves the hash).
   Full write-up in `docs/PLAY_STORE_RELEASE.md` step 1, including how to read a
   failed EAS log. **The build has not been re-run** — do item 2 first, or the
   green AAB still ships without Supabase credentials.

2. **EAS production env vars are missing — a green build would still be broken.**
   `lib/supabase.ts:50-51` reads `EXPO_PUBLIC_SUPABASE_URL` /
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Those exist only in
   `apps/mobile-app/.env.local`, which is gitignored, so EAS has never had them.
   Any AAB built today ships with no Supabase credentials and dies at launch.
   Fix before **any** tester build:
   ```
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value <url> --visibility plaintext
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <key> --visibility plaintext
   ```
   Not yet run — it pushes a credential to a third party, so it needs an explicit
   go-ahead.

3. **Rotate the GitHub PAT.** Pasted in plaintext on 2026-08-27, stored at
   `~/.caresy-gh-token` (mode 600) and in the gh keyring at the user's request.
   Still not rotated.

## Shipped 2026-08-29 (all on `main`)

- **Admin hardening** — issues #13, #14, #15 closed. `admin_save_booking_edit`
  takes explicit `p_change_status` / `p_change_companion` intent flags and takes
  `FOR UPDATE` before deciding; both native `confirm()` sites replaced with the
  app's two-step pattern; `can_drive` pre-check before reassignment. Muse's work,
  independently verified — every claim checked against the files.
- **`is_admin()` failed open for anonymous callers.** `COALESCE` sat inside the
  scalar subquery, so a session with no `auth.uid()` returned NULL, and plpgsql
  does not take `IF NOT NULL THEN`. Three admin RPCs were callable over PostgREST
  with only the publishable anon key. Fixed in `43_FIX_IS_ADMIN_NULL.sql`
  (applied); re-probed after — all three now 401. Rule recorded in
  `docs/SECURITY.md`. **Found by probing production, not by reading code** —
  worth repeating on other guards.
- **Apple sign-in** uses Apple's own `ASAuthorizationAppleIDButton`; nonce moved
  off `Math.random()` to `Crypto.getRandomBytes(32)`.
- **Two release runbooks**: `docs/PLAY_STORE_RELEASE.md`,
  `docs/APP_STORE_RELEASE.md`.

Migrations 41, 42, 43 are all **applied to production**. `docs/DATABASE.md` rows
are current.

## Mobile release — real state

| | Android | iOS |
|---|---|---|
| Keystore / signing | **exists**, EAS credentials `tX_VA-aRur` — issue #19's "not started" was stale | no store-distribution build ever produced |
| Builds ever | 1 development (2026-08-14) + 2 failed production | 1 development simulator build (2026-08-14) |
| Submissions ever | zero | zero |
| Gate | 12 testers × 14 **continuous** days (personal Play account) | none — TestFlight internal is instant |
| Play/ASC account | registered and verified | paid membership **unconfirmed** — the Team ID in `eas.json` does not prove it |
| Testers | 14 people available (need 12; 2 spares absorb dropouts) | n/a |

**Start the Play clock as early as possible** — it is the only thing that cannot
be accelerated. But not with a broken AAB: fix item 2 above first, or the 14 days
run against an app that opens to an error.

iOS is missing `ascAppId` in `eas.json` and an App Store Connect API key. Already
satisfied and verified in source: Sign in with Apple (4.8), in-app account
deletion (5.1.1(v), `app/account-delete.tsx`), export compliance, privacy
manifest, permission strings.

Watch for: App Review works from the US, but the booking flow validates an Indian
mobile (`isValidIndianMobile`) and the service area is Noida. Without demo
credentials in the review notes a reviewer hits a dead end and files 2.1.

## Muse coordination

Muse worked in `/Users/1234/Documents/caresy_admin_worktree` on
`feature/admin-hardening` (now merged). Ground rules live in
`docs/PARALLEL_WORK.md` §1, including two added this session:

- **1.10** commit early — an untracked file is work-at-risk. Muse had a full day
  of work with zero commits.
- **1.11** never route around an unexplained tool failure. Muse reported "sandbox
  errors" and skipped the build gate; the real cause was a fresh worktree having
  no `node_modules` and no `.env.local`.

If a new worktree is created: run `npm install` at its root and copy the app's
`.env.local` in, or no gate can run.

## Verified stale — do not re-chase

- `NATIVE_CHECKLIST.md` claimed `POST_NOTIFICATIONS` and `CAMERA` were missing
  from the manifest. They are not — `expo-notifications` and `expo-image-picker`
  declare them in their own library manifests and Android's merger folds them in.
  Corrected in the file.
- Issues #16 and #17 were filed from stale docs and closed — ADR-0012 had already
  deleted the mascot system.
- Issue #19's "keystore not started" — the keystore has existed since August.

Pattern worth keeping: **verify docs against source before acting on them.**
Three separate stale claims this week.

## Open issues, ranked by what actually gates a first customer

1. **#5** walk the money loop on two phones — never done by a human, step 5 of
   `docs/CURRENT.md`'s pre-launch list
2. **#6** walk cancel and reschedule on two phones
3. **#7 / #8 / #9** UPI VPA, service-role key, `patient-docs` bucket — all manual
   dashboard work
4. **#19** Play Store — the 14-day clock
5. Cleanup: #10, #11, #12, #18, #20 (companion half), #21, #22, #23

## Environment cautions

- `apps/mobile-app/.env.local` and `apps/website/.env.local` point at
  **production** Supabase. Simulator bookings write real rows and page the ops
  phone via ntfy.
- Never run `npm run dev` here — Turbopack has spawned runaway processes.
  Verify with `build` plus a Vercel preview.
- Never edit an applied migration. Fix forward with a new numbered file.
- Metro was stopped at the end of this session; port 8081 is free.

## Unverified, worth knowing

- **Apple sign-in has never completed end to end.** The button renders natively
  in the simulator, but no Apple ID is signed into it, so the token → Supabase
  session → home screen round-trip is unproven.
- **The reschedule sheet has never been run on any device** —
  `feature/mobile-reschedule` merged without verification.
- **Android has never been booted at all**, simulator or device.
