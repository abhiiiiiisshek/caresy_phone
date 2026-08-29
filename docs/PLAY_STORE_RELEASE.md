# Google Play release — closed testing runbook

_Started 2026-08-29. Issue #19. App: `apps/mobile-app` (Expo, ADR-0009)._

The binding constraint is **not** engineering. A personal/individual Play
developer account must run a closed test with **at least 12 testers opted in
continuously for 14 days** before Google will even accept an application for
production access. The 14 days are wall-clock and cannot be compressed. Every
engineering task below takes hours; the clock takes two weeks. **Start the clock
first, polish second.**

## What is already true (verified 2026-08-29, not assumed)

| Thing | State |
|---|---|
| EAS project | `f1c994af-5e87-43f4-8d64-f33366e6756d`, logged in as `caresy` (Owner) |
| Android package | `in.co.caresy.app` |
| Production profile | `app-bundle` (AAB — correct for Play), `autoIncrement: true`, `appVersionSource: remote` |
| Remote `versionCode` | 3 (auto-incremented by two failed production builds; next build is 4) |
| Prior Android build | one, `development` profile, 2026-08-14, **succeeded** |
| Keystore | **Exists. Confirmed 2026-08-29** — build log: `Using Keystore from configuration: Build Credentials tX_VA-aRur (default)`. Nothing to generate. |
| Play Console account | registered and verified |
| Testers available | 14 people on hand (need 12; the extra 2 are the safety margin — see below) |
| `google-services.json` | present (FCM push) |
| Sign-in | Google + Apple OAuth via `supabase.auth.signInWithOAuth` and `signInWithIdToken`. **No phone OTP**, so a reviewer can sign in with their own Google account. |

## Keystore — already done, do not regenerate

EAS holds the upload keystore as build credentials `tX_VA-aRur (default)`, and
the 2026-08-29 production build used it. **There is nothing to create.** To see
its SHA-1 fingerprint: `npx eas-cli credentials -p android` (interactive — pick
the `production` profile, then the Keystore menu).

**Understand what the keystore actually is here.** With Play App Signing (on by
default for all new apps, and not optional for new apps since 2021) Google holds
the *app signing key* — the one end users' devices verify. Your keystore is only
the *upload key*, which Google checks at upload time and then re-signs with the
real key. The practical consequence: **losing the upload key is recoverable**
(Google can reset it from the Play Console), whereas in the pre-2021 world losing
your keystore meant losing the app forever. Let EAS keep managing it. Do not
generate one by hand with `keytool` and do not commit it.

## Order of operations

Steps 1–4 are the clock. Do them in one sitting.

### 1. Build a production AAB — **fixed 2026-08-29, not yet re-run**

Two attempts (versionCode 2 and 3) failed at the `Configure expo-updates` phase
~58s in. Cause found and fixed; the build has not been re-run since.

**Root cause: fingerprint runtime-version mismatch.**

```
Runtime version calculated on local machine: 139d9597536f4cabe1be1a4e897f3ac233ed470e
Runtime version calculated on EAS:           f54cd506e602721fdaecc48ff3a69d12f991e6d2
```

`app.json` sets `runtimeVersion: { policy: "fingerprint" }`. EAS hashes the
project locally, uploads that hash, then re-hashes on the builder and refuses to
build if the two disagree. The only real difference was the directory
`node_modules/react-native-maps` — a local Gradle run had left `.gradle/` and
`android/build/` inside it, and those do not exist in the builder's fresh
`npm install`. (The diff also lists an added `android` dir, but its hash is
`null`, so it contributes nothing.)

Fixed two ways, both committed:

1. Reinstalled the polluted package (`rm -rf node_modules/react-native-maps && npm install`).
   Local now computes `f54cd506…`, matching the builder exactly.
2. Added `apps/mobile-app/fingerprint.config.js` with `ignorePaths` for
   `.gradle/`, `android/build/` and `.cxx/` under `node_modules`, so the same
   pollution cannot break it again. Verified: recreating those directories
   leaves the hash unchanged. This matters because `expo run:android` recreates
   them every time.

**Check before every production build** — takes ~30s and catches this class of
failure before you burn a `versionCode`:

```
cd apps/mobile-app
npx eas-cli fingerprint:compare --build-id <last-successful-build-id>
```

**Reading a failed EAS build log.** The CLI reports only "Unknown error". Get the
real message from the log blob — note it is **brotli**, not gzip, which is why
earlier `gzip`/`zlib`/`deflate` decode attempts all failed:

```
npx eas-cli build:view <build-id> --json | python3 -c "import sys,json;print(json.load(sys.stdin)['logFiles'][0])" > /tmp/logurl
curl -sS -o /tmp/eas.br "$(cat /tmp/logurl)"        # no --compressed; curl cannot do br
node -e "console.log(require('zlib').brotliDecompressSync(require('fs').readFileSync('/tmp/eas.br')).toString())"
```

The signed URL expires in 15 minutes — re-run `build:view` to mint a new one.

**Supabase credentials — resolved 2026-08-29.** `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` are now set on the EAS `production` environment
(project scope, plaintext; both are client-side-public values that ship inside
the binary regardless). Without them a green AAB would have launched with no
database connection. Confirm before any tester upload:

