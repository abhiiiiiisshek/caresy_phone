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
- **Data collected:** Yes — Name, Phone, Precise location, Photos.
- **Data shared:** No.
- **Collected is optional?** Location/Photos are optional (only if user picks `At home` or attaches a doc). Phone is optional until booking.
- **Deletion:** Yes — in-app `Profile → Danger zone → Delete account` (`app/account-delete.tsx`) deletes `auth.users` cascades to all tables/buckets; website also `/account/delete` via `POST /api/account/delete`. Meets Apple 5.1.1(v) + Play.
- **Encryption in transit:** Yes (Supabase TLS).
- **Encryption at rest:** Yes (Supabase).

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
- Location is **not** tracked in background continuously — only set at booking (`At home`) and live-shared during an active visit (`trip:<id>` Realtime) to the booking's circle. No background-location permission is requested.
- Photos are user-initiated only, picked from the library. The app never opens the camera and requests no `CAMERA` permission on Android.
- Sign in with Apple is offered alongside Google (Apple 4.8) — see `lib/AuthProvider.tsx:signInWithApple`.
