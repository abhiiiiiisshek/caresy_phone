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
| Remote `versionCode` | 1 — next production build becomes 2 |
| Prior Android build | one, `development` profile, 2026-08-14, **succeeded** |
| Keystore | **almost certainly already exists on EAS** — that Android build could not have been signed without one. Confirm with the command below. |
| Play Console account | registered and verified |
| Testers available | 14 people on hand (need 12; the extra 2 are the safety margin — see below) |
| `google-services.json` | present (FCM push) |
| Sign-in | Google + Apple OAuth via `supabase.auth.signInWithOAuth` and `signInWithIdToken`. **No phone OTP**, so a reviewer can sign in with their own Google account. |

## Keystore — read this before generating anything

**Do not create a new keystore if one already exists.** Confirm first:

```
cd apps/mobile-app
npx eas-cli credentials -p android
```

That is an interactive menu — pick the `production` build profile, then
`Keystore: Manage everything needed to build your project`. If it shows an
existing keystore with a SHA-1 fingerprint, you are done; write the fingerprint
into this file's log at the bottom and move on.

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

### 1. Build a production AAB

```
cd apps/mobile-app
npx eas-cli build --platform android --profile production
```

Roughly 25–30 minutes end to end based on the 2026-08-14 run (17 min queued,
12 min building). If no keystore exists, this is the point where EAS offers to
generate one — accept.

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

- **2026-08-29** — Runbook created. Confirmed keystore state indirectly (a
  successful signed Android build exists from 2026-08-14). Corrected two false
  "missing permission" entries in `NATIVE_CHECKLIST.md`: `POST_NOTIFICATIONS`
  and `CAMERA` come from the `expo-notifications` and `expo-image-picker`
  library manifests via Android's manifest merger, and need no app.json entry.
  Removed `android.usesCleartextTraffic: true` from `app.json` — no `http://`
  endpoint exists anywhere in the app source, so it was weakening the release
  build for nothing.
