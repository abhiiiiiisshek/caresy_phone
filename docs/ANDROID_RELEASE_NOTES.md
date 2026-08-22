# Android Release — Finalisation Notes

_2026-08-22 · `apps/mobile-app` is now feature-complete for Play Store closed testing. This file is the handoff for the first EAS production build._

## What was finalised

| Area | Before | After |
|---|---|---|
| Booking | plain text hospital, format-only pincode | autocomplete (50 hospitals, `lib/hospitals.ts`), `pincodeForArea` autofill, debounced `checkPincodeServed` with inline served hint |
| My Bookings | cancel + track only | cancel + **reschedule** (new `app/reschedule.tsx`) + track |
| Screens | 4 (Home, Booking, My Bookings, Tracking) | 8 (added Profile, Quick Help, Care, Reschedule) |
| Account deletion | missing (Play blocker) | `app/profile.tsx` → `request_account_deletion` RPC (clears Play requirement for Android) |
| Push | not wired | `lib/notifications.ts` + `_layout.tsx` registrar, `expo-notifications` dep, Android channel, `push_tokens` upsert |
| Build | no `eas.json`, no versionCode/permissions | `app.json` versionCode 1 + permissions + `extra.eas`, `eas.json` (development/preview/production), `google-services.json` wired |
| Home | 2 quick actions | 4 (Bookings, Urgent help, Care guides, Profile) + WhatsApp row |

## Still deferred (acceptable for closed testing)

- Inline map: Booking `latitude/longitude = null`, Tracking is deep link to Google Maps. Add `expo-location` + `react-native-maps` later; permissions already in `app.json`.
- Document upload: needs `expo-image-picker` + `patient-docs` Storage.
- Offline banner: `lib/useNetInfo.ts` infra added but not wired to `ErrorState` on each screen.
- Data Safety form: privacy URL exists (`caresy.co.in/privacy`), form fill still needed in Play Console.

## Play Console — do before first production upload

1. `expo install expo-notifications` (dependency already added to `package.json`, native side needs install) and `npm install`.
2. Set `extra.eas.projectId` in `app.json` from `eas init` (currently placeholder `caresy-mobile-placeholder`).
3. Create Supabase RPC `request_account_deletion()` (`auth.users` soft-delete) — referenced by `app/profile.tsx`. Add migration mirroring web parity.
4. Add `caresy://auth/callback` to Supabase Auth → Redirect allowlists.
5. Set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` in EAS secrets (`eas secret:create`).
6. `eas build --platform android --profile preview` → APK for internal QA.
7. `eas build --platform android --profile production` → AAB; Play App Signing enabled on first upload.
8. Play Data Safety form, content rating, and 12 × 14-day closed testers (personal account) — open the track now even if APK is not final.

## Verify before calling done

```
npx tsc --noEmit                          # in apps/mobile-app
node --experimental-strip-types packages/utils/src/serviceArea.ts  # if check used
expo start                                # on physical Android
  → Google sign-in (caresy:// redirect)
  → create booking (autocomplete + pincode hint + serve check)
  → reschedule + cancel (60-min windows, expires_at)
  → quick-help (booking_type='URGENT')
  → profile save + delete
  → my-bookings live meter + track share
  → push token in Supabase push_tokens
```

## Files touched (this finalisation)

```
apps/mobile-app/app.json            # versionCode, permissions, extra.eas
apps/mobile-app/package.json        # + expo-notifications
apps/mobile-app/eas.json            # new
apps/mobile-app/app/_layout.tsx     # PushRegistrar
apps/mobile-app/app/booking.tsx     # autocomplete + served-area
apps/mobile-app/app/index.tsx       # 4 quick actions
apps/mobile-app/app/my-bookings.tsx # reschedule
apps/mobile-app/app/profile.tsx     # new
apps/mobile-app/app/quick-help.tsx  # new
apps/mobile-app/app/care.tsx        # new
apps/mobile-app/app/reschedule.tsx  # new
apps/mobile-app/components/ui.tsx   # Field onFocus/onBlur
apps/mobile-app/lib/hospitals.ts    # new
apps/mobile-app/lib/notifications.ts# new
apps/mobile-app/lib/useNetInfo.ts   # new
apps/mobile-app/NATIVE_CHECKLIST.md # updated to 2026-08-22 state
docs/ANDROID_PARALLEL_WORKFLOW.md   # new (parallel track)
docs/ANDROID_RELEASE_NOTES.md       # this file
supabase/migrations/                # add request_account_deletion migration before production
```
