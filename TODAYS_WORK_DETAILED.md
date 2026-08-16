# Today's Work — Detailed Log (2026-08-15) — Phases 3/4/5

Branch: `caresy_m3_worktree` | Tunnel: `npx expo start --tunnel` | `tsc` 0, `bookingStatus.check: ok`

## Timeline

### Morning — Build & Tunnel (Phase 3 unblock)
- **Problem:** `npx tsc -p apps/mobile-app/tsconfig.json` was ok, but `npm run build -w @caresy/mobile-app` → `Missing script: build`
- **Fix:** [apps/mobile-app/package.json:38](apps/mobile-app/package.json) added `"build": "expo export", "typecheck": "tsc --noEmit"`
- **Tunnel:** `npx tsc` passed, `npm run build` fixed; user found `npx expo start --tunnel` works on same WiFi (firewall off). Logged to `personal_project/notes.md`.
- **QA Flow:** Created [apps/mobile-app/QA_FLOW.md](apps/mobile-app/QA_FLOW.md) — 40 numbered steps (pre-flight → auth → home → booking → my-bookings → tracking → profile → care → cross-cutting)

### Midday — Your Booking Feedback (8 points)
You reported: hospital autocomplete missing, pincode autofill missing, meeting point should be At home vs At hospital with location, hero cards need gradient, urgent missing on homepage, message companion WhatsApp, “on the way” shown for tomorrow, fake shared location, FAQ missing, phone number via WhatsApp, Care Guide lifeless.

**Fixes applied:**

1. **Tracking honesty (P0)**
   - [packages/utils/src/bookingStatus.ts:60](packages/utils/src/bookingStatus.ts) `trackingHeadline`/`trackingSteps` now accept `opts {scheduled_start_time, hasLocation, tripStarted}`. `ASSIGNED/ACCEPTED` without live loc → `Companion assigned for Tue 15 Mar` or `Companion assigned — location will be shared when trip starts`; only `on the way` when `hasLocation`. Legacy call (no opts) keeps old string so check stays green.
   - [apps/mobile-app/app/tracking.tsx:32,65,132](apps/mobile-app/app/tracking.tsx) passes opts, headline via opts, location card → `Location will be shared soon` + gated `Open in Maps`.

2. **Booking form (P1)**
   - Copied [apps/website/src/data/hospitals.ts](apps/website/src/data/hospitals.ts) → [apps/mobile-app/lib/hospitals.ts](apps/mobile-app/lib/hospitals.ts) (456 lines)
   - [apps/mobile-app/app/booking.tsx](apps/mobile-app/app/booking.tsx): hospital Field → autocomplete dropdown (6 suggestions, tap fills `pincodeForArea`), `checkPincodeServed(supabase)` live badge `✓ Serves …` / `✗ not served`, meeting point 3-card grid `At home (Use my location) | At hospital | Custom`, visual `optAccent` on service/transport cards.
   - [apps/mobile-app/components/ui.tsx:148](apps/mobile-app/components/ui.tsx) Field now supports `onFocus/onBlur` for dropdown.