```
npx eas-cli env:list --environment production
```

They do not sync from `.env.local` — change one, change both.

**Non-blocking, but noted:** `expo-doctor` fails 5 of 21 checks on the builder
(logged, does not stop the build): `newArchEnabled` is not a valid `app.json`
field on SDK 57; `eas-cli` is in `devDependencies` and should not be; duplicate
`react`/`react-dom` (19.2.3 in the app, 19.2.4 at the monorepo root); 16 packages
behind their SDK-57 versions; a `metro.config.js` override. The duplicate React
is the one worth fixing before shipping.

Command:

```
cd apps/mobile-app
npx eas-cli build --platform android --profile production
```

Roughly 25–30 minutes end to end when it works. The keystore already exists, so
there is no credential prompt.

### 2. Create the app in Play Console

Package name must be exactly `in.co.caresy.app` and **cannot be changed after
the first upload**. Free app. Declare it is not primarily for children.

### 3. Upload to a **Closed testing** track

Not internal testing — internal does not satisfy the 12×14 requirement. Create
a closed track (the default "Alpha" is fine), upload the AAB, and fill the
release notes.

### 4. Add the testers and get them opted in

Add all 14 email addresses to the closed track's tester list, then send each
person the opt-in URL Play generates for that track.

**A tester only counts once they have opted in via that link on the Google
account you listed.** Simply being on the list does nothing. This is where most
14-day clocks silently fail to start.

Track them here — the clock does not start until 12 of these say Yes:

| # | Name | Google account email | Opted in | Date |
|---|---|---|---|---|
| 1 |  |  | ☐ |  |
| 2 |  |  | ☐ |  |
| 3 |  |  | ☐ |  |
| 4 |  |  | ☐ |  |
| 5 |  |  | ☐ |  |
| 6 |  |  | ☐ |  |
| 7 |  |  | ☐ |  |
| 8 |  |  | ☐ |  |
| 9 |  |  | ☐ |  |
| 10 |  |  | ☐ |  |
| 11 |  |  | ☐ |  |
| 12 |  |  | ☐ |  |
| 13 |  |  | ☐ |  |
| 14 |  |  | ☐ |  |

**Clock started:** _____________  **Eligible to apply:** _____________ (start + 14 days)

### Why 14 people and not 12

The requirement is *continuous*. If a tester opts out, changes their Google
account, or is removed mid-window, you can drop below 12 and the clock resets or
stalls — and Google does not send a warning when it happens. Two spares absorb
one or two dropouts without restarting two weeks of waiting. Tell testers
explicitly: **do not uninstall or leave the test programme until told.**

Message to send each tester:

> You're testing Caresy on Android. Two things, both one-time:
> 1. Open <OPT-IN LINK> on your phone, signed in with <their email>, and tap
>    "Become a tester".
> 2. Install the app from the Play link on that page.
>
> Please keep it installed and stay in the programme for the next two weeks —
> Google counts testers continuously, and leaving early resets a 14-day clock
> for everyone. Open it now and then and tell me anything that looks wrong.

## Store listing items still needed

None of these gate the 14-day clock, so do them *while it runs*:

- Privacy policy URL (public, reachable). Content exists in
  `apps/mobile-app/PRIVACY_ANSWERS.md` but needs a live URL.
- Data safety form — must match `PRIVACY_ANSWERS.md` and the iOS
  `PrivacyInfo.xcprivacy` or the two stores contradict each other.
- Content rating questionnaire.
- App access: the app requires sign-in but **only via Google/Apple OAuth**, so
  state that any Google account works. No demo credentials needed. (If that ever
  changes to phone OTP, reviewers cannot receive an Indian SMS and a demo account
  becomes mandatory.)
- Feature graphic, screenshots, short/full description.

## Later: automated submission

`eas.json` already points `submit.production.android.serviceAccountKeyPath` at
`./android/service-account.json`, **which does not exist**. Until it does,
`eas submit` cannot run and uploads are manual through the Play Console UI —
which is completely fine for the first few. To automate later: create a service
account in Google Cloud for the Play project, grant it release permissions in
Play Console, download the JSON to that path. It is a secret; confirm it is
gitignored before it lands on disk.

## Log

- **2026-08-29** — Both production builds FAILED at `Configure expo-updates`
  (versionCode 2 and 3). Blocked pending the phase log. Keystore
  confirmed to already exist as EAS build credentials `tX_VA-aRur (default)` —
  issue #19's "keystore not started" was stale.
- **2026-08-29** — Runbook created. Confirmed keystore state indirectly (a
  successful signed Android build exists from 2026-08-14). Corrected two false
  "missing permission" entries in `NATIVE_CHECKLIST.md`: `POST_NOTIFICATIONS`
  and `CAMERA` come from the `expo-notifications` and `expo-image-picker`
  library manifests via Android's manifest merger, and need no app.json entry.
  Removed `android.usesCleartextTraffic: true` from `app.json` — no `http://`
  endpoint exists anywhere in the app source, so it was weakening the release
  build for nothing.
