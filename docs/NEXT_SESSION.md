# NEXT_SESSION.md — SINGLE SOURCE OF TRUTH FOR PROGRESS

**Read this first on restart — this is the ONE file for all progress. All other handoff/progress files are deprecated. Update this file before every `/clear`. Durable facts live in [PROJECT_MEMORY.md](./PROJECT_MEMORY.md). Claude + Muse both use this.**

_Last updated: 2026-09-02. Branch `main` — `fix/android-release-readiness` was merged
(`c1bb340`) and is stale, do not keep working on it. **One commit unpushed**:
`310d7d3` "fix(mobile): swap app icon to new Caresy brand mark" — `git push`
before doing anything else, or it can be lost the way §"Environment cautions"
warns about. Tree otherwise clean._

## 2026-09-02 — new app icon, build 5 FINISHED both platforms, not yet submitted

**What happened:** swapped the app icon/adaptive-icon/splash to the new Caresy
brand mark (green "C" only, wordmark dropped — illegible at icon size). Source
was a logo file the user pasted this session (`~/Downloads/Caresy Care Made
Easy Logo(1).png` and siblings), cropped + chroma-keyed by an ad-hoc one-off
script, not committed. In-app UI has zero references to any icon asset —
confirmed by grep, not assumed.

**`apps/mobile-app/scripts/make-icons.py` already exists and does this job
properly** — read it before touching icons again, do not repeat today's ad-hoc
approach. It derives all six assets from `apps/website/public/icon-512.png`
(hardcoded `BRAND = (2, 140, 99)`, same green sampled from that file). **That
file is still the OLD logo** — confirmed by pixel-sampling, matches the old
`BRAND` constant exactly. **Running `python3 scripts/make-icons.py` right now
would silently revert today's swap back to the old mark.** Before anyone runs
it again: replace `apps/website/public/icon-512.png` with the new logo first
(website favicon/PWA icon is presumably still on the old mark too — not
checked this session, worth a look), then re-run the script instead of hand-
cropping, and it'll also regenerate `notification-icon.png` correctly (left
untouched this session since the script wasn't consulted).

**Build 4 failed on both platforms**, same root cause, nothing to do with the
icon:
```
Error: Runtime version calculated on local machine not equal to runtime
version calculated during build.
```
`node_modules/react-native-maps/android` had been touched 2026-08-31 08:39 —
after that day's `npm install` — almost certainly a local `expo prebuild` /
`expo run:android` autolinking step writing directly into `android/` (not
`android/build/`). **`fingerprint.config.js`'s ignore list did not catch this
class of pollution** — it only ignores `.gradle/**`, `android/build/**`, and
`.cxx/**` inside `node_modules`, not arbitrary files written straight into a
module's `android/` folder. This is the same bug family as builds 2/3
(2026-08-29), recurring through a gap in the fix. **The ignore list needs a
fourth pattern** (something like `**/node_modules/react-native-maps/android/**`
scoped narrowly, not a blanket ignore) — not done this session, next session
should close it properly instead of relying on manual clean reinstalls.

**Fix applied**: `rm -rf node_modules apps/mobile-app/node_modules && npm
install` at the repo root, full clean reinstall, no config change. **Build 5
FINISHED both platforms**:

| Platform | Build ID | Duration | Build # | Artifact |
|---|---|---|---|---|
| Android | `1887f6c7-8da1-4fac-95bf-95285b3217af` | 9m3s | versionCode 8 | `https://expo.dev/artifacts/eas/J19podmvkO50TvB-eFC2_OT3heRXLF1Rkp-3q__8ZMM.aab` |
| iOS | `3fc9bbe2-9751-473c-8e9c-ef2a94ca4644` | 4m56s | build 5 | `https://expo.dev/artifacts/eas/UtapjdODiYk9auJVsljdq19ytmb94reI3Zvzo411IQs.ipa` |

**Neither has been submitted.** `eas submit` was not run this session.
`eas.json`'s `submit.production.ios` still has no `ascAppId` — the App Store
Connect app record now exists though (checked via browser: Apple ID
`6806756066`, bundle `in.co.caresy.app`), so add
`"ascAppId": "6806756066"` before running `eas submit --platform ios`.
Android submit needs `android/service-account.json`, unverified present.

**App Store Connect state, checked directly in the browser 2026-09-01/02** (not
from stale doc claims): version 1.0 sits at **Prepare for Submission**, build 3
already attached (needs re-attaching to build 5/8 after submit). Still blank:
Description, Keywords, Support URL, Copyright, App Review sign-in
username/password, App Review contact info and notes, Category, Age Ratings
(never started), App Privacy questionnaire (needs a live privacy policy URL
first), Pricing (not even set to Free). TestFlight itself is healthy — build 3
is "Testing", not stuck, 9 invites / 4 installs / 29 sessions; the "stuck
Waiting for Review" note elsewhere in this file is stale.

