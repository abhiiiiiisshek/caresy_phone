# Caresy — Easy Words Recap (what's done, what's next)

Last updated: 2026-08-15

## What was wrong at start
- `npm run build` crashed — no build script.
- Tunnel `expo start` said “cannot connect” on same WiFi.
- Booking showed fake “companion is on the way” even for tomorrow.
- Hospital/pincode had no help, meeting point was just typing.
- Homepage had two equal buttons, urgent not clear as #1.
- Care Guide was just long text, no groups.
- Get Help just sent you to WhatsApp.
- Phone number in profile sent you to WhatsApp, not saved in app.
- No privacy file, no Apple sign-in, no TestFlight yet.

## What we fixed — in easy words

**1) Build & Tunnel — fixed**
- Added `build` and `typecheck` scripts. `npx tsc` now passes.
- Found working command: `npx expo start --tunnel` (tunnel goes over internet, so same-WiFi block doesn’t matter).

**2) Booking — now honest**
- “On the way” only when companion really started (has live location). For tomorrow: shows “Companion assigned for Tue 15 Mar”, not “on the way”.
- Hospital box now suggests names as you type, and fills pincode for you. Pincode shows green “✓ Serves this area” or red “not served”.
- Meeting point is 3 big cards: At home (uses your location), At hospital, Custom. At home asks for location permission and saves real lat/lng.

**3) Homepage — urgent is now king**
- First, biggest card: `Need help urgently?` (red, urgent). Second card: `Book a companion` (green, calm). No duplicate urgent button elsewhere.

**4) Care Guide — now useful**
- Cards have color top bar + icon, not plain boxes. Two filters on top: `All | Urgent | Daily care | Safety` and `Everyone | Older adults`. So older users see simple steps, others see quick cards.

**5) Get Help — now real help**
- New screen `/support` with FAQ (7 questions, tap to open) — WhatsApp/Call/Email only at bottom if you still need a human.

**6) Profile — phone stays in app**
- Tap Mobile number → type → Save → saved to `profiles.phone`. No WhatsApp redirect.

**7) Tracking — no more fake map**
- Before trip: “Location will be shared soon”. After companion starts: shows real map with pin + “Open in Maps”. Also listens live (Realtime) + still polls every 10s as backup.

**8) Store ready bits**
- Privacy file `PrivacyInfo.xcprivacy` + permission texts added.
- Account delete: Profile → Danger zone → Delete account → type DELETE → deletes your account and all data (Apple/Play need this).
- Apple login: button added on Home + Profile (iPhone only). Needs dev build to test.
- Native tools installed: maps, notifications, photo picker, location, Apple auth. Push is OFF in Expo Go (so no crash), ON after dev build.

## Files we changed (for your reference)
- `apps/mobile-app/package.json` — added build/typecheck, expo-location, notifications, maps, image-picker, apple-auth
- `apps/mobile-app/app.json` — location + notifications + Apple Sign-In + privacy strings
- `apps/mobile-app/lib/AuthProvider.tsx` — fixed tracking logic + added Sign in with Apple + push (now disabled in Expo Go)
- `apps/mobile-app/app/booking.tsx` — hospital search, pincode check, 3-card meeting point, location capture, photo picker
- `apps/mobile-app/app/index.tsx` — urgent first, scheduled second
- `apps/mobile-app/app/care/index.tsx` + `[slug].tsx` — richer cards, filters
- `apps/mobile-app/app/support.tsx` — new FAQ screen
- `apps/mobile-app/app/profile.tsx` + `app/account-delete.tsx` — inline phone edit + delete account
- `apps/mobile-app/app/tracking.tsx` — honest headline + map + Realtime
- `PrivacyInfo.xcprivacy` + `PRIVACY_ANSWERS.md`

## Checks we did
- `npx tsc --noEmit -p apps/mobile-app/tsconfig.json` → 0
- `bookingStatus.check: ok`

## What to do next — in order (easy steps)

**Step 1 — See the new look (2 mins)**
```
npx expo start --tunnel --clear
```
Shake phone → Reload. Check homepage urgent on top, Care Guide chips, booking dropdown.

**Step 2 — Recreate Apple Services ID (5 mins, because you deleted it)**
- Apple Developer → Identifiers → New Services ID → `in.co.caresy.service` → Enable Sign in with Apple → Configure → Domains: `caresy.co.in`, `*.supabase.co` → Return URLs: `https://<your-project>.supabase.co/auth/v1/callback`
- Keys → New Key → Sign in with Apple → link that Services ID → download `.p8`
- Supabase → Auth → Providers → Apple → paste Services ID + Team ID + Key ID + `.p8` → Save

**Step 3 — Build the real app (so map/push/Apple/camera work)**
```
npx expo prebuild --clean
# then EAS:
eas build --platform ios --profile production
# after build: eas submit --platform ios  (goes to TestFlight)
```
You already have `bundleIdentifier in.co.caresy.app` and `projectId f1c994af-5e87-43f4-8d64-f33366e6756d`.

**Step 4 — Test after build**
- Install TestFlight / dev build → test Apple login, At home location, photo attach in booking, live map after companion starts, push notification.

**Step 5 — After that**
- We’ll re-enable push (one line in `AuthProvider.tsx`) and do Phase 6 ship steps.

---
If you run `/clear`, this file stays at `PROGRESS_EASY.md` — open it again.
