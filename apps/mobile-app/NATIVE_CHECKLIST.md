# Caresy Native App — completion checklist

Native-only Expo/React Native. Web app is the reference for business rules, data
contracts, and Supabase queries/RPCs — **not** for layout or components. This
file tracks what is built, what is deferred, and what must be restored before
store submission.

_Last updated: 2026-08-23 — corrected against actual repo/EAS state, several items below were stale (marked ⬜ while already built)._

## Design system

- `lib/theme.ts` — brand tokens (mirrors `packages/ui/theme.css` --m3-* palette), spacing, radius, type scale, shadow.
- `components/ui.tsx` — `Screen`, `FormScreen` (keyboard-aware), `Txt`, `Overline`, `Card`, `Button`, `Chip`, `ChipRow`, `Field`, `LoadingState`, `EmptyState`, `ErrorState`. Haptics + accessibility built in.
- `components/StatusPill.tsx` — booking status → brand-colored pill (shared Home + My Bookings).
- Status→label contract lives in `@caresy/utils/bookingStatus` (shared with web, has self-check).

## Screens

| Screen | State | Native UX | Notes |
|---|---|---|---|
| Home (`app/index.tsx`) | ✅ built | dashboard: greeting, hero CTA, next-visit peek, quick actions | signed-out branded welcome |
| Booking (`app/booking.tsx`) | ✅ built | 4-step form, progress bar, chips, inline errors, haptics | writes patients→locations→bookings (exact web contract) |
| My Bookings (`app/my-bookings.tsx`) | ✅ built | upcoming/past tabs, live meter, pull-to-refresh, cancel + track | states via design system |
| Tracking (`app/tracking.tsx`) | ✅ built | headline, companion card, live-location, trip timeline, native Share | polls `get_shared_tracking` 10s; token from Home/My Bookings |
| Quick Help (urgent) | ✅ built | 3-step wizard, progress, chips, pincode `checkPincodeServed`, WhatsApp CTA | mirrors `apps/website/src/app/quick-help/page.tsx`; Settings folds into Profile per `MOBILE_PLAN.md` Phase 2 |
| Profile (`app/profile.tsx`) | ✅ built | account info, activity links, help & support, sign out | folds Settings + Support per prior decision; read-only, "edit" routes to WhatsApp same as web |
| Care / Guides (`app/care/index.tsx`, `app/care/[slug].tsx`) | ✅ built | list + detail, no icons/thumbnails, plain cards | content moved to `packages/utils/src/careGuides.ts` (was website-only `apps/website/src/lib/careGuides.ts`) so web + native share one source; website's 3 call sites + self-check repointed |
| Account deletion (`app/account-delete.tsx`) | ✅ built | confirm form, signed-in gate | store-compliance blocker — resolved |
| Auth (`app/index.tsx` signed-out) | ✅ built | Google + Apple Sign-In, animated mascot | Apple entitlement present (`com.apple.developer.applesignin`), wired in `AuthProvider.tsx` |

## Deferred functionality (must restore before submission)

Client-side validation is UX only — **server-side/RLS enforcement remains authoritative**.

1. **Served-area enforcement** — Booking checks pincode *format* only
   (`isValidPincode`). Web also gates on `listServedAreas`/`checkPincodeServed`
   (injected SupabaseClient). *Why deferred:* format check unblocks the flow for
   NCR launch. *Restore:* before opening bookings outside serviced NCR pincodes.
2. **Hospital selection / autocomplete** — Booking uses a plain text field; web
   has `HospitalAutocomplete` over the hospitals catalog. *Why:* free-text still
   produces a valid booking. *Restore:* native searchable picker over the
   `hospitals` catalog before submission.
3. **Meeting-point / map location** — Booking sends `latitude/longitude = null`;
   web has a map picker (`MeetingPoint`). Companion Open-in-Maps falls back to the
   address string. *Why:* needs native maps + location permission. *Restore:*
   native map picker + `expo-location` permission flow.
4. ~~**Rescheduling**~~ — **done** (`feature/mobile-reschedule`, merged
   2026-08-22). Native `@react-native-community/datetimepicker` sheet in
   `my-bookings.tsx`; client-side gated to `booking_type === 'SCHEDULED'`
   only (urgent/INSTANT bookings can't be "rescheduled" — no fixed time to
   move). Not yet verified on Android — picker renders per-platform
   differently (`spinner` iOS vs native calendar/clock dialogs Android),
   see the Android verify task below.
5. **Embedded live map** — Tracking shows an "Open in Maps" deep link, not an
   inline map. Web embeds an OpenStreetMap iframe (no SDK). *Why deferred:* no
   WebView allowed; inline native map needs `react-native-maps` + platform config.
   *Restore:* `react-native-maps` (or Expo Maps) centered on `last_lat/last_lng`
   with a companion marker, before submission if live-location is a headline feature.
6. **Notifications** — `expo-notifications` not wired; push pipeline (Firebase
   config present) unproven on native. **Store-relevant.**
