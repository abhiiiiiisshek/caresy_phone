# Caresy — Privacy Answers (App Store + Play)

Use this verbatim for App Store Connect **App Privacy** and Play Console **Data Safety**.

## Tracking
- **Tracking across apps/websites:** No.

## Data collected (iOS App Privacy)

| Data type | Linked to user | Tracking | Purpose |
|---|---|---|---|
| Name | No | No | App functionality (profile greeting) |
| Phone number | Yes | No | App functionality (booking contact, OTP if phone auth) |
| Precise location | No | No | App functionality (meeting point, live trip sharing after companion starts) |
| Photos/Videos | No | No | App functionality (optional patient document: prescription/report) |

**How:** User-entered + device location only when `At home` is chosen (permission prompt). Location is written to `locations.latitude/longitude` and (when live) broadcast on `trip:<id>` to circle members only.

## iOS privacy manifest
- File: `apps/mobile-app/PrivacyInfo.xcprivacy` — `NSPrivacyTracking: false`, data types above, API reasons `C617.1` (FileTimestamp), `CA92.1` (UserDefaults), `35F9.1` (SystemBootTime).
- Strings in `app.json` `ios.infoPlist`: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, `NSUserNotificationUsageDescription`.

## Play Data Safety (answers)
- **Privacy policy URL:** `https://caresy.co.in/privacy` — now includes §5 Account & Data Deletion, §6 Children's Privacy, §7 Device Permissions (why each permission is needed, when triggered, optional/revocable, no background location).
- **Data deletion URL (Play Console → Data safety → Data deletion):** `https://caresy.co.in/account/delete` — dedicated web mechanism + in-app `Profile → Danger zone → Delete account` + email `privacy@caresy.co.in` (subject "Delete my data"), fulfilled within 7 days, instant on web/app. API: `POST https://caresy.co.in/api/account/delete`.
- **Data collected:** Yes — Name, Phone, Precise location, Photos.
- **Data shared:** No.
- **Collected is optional?** Location/Photos are optional (only if user picks `At home` or attaches a doc). Phone is optional until booking.
- **Deletion:** Yes — in-app `Profile → Danger zone → Delete account` (`app/account-delete.tsx`) deletes `auth.users` cascades to all tables/buckets; website also `https://caresy.co.in/account/delete` via `POST /api/account/delete`. Meets Apple 5.1.1(v) + Play (dedicated web URL now disclosed in policy §5 and footer).
- **Encryption in transit:** Yes (Supabase TLS).
- **Encryption at rest:** Yes (Supabase).
- **Children's data:** App is not directed to children. Family/patient data may rarely include a minor when an adult guardian books — guardian consent required (policy §6). No child accounts allowed.

## Android permissions (Play Console will list these)
`INTERNET`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `READ_EXTERNAL_STORAGE`
(pre-Android 13 photo picking only), `POST_NOTIFICATIONS`, `VIBRATE`.

Pinned explicitly in `app.json` `android.permissions`. Without that list Expo
inherited `RECORD_AUDIO` and `WRITE_EXTERNAL_STORAGE` from `expo-image-picker`'s
defaults — a microphone permission on the store listing for an app that has no
audio feature. `android.blockedPermissions` now strips those plus
`READ_MEDIA_VIDEO`, `ACCESS_BACKGROUND_LOCATION` and `SYSTEM_ALERT_WINDOW`, so
none of them can creep back in via a library manifest merge. Re-check the
resolved list after adding any native module:

    npx expo config --type introspect

## Notes for reviewer
- Location is **not** tracked in background continuously — only set at booking (`At home`) and live-shared during an active visit (`trip:<id>` Realtime) to the booking's circle. No background-location permission is requested. Policy §7 explicitly discloses ACCESS_COARSE/ FINE_LOCATION purpose, trigger (At home + live trip), and that ACCESS_BACKGROUND_LOCATION is blocked.
- Sensitive permissions in-app disclosure: each permission (Location / Photos / Camera / Notifications) shows a purpose string before the system dialog (app.json `NSLocationWhenInUseUsageDescription` / `NSPhotoLibraryUsageDescription` / `NSCameraUsageDescription` + policy §7). All are optional and revocable in Settings — denying only disables that feature.
- Photos are user-initiated only, picked from the library. The app never opens the camera and requests no `CAMERA` permission on Android (see §7 — iOS camera remains for capture, Android cameraPermission: false). Play Data Safety should list no Camera data collected on Android.
- Children's Privacy: app is not child-directed; minor patient data only via guardian booking with consent (policy §6). Requires `Target audience: Adults / Families` in Play Console, not children.
- Sign in with Apple is offered alongside Google (Apple 4.8) — see `lib/AuthProvider.tsx:signInWithApple`.
