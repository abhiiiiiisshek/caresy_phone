# Apple App Store release — runbook

_Started 2026-08-29. App: `apps/mobile-app` (Expo, ADR-0009). Companion doc:
`docs/PLAY_STORE_RELEASE.md`._

**iOS has no 14-day waiting period.** Unlike Play's 12-testers-×-14-days rule for
personal accounts, TestFlight *internal* testing is instant and needs no review.
So iOS can plausibly reach reviewers in a day, while Android is stuck behind a
fortnight of wall-clock. Run them in parallel; do not let iOS wait on Android.

## What is already true (verified 2026-08-29)

| Thing | State |
|---|---|
| Bundle identifier | `in.co.caresy.app` (same string as Android) |
| Apple Team ID | `46CLB4HU9B`, already in `eas.json` |
| iOS builds ever | one — `development` profile, 2026-08-14. **No store-distribution build has ever been produced.** |
| Submissions ever | zero, either platform (`eas submit:list` → `[]`) |
| `ascAppId` in `eas.json` | **missing** — `eas submit` needs it |
| Sign in with Apple | implemented, using Apple's own `ASAuthorizationAppleIDButton` (merged 2026-08-29) |
| Account deletion | present — `app/account-delete.tsx`, linked from Profile |
| Export compliance | `ITSAppUsesNonExemptEncryption: false` already set |
| Privacy manifest | `PrivacyInfo.xcprivacy` present |
| Permission strings | location / camera / photo usage descriptions all present in `app.json` |

## Guideline risks, and where this app stands

- **4.8 Sign in with Apple** — required because the app offers Google sign-in.
  **Satisfied.** This is why the button was switched to Apple's native control;
  a hand-styled lookalike is itself a rejection risk.
- **5.1.1(v) account deletion** — apps that create accounts must delete them
  in-app. **Satisfied.**
- **1.4.1 / medical claims** — Caresy is non-clinical: companionship, queue
  management, errands, documentation help. Keep the listing free of language
  implying medical care, diagnosis, or nursing. If the copy reads as healthcare,
  Apple will ask for regulatory documentation and the review stalls.
- **2.1 completeness / reviewer access** — see the trap below. This is the one
  that is actually likely to bite.

### The reviewer-access trap

App Review is done from Cupertino. A reviewer can sign in fine (Sign in with
Apple works anywhere), but **the booking flow validates an Indian mobile number**
(`isValidIndianMobile` in `packages/utils`) and the service area is Noida. A
reviewer entering a US number is blocked, sees a dead end, and files a 2.1
"unable to review" rejection.

Mitigation, in the App Review notes field:

> Caresy operates only in Noida, India. To review the booking flow, use the
> demo phone number +91 9999999999 and select any listed hospital. Sign in with
> Apple works with your own Apple ID; no separate account is needed.

Confirm before submitting that a number like that actually passes validation and
that a booking made with it does not page the real ops phone via ntfy.

## Order of operations

### 1. Confirm a paid Apple Developer Program membership

$99/year. A free Apple account also produces a Team ID, so the presence of
`46CLB4HU9B` in `eas.json` does **not** prove membership. Check at
developer.apple.com/account — without the paid programme, no store build,
no TestFlight, nothing.

### 2. Create the app record in App Store Connect

Bundle ID `in.co.caresy.app`. This yields the **App Store Connect app ID** (a
numeric string). Put it in `eas.json` under `submit.production.ios.ascAppId`,
alongside the existing `appleTeamId`, or every `eas submit` will prompt for it.

### 3. Create an App Store Connect API key

App Store Connect → Users and Access → Integrations → App Store Connect API.
Download the `.p8` **once** — it cannot be re-downloaded. Note the Key ID and
Issuer ID.

Do this rather than signing in with an Apple ID interactively: it makes builds
and submissions non-interactive, survives 2FA, and does not need a human at the
terminal. Treat the `.p8` as a secret; keep it out of the repo.

### 4. Build for the store

```
cd apps/mobile-app
npx eas-cli build --platform ios --profile production
```

EAS generates the distribution certificate and provisioning profile on first run
and stores them, the same way it already holds the Android keystore. This is the
first store-distribution iOS build the project has ever produced, so expect to
resolve credential prompts on this run.

### 5. Push to TestFlight

```
npx eas-cli submit --platform ios --latest
```

Then in App Store Connect → TestFlight:

- **Internal testing** — up to 100 members of your team, **no Apple review**,
  available within minutes of processing. This is where you actually test.
- **External testing** — up to 10,000 testers, but requires Beta App Review
  (usually a day). Only needed if you want testers outside the team.

For iOS you do **not** need 12 testers or 14 days. Internal TestFlight is enough
to get the app onto real devices immediately.

### 6. Submit for App Store review

Store listing, screenshots (6.7" and 6.5" required), privacy questionnaire
matching `PrivacyInfo.xcprivacy` and `PRIVACY_ANSWERS.md`, age rating, support
URL, and the review notes above. Typical turnaround is 24–48 hours.

## Sequencing against Android

| | Android | iOS |
|---|---|---|
| Gate | 12 testers × 14 continuous days | none |
| Testing route | Closed testing track | TestFlight internal (instant) |
| Blocking item today | build failing at `Configure expo-updates` | no store build ever attempted |
| Realistic first-device date | +1 day after clock starts | same day as a green build |

Start the Play clock first because it is the only thing that cannot be
accelerated, then spend the fortnight getting iOS through review and fixing what
TestFlight surfaces.

## Log

- **2026-08-29** — Runbook created. Verified account deletion, Sign in with
  Apple, export compliance and permission strings are all already in place;
  `ascAppId` is the one missing piece of config. No store build has ever been
  produced on this project for either platform.
