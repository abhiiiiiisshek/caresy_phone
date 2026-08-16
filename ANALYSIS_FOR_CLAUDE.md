# For Claude — Analyze Today's Work (2026-08-15)

Copy this prompt into Claude Code:

```
You are reviewing the Caresy mobile work done today (2026-08-15) on branch caresy_m3_worktree.

Context:
- Worktree: /Users/1234/Desktop/Caresy phone/caresy_m3_worktree
- Stack: Expo SDK 57 + Expo Router, Supabase, TypeScript
- Completed today: Phase 3 booking write path leftovers (hospital autocomplete + pincode served check + expo-location at-home coords), Phase 4 native scaffold (react-native-maps, expo-notifications, expo-image-picker, expo-apple-authentication), homepage hierarchy fix (urgent primary), Care Guide richness (filters + tinted cards), Get Help FAQ (app/support.tsx), profile inline phone edit + account-delete (Apple 5.1.1v), PrivacyInfo.xcprivacy + PRIVACY_ANSWERS.md, Apple button wired (lazy require), tunnel crash fix (push disabled in Expo Go).

What to do:
1. Run `npx tsc --noEmit -p apps/mobile-app/tsconfig.json` and `node --experimental-strip-types packages/utils/src/bookingStatus.check.ts`
2. Audit animation & motion using /improve-animations (read-only, produce plans, don't implement) and /review-animations (flag issues, high bar)
3. Judge: product clarity (does urgent dominate?), visual hierarchy, iOS Liquid Glass vs Android M3 adaption, empty states, offline, a11y
4. Propose next 3 prioritized improvement plans with exact files/lines and risk

Use the logs: PROGRESS_EASY.md, PROGRESS_LOG.md (if present), and this file.
```

## Today's Changes (for Claude to verify)

### Files added
- `apps/mobile-app/lib/hospitals.ts` (copied from website curated list)
- `apps/mobile-app/PrivacyInfo.xcprivacy`
- `apps/mobile-app/PRIVACY_ANSWERS.md`
- `apps/mobile-app/PROGRESS_EASY.md` (easy-words recap)
- `apps/mobile-app/app/support.tsx` (FAQ-first help)
- `apps/mobile-app/app/account-delete.tsx` (type DELETE flow)
- `apps/mobile-app/lib/hospitals.ts` (already noted)

### Files modified
- `apps/mobile-app/package.json` — added build/typecheck, expo-location ~19.0.7, expo-notifications ~0.32.12, react-native-maps 1.20.1, expo-image-picker ~17.0.8, expo-apple-authentication ~8.0.7
- `apps/mobile-app/app.json` — plugins: expo-location + expo-notifications, ios.infoPlist (location/photo/camera/notification), usesAppleSignIn, privacyManifests, icon/splash
- `apps/mobile-app/lib/AuthProvider.tsx` — fixed tracking logic integration, added signInWithApple (lazy require), push disabled in Expo Go (early return) to avoid ExpoPushTokenManager crash
- `apps/mobile-app/app/booking.tsx` — hospital autocomplete dropdown + pincodeForArea autofill, checkPincodeServed badge, meetMode visual 3-card grid (At home/At hospital/Custom) + expo-location requestLocation + coords inserted into locations, photo picker → patient-docs bucket + patient_documents insert
- `apps/mobile-app/app/index.tsx` — urgent primary hero (display, urgentBg, glows, Immediate response) first, scheduled second, quick actions deduped → My bookings/Care guides/Get help→/support/Profile, iOS vs Android card styles
- `apps/mobile-app/app/care/index.tsx` — GUIDE_META + CATS/AUD filters, tinted cardAccent + iconBadge, iOS/Android adaption
- `apps/mobile-app/app/care/[slug].tsx` — hero Card with heroBar
- `apps/mobile-app/app/profile.tsx` — inline phone Field + Save, Danger zone → Delete account → /account-delete
- `apps/mobile-app/app/tracking.tsx` — lazy MapView/Marker, Realtime trip:<token> broadcast + 10s poll, honest headline + gated map (only when hasLocation), fallback text
- `apps/mobile-app/app/my-bookings.tsx` — tightened list/tabs spacing
- `packages/utils/src/bookingStatus.ts` — trackingHeadline/trackingSteps now take opts {scheduled_start_time, hasLocation, tripStarted} with legacy fallback
- `apps/mobile-app/components/ui.tsx` — Field now accepts onFocus/onBlur

### Decisions made
- Push off in Expo Go tunnel (early return in AuthProvider) to keep `npx expo start --tunnel` clean; re-enable after `npx expo prebuild --clean` + EAS dev build.
- Maps lazy-required similarly.
- Apple Services ID kept as `in.co.caresy.auth` (was in.co.caresy.web), grouped with app ID `in.co.caresy.app` under Key W6Q7L5P8ZS (team 46CLB4HU9B). Return URL: https://nhghrrtvecmsipeidmgj.supabase.co/auth/v1/callback, domains: caresy.co.in + nhghrrtvecmsipeidmgj.supabase.co. Deferred re-test in private window.
- Privacy: Tracking false, data types Name/Phone/Location/Photos, API reasons C617.1/CA92.1/35F9.1.

### How to judge
- Does `Need help urgently` dominate homepage? (size, color, position)
- Does `Get Help` answer FAQ before WhatsApp? (support.tsx)
- Is `Care Guide` grouped by need, not wall of text? (index.tsx filters)
- Is tracking honest for future bookings? (bookingStatus opts)
- Does phone edit stay in-app? (profile.tsx)
- Is iOS vs Android adaption present? (glassIos vs outlined)

### Commands for Claude
- `npx tsc --noEmit -p apps/mobile-app/tsconfig.json`
- `node --experimental-strip-types packages/utils/src/bookingStatus.check.ts`
- `npx expo install --check` (will show 57.0.12→57.0.13)
- `cat PROGRESS_EASY.md`

### What to improve next (Claude should prioritize)
1. Animations & motion audit (improve-animations / review-animations)
2. Re-enable push after dev build (remove early return) + test push_tokens insert
3. EAS prebuild + TestFlight pipeline (Phase 6)

---
After Claude reviews, apply its top plan or tell it to implement one plan at a time.