3. **Homepage hierarchy (P2 + Review #1)**
   - [apps/mobile-app/app/index.tsx:101,198](apps/mobile-app/app/index.tsx): `Need help urgently?` became primary — first, biggest (`display`, `minHeight 190`, `urgentBg`, double glow, `Immediate response` overline), `Book a companion` second (green, calm). Removed duplicate urgent near My Bookings; quick actions → `My bookings | Care guides | Get help → /support | Profile`. Added `Platform.OS === 'ios' ? glassIos : actionAndroid` adaption.

4. **Care Guide (P3 + Review #2/3)**
   - [apps/mobile-app/app/care/index.tsx:9](apps/mobile-app/app/care/index.tsx): `GUIDE_META` (12 guides mapped to cat `Urgent/Daily care/Safety` + audience `Everyone/Older adults` + icon/tint), chips `CATS`/`AUD` filters, cards with `cardAccent` tint + `iconBadge` + meta `cat · audience`, `cardIos` vs `cardAndroid`.
   - [apps/mobile-app/app/care/[slug].tsx:21](apps/mobile-app/app/care/[slug].tsx): detail `Card` hero with `heroBar`.

5. **Get Help (Review #4)**
   - New [apps/mobile-app/app/support.tsx](apps/mobile-app/app/support.tsx): FAQ-first (7 Q/A, category chips `All/Service/Booking/Pricing/Coverage/Tracking`, expandable), escalation at bottom `Chat on WhatsApp / Call / Email`. Replaces aggressive WhatsApp redirects.

6. **Profile phone (P4 + Review #5)**
   - [apps/mobile-app/app/profile.tsx:41,97](apps/mobile-app/app/profile.tsx): `Mobile number` row → inline `Field + Cancel/Save` → `supabase.from('profiles').update({phone: toE164})`, validated `isValidIndianMobile`. No WhatsApp.

7. **Booking visuals (Review #6)**
   - Service cards `optAccent` top bar, meeting point `meetGrid`/`meetCard` visual choice, pincode/location hints (`locError`, `coords`).

8. **Platform-aware (Review #7)**
   - Homepage, care cards, quick actions branch `Platform.OS === 'ios'` → translucent `rgba(255,255,255,0.92)` (Liquid Glass direction) vs Android outlined + `elevation:1`.

### Afternoon — Phase 3 Leftovers → Wrap
- **At-home real coords:** [apps/mobile-app/app/booking.tsx:16,77,129](apps/mobile-app/app/booking.tsx) added `expo-location@~19.0.7` (dynamic `require` to keep `tsc` green), `coords` state, `requestLocation()` (`requestForegroundPermissionsAsync` + `getCurrentPositionAsync`), auto on `meetMode==='home'`, insert `latitude/longitude` into `locations` (only for home), errors shown inline.
- **Config:** [apps/mobile-app/package.json:18](apps/mobile-app/package.json) `expo-location`, [apps/mobile-app/app.json:32](apps/mobile-app/app.json) `expo-location` plugin with permission strings. `tsc` 0, `bookingStatus.check` ok after legacy fallback fix for `activeIdx`.

### Evening — Phase 4 Native Scaffold
- Installed with `npm install --cache /tmp/npm-cache --workspace=@caresy/mobile-app` (30 packages, 23s):
  - `expo-notifications@~0.32.12`, `expo-image-picker@~17.0.8`, `react-native-maps@1.20.1`, `expo-apple-authentication@~8.0.7` (+ already `expo-location`)
- [apps/mobile-app/app/tracking.tsx:4,32,147](apps/mobile-app/app/tracking.tsx): lazy `MapView/Marker` (`require('react-native-maps')` guarded), `MapView` 180dp + `Marker` when `hasLocation`, Realtime `supabase.channel('trip:'+token).on('broadcast', {event:'location'})` + 10s poll fallback, `mapWrap` styles.
- [apps/mobile-app/lib/AuthProvider.tsx:6,48](apps/mobile-app/lib/AuthProvider.tsx): push `Notifcations.getPermissionsAsync` → `getExpoPushTokenAsync({projectId})` → `supabase.from('push_tokens').upsert({user_id, expo_push_token, platform})` — initially lazy, then **disabled** for Expo Go tunnel (`useEffect return`) to avoid `ExpoPushTokenManager` crash. Will re-enable after `prebuild`.
- [apps/mobile-app/app.json:38](apps/mobile-app/app.json): added `expo-notifications` plugin.
- [apps/mobile-app/app/booking.tsx:17,78,408](apps/mobile-app/app/booking.tsx): photo picker `expo-image-picker` lazy, `docUri` state, `Pick photo / Change / Remove` card in step 3, on submit `fetch(uri)→blob` → `supabase.storage.from('patient-docs').upload('${patientId}/${Date.now()}.jpg')` → `patient_documents` insert (`doc_type: OTHER`). Best-effort after booking.

### Night — Crash Fix → Phase 5
- **Crash:** `expo-notifications` static import → `Cannot find native module 'ExpoPushTokenManager'` in Expo Go (requires dev build). Fixed by making `AuthProvider` push effect `return` early (disabled in tunnel). Also made `tracking.tsx` maps lazy.
- **Phase 5 — Account Deletion (you chose 1):**
  - [apps/mobile-app/app/profile.tsx:142](apps/mobile-app/app/profile.tsx): Danger zone `Delete my account` → `Alert` → `/account-delete`
  - New [apps/mobile-app/app/account-delete.tsx](apps/mobile-app/app/account-delete.tsx): type `DELETE` to confirm → tries `supabase.rpc('delete_own_account')` fallback `profiles` delete, mirrors website [apps/website/src/app/account/delete/page.tsx](apps/website/src/app/account/delete/page.tsx) + [api/account/delete/route.ts](apps/website/src/app/api/account/delete/route.ts) (`admin.auth.admin.deleteUser` cascades). `tsc` 0.
- **Phase 5 — Privacy Manifest (you chose privacy next):**
  - New [apps/mobile-app/PrivacyInfo.xcprivacy](apps/mobile-app/PrivacyInfo.xcprivacy): `Tracking false`, data types Name/Phone/Location/Photos, API reasons `C617.1/CA92.1/35F9.1`
  - [apps/mobile-app/app.json:12](apps/mobile-app/app.json): `ios.infoPlist` strings for location/photo/camera/notification + `usesAppleSignIn: true` + `privacyManifests` mirror
  - New [apps/mobile-app/PRIVACY_ANSWERS.md](apps/mobile-app/PRIVACY_ANSWERS.md): verbatim App Privacy + Data Safety answers
- **Phase 5 — Apple Button (you chose):**
  - [apps/mobile-app/lib/AuthProvider.tsx:16,79](apps/mobile-app/lib/AuthProvider.tsx): added `signInWithApple` (`AppleAuthentication.signInAsync` → `supabase.auth.signInWithIdToken({provider:'apple'})`), lazy `require('expo-apple-authentication')`, iOS-only
  - [apps/mobile-app/app/index.tsx:40,74](apps/mobile-app/app/index.tsx) + [apps/mobile-app/app/profile.tsx:1,41,71](apps/mobile-app/app/profile.tsx): `Sign in with Apple` button (iOS only, `Platform.OS==='ios'`) alongside Google, uses `signInWithApple`.
  - You created Services ID `in.co.caresy.auth` (was `in.co.caresy.web`). Your Supabase URL: `https://nhghrrtvecmsipeidmgj.supabase.co` → domains `caresy.co.in` + `nhghrrtvecmsipeidmgj.supabase.co`, return `https://nhghrrtvecmsipeidmgj.supabase.co/auth/v1/callback` (we gave exact copy-paste). Your Key `W6Q7L5P8ZS` is correctly grouped with `in.co.caresy.app` + `in.co.caresy.auth` (46CLB4HU9B). Deferred re-test after you Save in Supabase (Services ID → `in.co.caresy.auth`). Native Apple needs `prebuild`.

## Current State
- `tsc` 0, `bookingStatus.check: ok` (with legacy fallback for `activeIdx` when opts undefined)
- Tunnel: `npx expo start --tunnel` works if push remains disabled; with push enabled needs dev build.
- Logs: `PROGRESS_EASY.md` (easy recap), `ANALYSIS_FOR_CLAUDE.md` (prompt for Muse), this file (detailed), `apps/mobile-app/PRIVACY_ANSWERS.md`

## What's Left (Phase 5 finish + Phase 6)
- Re-enable push after dev build (remove early return in `AuthProvider.tsx:49`)
- Re-test Apple on web (private window) after you Save Supabase Apple provider with new Services ID + Key
- `npx expo prebuild --clean` → EAS IPA → TestFlight (`bundle in.co.caresy.app`, `projectId f1c994af-5e87-43f4-8d64-f33366e6756d`)

## Commands to Verify Everything
```
npx tsc --noEmit -p apps/mobile-app/tsconfig.json
node --experimental-strip-types packages/utils/src/bookingStatus.check.ts
npx expo install --check
npx expo start --tunnel --clear   # shake → Reload to see homepage urgent on top, Care Guide chips, booking dropdown
```

## For Claude (share these 3 files)
- `PROGRESS_EASY.md`, `TODAYS_WORK_DETAILED.md` (this file), `ANALYSIS_FOR_CLAUDE.md`
- Prompt in `ANALYSIS_FOR_CLAUDE.md` asks Claude to run `/improve-animations` + `/review-animations` (read-only), judge product clarity + Liquid Glass vs M3, propose 3 prioritized plans.

---
Generated for post-`/clear` recovery — all files persist in worktree.