## Where things stand

**A production-readiness audit of the Android app found four defects that would
have shipped.** All are fixed on `fix/android-release-readiness` and proved by a
real build: **AAB versionCode 6**, `e8832079-871f-4b96-8a1f-d925e1d94ef1`,
FINISHED in 9m43s from commit `fbd9270`.

```
https://expo.dev/artifacts/eas/917P5She80TRTejpGo1lm2_Qm-oCB3OEKFf4d-mBoqM.aab
```

**Upload versionCode 6, not 4.** Uploading 4 spends 14 days of closed-test clock
on a build with a placeholder icon and dead push notifications.

~~Open a PR and merge the branch~~ — **done, merged into `main` via `c1bb340`.**
Work continues on `main` now; the branch itself is stale, do not push more to it.

### What was broken, and how it was caught

| Defect | Effect on a store build |
|---|---|
| `eval("require")` around `expo-device`, `expo-notifications`, `react-native-maps` | Metro bundles only what it can see statically, so all three were **absent from the production bundle**. Their `try/catch` wrappers swallowed it: push registration silently no-opped (`push_tokens` never got an Android row, so `api/cron/send-push` had nobody to deliver to) and the live-tracking map never rendered. |
| App icon, splash, notification icon | Expo's placeholder — a blue X on a design grid — on **both** platforms. |
| `expo-image-picker` defaults | `RECORD_AUDIO` + `WRITE_EXTERNAL_STORAGE` in the manifest. The listing would have advertised microphone access for an app with no audio feature. |
| `LargeSecureStore.getItem` | Threw when Android auto-backup restored session ciphertext without its SecureStore key — **a crash on every launch** after a device-to-device restore, unrecoverable short of reinstalling. |

The bundling one is the lesson. It is invisible in every log — the app started
fine and just did less. **A green build proves compilation, not content.** Two
checks now catch this class, both cheap:

```
# 1. Is the module actually in the app?
cd apps/mobile-app
npx expo export:embed --eager --platform android --dev false \
  --bundle-output /tmp/b.js --sourcemap-output /tmp/b.js.map --assets-dest /tmp/a
node -e "const s=JSON.parse(require('fs').readFileSync('/tmp/b.js.map')).sources;
  for (const p of ['expo-notifications','expo-device','react-native-maps'])
    console.log(p, s.filter(x=>x&&x.includes('/'+p+'/')).length)"
```

Any zero means the module is not in the app. Before: 0/0/0. After: 57/3/35.

```
# 2. What permissions does the MERGED manifest actually declare?
npx expo prebuild --platform android --no-install
grep -oE 'android:name="android.permission.[A-Z_]+"|tools:node="remove"' \
  android/app/src/main/AndroidManifest.xml
rm -rf android    # then re-check the fingerprint still matches — see below
```

