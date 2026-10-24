# Google Play release — closed testing runbook

_Started 2026-08-29. Issue #19. App: `apps/mobile-app` (Expo, ADR-0009)._

The binding constraint is **not** engineering. A personal/individual Play
developer account must run a closed test with **at least 12 testers opted in
continuously for 14 days** before Google will even accept an application for
production access. The 14 days are wall-clock and cannot be compressed. Every
engineering task below takes hours; the clock takes two weeks. **Start the clock
first, polish second.**

> **⚠️ Check the account type before doing any of that (noted 2026-10-23).**
> Google scopes the 12-tester/14-day rule to **personal developer accounts
> created after 2023-11-13** — "Google Play requires personal developer accounts
> created after November 13, 2023, to test their apps before those apps are
> eligible for distribution on Google Play"
> (support.google.com/googleplay/android-developer/answer/14151465).
> **Organization accounts are not subject to it.** Caresy is registering as
> CARESY COMPANION SERVICES (OPC) PRIVATE LIMITED and now has a D-U-N-S
> (312183790), so if this account is an organization account — or gets converted
> to one — the whole 14-day clock and the 12-tester hunt below are moot and the
> AAB can target production directly. **Confirm the account type in Play Console
> → Settings → Developer account → Account details before spending two weeks on
> a closed test.** Everything from "Order of operations" down assumes a personal
> account and only applies if that is what this one turns out to be.

## What is already true (verified 2026-08-29, not assumed)

| Thing | State |
|---|---|
| EAS project | `f1c994af-5e87-43f4-8d64-f33366e6756d`, logged in as `caresy` (Owner) |
| Android package | `in.co.caresy.app` |
| Production profile | `app-bundle` (AAB — correct for Play), `autoIncrement: true`, `appVersionSource: remote` |
| Remote `versionCode` | 5 (2 and 3 failed on fingerprint; **4 is the good AAB**; 5 failed on a since-reverted dependency change) |
| Prior Android build | development 2026-08-14; production versionCode 4, 2026-08-29, **succeeded** |
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

## The versionCode 4 AAB must not be shipped — rebuild first (2026-08-31)

A production-readiness audit found four defects in the code that AAB was built
from. Fixed on `fix/android-release-readiness`; **the next AAB is the first one
that should reach testers.** Uploading versionCode 4 would burn 14 days of the
closed-test clock on a build with a placeholder icon and no working push.

| Was broken | Effect on a store build |
|---|---|
| `eval("require")` around `expo-device`, `expo-notifications`, `react-native-maps` | Metro never bundled them. Push registration silently no-opped, so `push_tokens` stayed empty for Android and `api/cron/send-push` had nothing to deliver to. The live-tracking map never rendered. |
| App icon, splash, notification icon | Expo's placeholder — a blue X on a design grid — not the Caresy mark. |
| `expo-image-picker` default permissions | `RECORD_AUDIO` + `WRITE_EXTERNAL_STORAGE` in the manifest, so the listing advertised microphone access for an app with no audio feature. |
| `LargeSecureStore.getItem` | Threw when Android auto-backup restored the session ciphertext without its SecureStore key — a crash on every launch after a device-to-device restore. |

The bundling one is invisible in every log: the modules were wrapped in
`try/catch`, so the app started fine and just did less. It was caught by reading
the sourcemap of a production bundle, which is the check worth repeating after
any dependency change:

```
npx expo export:embed --eager --platform android --dev false \
  --bundle-output /tmp/b.js --sourcemap-output /tmp/b.js.map --assets-dest /tmp/a
node -e "const s=JSON.parse(require('fs').readFileSync('/tmp/b.js.map')).sources;
  for (const p of ['expo-notifications','expo-device','react-native-maps'])
    console.log(p, s.filter(x=>x&&x.includes('/'+p+'/')).length)"
```

Any zero there means the module is not in the app, however clean the build log.

Note the fingerprint changed with `app.json`, so the new build gets a new runtime
version — expected, and the reason this ships as a store build rather than OTA.

## Order of operations

Steps 1–4 are the clock. Do them in one sitting.

### 1. Build a production AAB — **DONE 2026-08-29, superseded — rebuild**

First successful production AAB: build `6aee612a-2897-4b66-9a5d-ac94e9f3aefa`,
**versionCode 4**, 14m22s, runtime version `f54cd506…`, from commit `7122c60`.

```
https://expo.dev/artifacts/eas/K4A0JA8Nd1j-OMAUEWWrVKtnjxGf99wvcPg95SvsOKU.aab
```

It is signed with the existing keystore and carries the Supabase credentials, so
it is uploadable to a Play track as-is. Kept below is why the two earlier
attempts (versionCode 2 and 3) failed, because the failure mode recurs silently.

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

**Check before every production build.** Two cheap local gates, together ~2
minutes, that catch the two ways this project's builds have actually failed —
run both before spending a `versionCode`:

```
cd apps/mobile-app
npx eas-cli fingerprint:compare --build-id 6aee612a-2897-4b66-9a5d-ac94e9f3aefa
npx expo export:embed --eager --platform android --dev false
```

The first catches the fingerprint mismatch above. The second is the exact command
EAS runs in its EAGER_BUNDLE phase — it caught a broken dependency tree on
versionCode 5, after a lockfile refresh left `@expo/metro-runtime` unresolvable.
Exit 0 on both means the build will get past the phases that have bitten us.

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