7. **Document / photo upload** — patient docs (`patient-docs` bucket). Needs
   native camera/file handling.
8. **Account deletion** — web `/account/delete`. **Store-compliance blocker.**

## Store-submission blockers (do NOT submit until done)

- [x] Sign in with Apple — entitlement + `signInWithApple` wired, both on the
      original companion-portal welcome screen and the ported `BeautifulAuth`
      screen (`7734a94`)
- [x] Push notifications — `expo-notifications` fully wired in
      `AuthProvider.tsx`: permission request, Android notification channel,
      `getExpoPushTokenAsync` → upserted to `push_tokens` (migration 21,
      delivered via `api/cron/send-push`). Not yet proven end-to-end on a
      real device (simulator can't receive real APNs/FCM pushes).
- [x] Account deletion in-app — `app/account-delete.tsx`
- [ ] Privacy / data-safety disclosures — iOS `PrivacyInfo.xcprivacy` exists
      and is filled in (not a stub — real `NSPrivacyAccessedAPITypes` /
      `NSPrivacyCollectedDataTypes` entries). **Still open:** Play Console
      Data Safety form (separate manual submission, not a code artifact) and
      a public privacy-policy URL for App Store Connect's listing metadata —
      confirm `apps/website/src/app/privacy` is live at a stable URL before
      submission.
- [x] Permissions strings — iOS: `NSLocationWhenInUseUsageDescription`,
      `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` all present
      in `app.json`. Android: `ACCESS_FINE/COARSE_LOCATION`, `CAMERA` via
      READ/WRITE_EXTERNAL_STORAGE, `RECORD_AUDIO` present in
      `AndroidManifest.xml`. **Corrected 2026-08-29 — this was a false
      alarm.** `POST_NOTIFICATIONS` and `CAMERA` are not declared in app.json
      because they do not need to be: `expo-notifications` and
      `expo-image-picker` each declare them in their own library
      `android/src/main/AndroidManifest.xml`, and Android's manifest merger
      folds library permissions into the final app manifest at build time.
      Verified by reading both library manifests. There is no `android/`
      directory to inspect in this repo (CNG/prebuild), which is likely what
      the original check misread.
- [ ] Offline / network-failure states across all screens — not audited this
      pass
- [ ] Accessibility pass (labels present via design system; needs audit)
- [ ] Production signing — iOS: `DEVELOPMENT_TEAM` (`46CLB4HU9B`) set in the
      Xcode project, `CODE_SIGN_STYLE = Automatic`, but that's the
      dev-profile signing — **no production/store-distribution build has
      ever been run** (`eas build:list` shows exactly one build, ever:
      `development` profile, internal distribution, 2026-08-14). Android
      keystore status unchecked this pass.
- [ ] Google Play closed testing (12 testers × 14 days, personal account) +
      **TestFlight — zero submissions exist** (`eas submit:list` returns
      empty). `eas.json` `submit.production.ios` still has
      `PLACEHOLDER_APPLE_ID` / `PLACEHOLDER_ASC_APP_ID` /
      `PLACEHOLDER_APPLE_TEAM_ID` — needs a real App Store Connect app record
      for `in.co.caresy.app` before this can be filled in.
- [ ] Real-device QA — iOS: simulator only so far, no physical device.
      Android: **never booted at all** — separate assigned task below,
      not started as of this update.

## Known open risk — `aps-environment` entitlement

`ios/Caresy/Caresy.entitlements` hard-codes `aps-environment` to
`development`. This is a static, checked-in bare-workflow file (no
Continuous Native Generation on every build), so it's unclear whether EAS
Build's credential service patches this automatically per build profile for
a bare project, or whether it needs to become `production` by hand before a
store build — get this wrong and push notifications silently fail at
runtime (Apple does not reject the binary for it, so nothing surfaces until
a real user reports missing pushes). **Do not blind-flip this value** —
changing it to `production` without confirming EAS's behavior risks breaking
the working `development`-profile signing that's currently fine. Needs
research before either build, see the TestFlight-prep task below.

### iOS submit credentials

`eas.json` carries only `appleTeamId` — the repo is **public**, so the Apple ID
stays out of it. Supply it at submit time instead:

```bash
EXPO_APPLE_ID=<apple-id-email> npx eas-cli submit -p ios --profile production
```

`ascAppId` is intentionally absent: no App Store Connect record exists yet for
`in.co.caresy.app` (the Developer-portal App ID "caresy trial" is a different
thing). EAS creates the ASC record on the first authenticated submit; pin
`ascAppId` afterwards only if you want submits to stop prompting.

## Not yet verified on device

Everything above is `tsc`-clean but **not yet run on a real device**. Native
functionality (auth redirect, haptics, keyboard, Supabase writes, safe-area) must
be tested on Android + iOS per the workflow. `npm run dev`/Metro not run in the
sandbox (CLAUDE.md forbids dev server here).
