# NEXT_SESSION.md — SINGLE SOURCE OF TRUTH FOR PROGRESS

**Read this first on restart — this is the ONE file for all progress. All other handoff/progress files are deprecated. Update this file before every `/clear`. Durable facts live in [PROJECT_MEMORY.md](./PROJECT_MEMORY.md). Claude + Muse both use this.**

_Last updated: 2026-08-29 (evening). Branch `main`, clean. All apps typecheck; admin builds._

## Where things stand

Everything from the 2026-08-28/29 sessions is **merged to `main` and pushed**.
There is no in-flight branch and no uncommitted work. The Android build failure
is **solved**; what remains is one credential step that needs your go-ahead, plus
the PAT rotation.

### Do not retry without reading this — the React dedupe

`expo-doctor` flags duplicate native modules: react 19.2.3 in `apps/mobile-app`
alongside 19.2.4 at the root (same for react-dom). The three Next apps pin
19.2.4; Expo SDK 57 pins react **exactly** 19.2.3; `packages/ui` and
`packages/auth` declare react as a peer (`^19`), and npm auto-installs the newest
match for a peer at the root — that is the second copy.

What was tried, and what it cost:

- `overrides` in the root `package.json` **does not work**. npm 10.9.2 does not
  apply overrides to auto-installed peer deps. Confirmed against a from-scratch
  lockfile regeneration.
- Pinning every app to 19.2.3 plus root `devDependencies` **does** produce a
  single copy — but any edit to a `package.json` forces npm to refresh the
  lockfile, and **the committed lockfile is stale**. The refresh re-resolved ~55
  transitive packages in the expo/metro/react-native subtrees and produced a tree
  where the Android bundle no longer builds: `@expo/metro-runtime` and then
  `expo-glass-effect` ended up unresolvable, because `metro.config.js` sets
  `disableHierarchicalLookup: true` and Metro therefore only looks in
  `apps/mobile-app/node_modules` and the root. Adding the missing packages
  explicitly is whack-a-mole — the second one appeared right after the first was
  fixed.

So the duplicate React is **still present**, deliberately. It is a doctor warning
with no demonstrated runtime fault: `metro.config.js` pins the mobile bundle to
`apps/mobile-app/node_modules/react`, and `packages/types` and `packages/utils`
import no React at all, so two Reacts never meet in one bundle.

Doing this properly means a full SDK 57 dependency alignment
(`npx expo install --check`, 16 packages behind) with a fresh Android build to
verify — its own piece of work, not a quick fix. Do it **after** the Play clock
is running, not before.

**Gate it locally.** This class of breakage is catchable in ~1 minute without
burning an EAS build or a versionCode:

```
cd apps/mobile-app
npx expo export:embed --eager --platform android --dev false
```

That is the exact command EAS runs in its EAGER_BUNDLE phase. Exit 0 means the
dependency tree actually resolves.

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
   failed EAS log. **Confirmed by a real build**: `6aee612a`, versionCode 4,
   FINISHED in 14m22s with runtime version `f54cd506…` — the exact hash predicted.
   That is the first production AAB this project has ever produced.

2. ~~**EAS production env vars are missing.**~~ **Done 2026-08-29 — seeded.**
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are now set on
   the EAS `production` environment (project scope, plaintext — both are
   client-side-public values that ship inside the app binary anyway). Verify any
   time with `npx eas-cli env:list --environment production`. Keep them in step
   with `apps/mobile-app/.env.local`; nothing syncs them automatically.

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
- **First production Android AAB ever built** — `6aee612a`, versionCode 4. The
  two prior failures were a fingerprint runtime-version mismatch caused by local
  Gradle output inside `node_modules/react-native-maps`; see item 1 above.
  `apps/mobile-app/fingerprint.config.js` stops it recurring.
- **React dedupe attempted and reverted** (`d4a1d18`, reverted in `3a7bba8`).
  Read this before trying again — it looks like a one-liner and is not.

Migrations 41, 42, 43 are all **applied to production**. `docs/DATABASE.md` rows
are current.

## iOS — the critical path, in order (priority as of 2026-08-30)

iOS has **never produced a store build**. Android now has one (versionCode 4).
Every step below except the last two is account-holder work — they need Apple
credentials, which an agent must not enter.

1. **Confirm the Apple Developer Program membership is paid and active.** The
   Team ID `46CLB4HU9B` in `eas.json` does not prove it. Everything else is
   blocked on this. Check at developer.apple.com/account.
2. **`SUPABASE_SERVICE_ROLE_KEY` on the website's production env (issue #8).**
   This is on the iOS critical path, not general cleanup:
   `apps/website/src/app/api/account/delete/route.ts:19-21` returns **503
   "Account deletion is not configured."** without it. Apple tests in-app account
   deletion under guideline 5.1.1(v). Unset key means the reviewer hits a 503 and
   the app is rejected. Set it before submitting anything.
3. **Create the app record in App Store Connect**, then put its numeric
   `ascAppId` into `eas.json` under `submit.production.ios` — currently missing,
   and `eas submit` cannot run without it.
4. **Create an App Store Connect API key** for `eas submit`.
5. **Build**: `npx eas-cli build --platform ios --profile production`. First run
   prompts for Apple sign-in to generate the distribution certificate and
   provisioning profile — the account holder must do that part interactively.
6. **App Review demo path** — assigned to Muse, see `docs/PARALLEL_WORK.md`.
   A reviewer in the US cannot complete a booking: `isValidIndianMobile` gates
   the phone field (`apps/mobile-app/app/profile.tsx:144`) and the service area is
   Noida. Without a demo account and review notes this is a 2.1 rejection.
7. **App Privacy questionnaire** in App Store Connect (account holder).

Already satisfied and verified in source — do not re-chase: Sign in with Apple
(4.8, native button + `Crypto.getRandomBytes` nonce), in-app account deletion
(5.1.1(v), `app/account-delete.tsx`), export compliance
(`ITSAppUsesNonExemptEncryption: false`), privacy manifest, permission strings.
The iOS JS bundle also builds clean — `expo export:embed --eager --platform ios`
exits 0, so nothing in the dependency tree blocks an iOS build.

## On "the GitHub issues are just testing" — mostly true, with one exception that matters

Checked against source on 2026-08-30, not taken on faith:

- **#5, #6** — genuinely manual QA on two phones. Claim holds.
- **#7** `NEXT_PUBLIC_UPI_VPA` — **not a defect.** Unset degrades to cash-only by
  design and the UI says so (`apps/companion/src/app/page.tsx:611,638`). Safe to
  leave. Claim holds.
- **#9** `patient-docs` bucket — migration 25 is marked applied in
  `docs/DATABASE.md`, so this is likely already done; confirm the bucket exists in
  the dashboard and close it.
- **#12** — closable. Both builds pass as of 2026-08-29.
- **#8 `SUPABASE_SERVICE_ROLE_KEY` — this one is real and it blocks the iOS
  submission.** Three server routes hard-fail without it, including account
  deletion (503) which Apple explicitly tests. "Can be done manually" is true;
  "not a real issue" is not. See step 2 above.
- **#11** — a real code defect (failed notifications are never retried), not
  testing. Not launch-blocking. Assigned to Muse.

So: the claim is right that most of these are manual or cosmetic, and wrong that
none of them matter. #8 is the one to do before submitting to Apple.

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