- **2026-10-24 (later)** — **Chain unblocked up to the payments profile.**

  1. Search Console **Domain** property for `caresy.co.in` created under
     `caresy.co@gmail.com` and **auto-verified** ("Verification method: Domain
     name provider"). TXT on `@` confirmed live from both 8.8.8.8 and 1.1.1.1:
     `google-site-verification=rwiCis5BsAVlIiw4r-xffxYA7u14X-K8coj6kGZW1Mc`.
     Nameservers are GoDaddy (`ns49/ns50.domaincontrol.com`).
     Note: do not remove that TXT record — verification lapses if it goes.
  2. Play Console → Account details → "Send verification request" then returned
     **"Website verified"** immediately (no email round-trip, because Search
     Console ownership already existed).
  3. **"Change account type" is now enabled.**

  **Where it now stands, and the thing the runbook never said:** the D-U-N-S is
  *not* entered in Play Console. The conversion flow requires linking a **Google
  payments profile** that holds the organisation's legal name, address and
  D-U-N-S — Play reads them from there. No organisation payments profile exists
  on this account; the dialog offers only "Create new payments profile". That
  creation needs Indian tax identity (PAN, probably GSTIN/CIN) and is the
  account owner's step, not an automatable one.

  Remaining after the payments profile exists: link it, verify a public
  developer-profile phone + email by code, verify a private contact phone +
  email by code, then resubmit the app against issue
  `4989587713359237569`.

  Caution carried forward: Google matches the profile's legal name and address
  against the D&B record behind D-U-N-S 312183790. The address supplied by the
  user is Shopno-5 Ramavtar Complex, Sector-2 Greater Noida, Dadri, Gautam Budh
  Nagar, Uttar Pradesh 203207 — if D&B holds a different spelling, D&B wins.

- **2026-10-24** — **Read the Play Console directly for the first time. Several
  things in this runbook were wrong.**

  **The app was rejected on 2026-09-06** and nothing in this repo recorded it.
  Policy centre, issue `4989587713359237569`: *"Your app is not compliant with
  the Play Console Requirements policy. Some types of apps can only be
  distributed by organizations. You have selected an app category or declared
  your app offers certain [features requiring an] organization account."*
  Status: "App not available on Google Play", enforced Sep 6. The developer
  account itself has no policy issues — this is app-level.

  **So the account type is not an optimisation, it is the blocker.** The
  account (`abhiiiiiisshek`, ID `5083717952522204612`, owner
  `caresy.co@gmail.com`, Google account `/u/2`) is **Personal**. Caresy cannot
  ship from a personal account at all, whatever the closed-test clock does.

  **The unlock chain, verified by clicking through it:**

  1. Search Console ownership of `caresy.co.in` — **does not exist**; the
     property list under `caresy.co@gmail.com` is empty.
  2. → Play Console → Account details → Website: "Send verification request"
     (requires 1 to exist first).
  3. → "Change account type" stops being greyed out. Its tooltip: *"To change
     your account type, provide and verify a website for your organization
     below."*
  4. → organisation verification, where the D-U-N-S (312183790) finally goes.
  5. → resubmit the app.

  **In progress:** a Search Console *Domain* property for `caresy.co.in` is
  pending DNS verification. Domain (not URL-prefix) was chosen because it also
  covers `companion.` and `admin.caresy.co.in`, needs no deploy, and does not
  depend on the unpushed commits. Registrar is **GoDaddy**, which Search
  Console can verify automatically via OAuth, or manually with TXT on `@`:
  `google-site-verification=rwiCis5BsAVlIiw4r-xffxYA7u14X-K8coj6kGZW1Mc`.
  Verification itself is the user's step (GoDaddy credentials / OAuth grant).

  Current account legal name and address are the *personal* ones
  (ABHISHEK SHARMA, 754a/16 lakhpat colony-2 Mithapur, Delhi - 110044) and come
  from the Google payments profile; the organisation details in the D-U-N-S
  record will have to match whatever D&B holds, not these.

- **2026-10-23** — Cleared the Android export blocker. `expo export --platform
  android` had been failing on `Unable to resolve module
  @expo/ui/jetpack-compose`. It was never a missing package: `@expo/ui` is a
  hard dependency of `expo-router` 57.0.21, npm installed it nested under
  `node_modules/expo-router/node_modules/`, and `metro.config.js`'s
  `disableHierarchicalLookup = true` stops Metro from walking into a nested
  copy. Declaring `"@expo/ui": "~57.0.18"` in the app's `package.json` hoists it
  to the workspace root, which is in `nodeModulesPaths`. Same line added to
  `apps/admin-app`, which had the identical latent bug. Gates re-run after the
  dependency change: android export exit 0, sourcemap check passes for
  `expo-notifications`/`expo-device`/`react-native-maps`/`@expo/ui`, local
  android fingerprint `a98ed55d8a93868d17d6f2f461d59ba796548304`, no uncovered
  node_modules pollution (`react-native-maps/android/` holds only tarball files
  plus `build/`, already in `fingerprint.config.js`). **Still blocking the
  store, both browser-gated:** Play Console organisation verification (D-U-N-S
  312183790 on hand, not yet entered) and `android/service-account.json`, which
  does not exist, so `eas submit --platform android` cannot run and uploads stay
  manual.
- **2026-10-23** — First Android production AAB carrying the storageKey fix
  (`10f8bee`). Build `4c086bc3-b224-4361-ad6b-8183b003c2fa`, **versionCode 10**
  (auto-incremented from 9), signed with the existing keystore
  `tX_VA-aRur (default)`, app version 2.0.1.
  Artifact: `https://expo.dev/artifacts/eas/K9GZCTBm92Ty8_FBfw9uQVuLEBfNkegsoJ2L9F4yu7g.aab`
  Logs: `https://expo.dev/accounts/caresy/projects/caresy/builds/4c086bc3-b224-4361-ad6b-8183b003c2fa`
  Not submitted — `eas submit` still blocked on the missing service account, so
  this AAB needs a manual upload through the Play Console.

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