`blockedPermissions` only takes effect at manifest-merge time, so `expo config
--type introspect` is not sufficient on its own. Verified: `RECORD_AUDIO`,
`CAMERA`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_VIDEO`,
`ACCESS_BACKGROUND_LOCATION` and `SYSTEM_ALERT_WINDOW` all carry
`tools:node="remove"`; kept are `INTERNET`, `ACCESS_COARSE/FINE_LOCATION`,
`READ_EXTERNAL_STORAGE`, `POST_NOTIFICATIONS`, `VIBRATE`.

**Always `rm -rf android` after a local prebuild and re-verify the fingerprint**
(`npx @expo/fingerprint fingerprint:generate --platform android` → currently
`cb55a65148f32d660543fe344dbd8a9773df17bd`). Leftover prebuild output is exactly
what broke builds 2 and 3. Confirmed clean after this session's prebuild.

Icons are now generated, not hand-placed: `apps/mobile-app/scripts/make-icons.py`
derives all six assets from `apps/website/public/icon-512.png`. Re-running it is
the whole update after a brand change. Verified the adaptive icon clears circle,
squircle and rounded-square launcher masks with 18% margin.

### Also landed this session

- Tracking screen polled every 10s with no `AppState` gate. Android keeps the JS
  thread alive when backgrounded, so it ran for the whole visit. Now pauses and
  ticks immediately on resume.
- `ErrorBoundary`'s "Restart" only cleared state, so a deterministic error
  re-threw at once and the button looked dead. Now `Updates.reloadAsync()`.
- Account deletion had no fetch timeout; notification channel raised to `HIGH`
  and created before the permission prompt; unguarded `console.debug` and a
  "Rebuild the dev client" alert removed.
- `lib/sessionCrypto.ts` extracted with `sessionCrypto.check.ts` — covers the
  wrong-key path, which is the actual failure mode, across 200 wrong keys plus
  truncated and corrupt input.
- Accessibility: raw `Pressable`s outside `@caresy/ui` had no
  `accessibilityRole`, so TalkBack read their text without announcing they were
  actionable. Added role/label/state to the location prompts, family rows and
  Remove, and the email/Google/WhatsApp buttons. Labels drop the decorative 📍
  and "G", which TalkBack otherwise reads aloud as words.

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

4. **Seed the App Review account — it is not optional.** A dedicated Gmail
   account was created 2026-08-31 (address is in your password manager, not
   here). A bare sign-up has no
   phone, no saved location and no booking, so a reviewer lands on an empty
   "My Bookings" and hits the Indian-mobile / served-pincode validation with
   nothing pre-filled — the exact wall the demo path exists to avoid, and an
   Apple 2.1 rejection. Fix:

   ```
   # apps/website/.env.local (gitignored) — also needs SUPABASE_SERVICE_ROLE_KEY,
   # which is set on Vercel production but MISSING from the local file
   DEMO_APP_REVIEW_EMAIL=...
   DEMO_APP_REVIEW_PASSWORD=...
   ```
   ```
   node --experimental-strip-types scripts/seed-app-review-demo.ts
   ```

   **This repo is public.** Neither value goes in a tracked file — the script and
   `docs/APP_REVIEW_NOTES.md` both read them from the environment and leave the
   credential lines blank. They belong in App Store Connect → App Review → Notes,
   in **Play Console → App content → App access** (Play asks too), and in a
   password manager. The old pair (`DemoAppReview2026!` on
   `app-review@caresy.co.in`) was committed in plaintext 2026-08-30 → 08-31;
   it is burned and that Supabase user is better deleted than left sitting.

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

**Superseded 2026-09-02 — build 5 exists with the new icon, rebuild is done, submit is not.**
See the section at the top of this file. The paragraph below (build 3, "rebuild
it") is what that build-5 rebuild was answering; kept for the history but do
not act on it — act on the 2026-09-02 section instead.

~~**The TestFlight build is not submittable — rebuild it.**~~ iOS v1.0.0 build 3 was
uploaded via Transporter and processed, but it predates the 2026-08-31 audit, so
it carries the placeholder icon, the missing-from-bundle push and maps modules,
and the backup-restore crash. Same commit fixes it:
`npx eas-cli build --platform ios --profile production`.

Every step below except the last two is account-holder work — they need Apple
credentials, which an agent must not enter.

1. **Confirm the Apple Developer Program membership is paid and active.** The
   Team ID `46CLB4HU9B` in `eas.json` does not prove it. Everything else is
   blocked on this. Check at developer.apple.com/account.
2. ~~**`SUPABASE_SERVICE_ROLE_KEY` on the website's production env (issue #8).**~~
   **Done — verified 2026-08-31 by probing production.** An unauthenticated
   `POST https://caresy.co.in/api/account/delete` returns **401 "Not signed in."**,
   not the 503 an unset key produces. In-app account deletion works, so Apple
   5.1.1(v) and the equivalent Play requirement are both satisfied. **Issue #8
   can be closed.** Note the key is set on Vercel but is *not* in the local
   `apps/website/.env.local` — the seed script needs it there too.
3. **Create the app record in App Store Connect**, then put its numeric
   `ascAppId` into `eas.json` under `submit.production.ios` — currently missing,
   and `eas submit` cannot run without it.
4. **Create an App Store Connect API key** for `eas submit`.
5. **Build**: `npx eas-cli build --platform ios --profile production`. First run
   prompts for Apple sign-in to generate the distribution certificate and
   provisioning profile — the account holder must do that part interactively.
6. ~~**App Review demo path**~~ — **built and merged** (Muse, `cc7839e`).
   `scripts/seed-app-review-demo.ts` + `docs/APP_REVIEW_NOTES.md`. The validator
   was correctly left alone: `isValidIndianMobile` stays India-only and
   `enforce_service_area()` still rejects out-of-area pincodes, so widening it
   would not have helped. **But the account must actually be seeded** — see
   "Blocked on you" item 4. The code existing is not the same as the reviewer
   having a working login.
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
- **#8 `SUPABASE_SERVICE_ROLE_KEY` — was real, now resolved.** It blocked the iOS
  submission: account deletion returned 503 and Apple explicitly tests that. The
  key is now set on production (probed 2026-08-31 → 401). "Can be done manually"
  was true; "not a real issue" was not. **Closable.**
- **#11** — a real code defect (failed notifications never retried), not testing.
  **Fixed and merged**: migration 44 plus bounded exponential backoff
  (5 attempts; 5/10/20/40/60 min) in `api/cron/send-push/route.ts`, with
  `retry.check.ts` alongside it.

So: the claim was right that most of these are manual or cosmetic, and wrong that
none of them matter. Both exceptions are now closed.

**And a third exception the issue tracker never had.** The four defects at the
top of this file were in shipped code, not in any issue. Push notifications had
never worked on a store build; nobody had filed that, because the app looked
fine. Absence from the tracker is not evidence of absence.

## Mobile release — real state

| | Android | iOS |
|---|---|---|
| Keystore / signing | **exists**, EAS credentials `tX_VA-aRur` — issue #19's "not started" was stale | distribution cert generated during the build that produced TestFlight build 3 |
| Builds ever | 1 development + 4 production (versionCode 2, 3 failed; **4 and 6 FINISHED**) | 1 dev simulator + 1 production (v1.0.0 build 3, on TestFlight) |
| Latest good build | **versionCode 6** — the only one with the audit fixes | build 3 — **predates the fixes, do not submit** |
| Submissions ever | zero | uploaded to TestFlight, not submitted for review |
| Gate | 12 testers × 14 **continuous** days (personal Play account) | none — TestFlight internal is instant |
| Play/ASC account | registered and verified | paid membership **unconfirmed** — the Team ID in `eas.json` does not prove it |
| Testers | 14 people available (need 12; 2 spares absorb dropouts) | n/a |

**Start the Play clock as early as possible** — it is the only thing that cannot
be accelerated. Upload versionCode 6; it is ready. Seeding the review account
(item 4) is required for Play's App access section too.

iOS still needs `ascAppId` in `eas.json` and an App Store Connect API key.
Already satisfied and verified in source: Sign in with Apple (4.8), in-app
account deletion (5.1.1(v), `app/account-delete.tsx`, and the production endpoint
now returns 401 not 503), export compliance, privacy manifest, permission
strings.

Watch for: App Review works from the US, but the booking flow validates an Indian
mobile (`isValidIndianMobile`) and the service area is Noida. The demo path
exists — but only works once the account is seeded.

### Deliberately not done — do not treat as oversights

- **R8/ProGuard stays off.** Turning on minification days before a release risks
  a crashing build from a missing keep-rule, and the JS bundle (5.6 MB) dominates
  size anyway. Do it after the clock starts, verified with a preview build.
- **No crash reporting.** A JS error caught by `ErrorBoundary` is invisible to
  you — Play's Android vitals only sees native crashes and ANRs. Adding
  Crashlytics or Sentry needs an ADR and a new runtime dependency.
- **The duplicate React is still there**, for the reasons at the top of this file.
- **No offline detection.** Offline surfaces error alerts, which is acceptable
  degradation; `NetInfo` would be a new dependency.

## Muse coordination

Muse's `feature/app-review-demo-path` (`cc7839e`) is **merged to `main`**. It was
checked for the one thing that could have gone wrong silently: Muse branched
before `#45` landed and both touched `api/cron/send-push/route.ts`, so a careless
merge would have quietly deleted `#45`'s Telegram batch digest and SENDING-leak
fix. It did not — `formatTelegramBatchForRows`, the `adminRows >= 4` digest and
the retry backoff are all still present, and migrations 44 and 45 are both there.

The earlier `feature/admin-hardening` worktree at
`/Users/1234/Documents/caresy_admin_worktree` is also merged. Ground rules live
in `docs/PARALLEL_WORK.md` §1, including two added on 2026-08-29:

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

1. **#19** Play Store — the 14-day clock. **Unblocked**: versionCode 6 is built
   and verified. Merge the branch, upload, seed the review account, start it.
2. **#5** walk the money loop on two phones — never done by a human, step 5 of
   `docs/CURRENT.md`'s pre-launch list
3. **#6** walk cancel and reschedule on two phones
4. **#7 / #9** UPI VPA (works cash-only by design) and the `patient-docs` bucket
   — manual dashboard work. **#8 is closable** (verified set on production).
5. Cleanup: #10, #12, #21, #22, #23. **Closed this week: #8, #11, #18, #20.**
   #20's companion half landed in `cc7839e` but silences lint by duplicating each
   `fetch` body into a new `useEffect` while leaving the original function in
   place — three files now hold the same query twice. Worth reverting to the
   `useCallback` form.

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
- **Android has never been booted at all**, simulator or device. Everything
  verified on 2026-08-31 was verified statically — bundle sourcemaps, the merged
  manifest, generated resources, fingerprint hashes. That is strong evidence the
  code is now *present and correct*, and no evidence at all that push
  notifications actually arrive on a handset. **Install versionCode 6 on a real
  phone and confirm a push lands** before assuming that pipeline works end to end.

- The working tree was **reset mid-session on 2026-08-30**, silently discarding a
  full set of uncommitted edits that then had to be redone from scratch. Commit
  early (§1.10) — and on restart, verify the tree state before trusting any
  handoff note, including this one.
