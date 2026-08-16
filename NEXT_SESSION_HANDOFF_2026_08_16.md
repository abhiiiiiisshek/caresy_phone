# Handoff — 2026-08-16 (updated 13:40 -> approved)

**Branch:** `feature/mobile-quick-help` — `4c6a719` committed + pushed. Working tree clean except this handoff file. `tsc 0` both apps.

## What was done this session (in order)

1. **Diagnosed red sticky disaster (user: "this look shitty, the red urgent help above is a disaster"):**
   - `apps/mobile-app/app/index.tsx` had `stickyUrgentWrap` **outside** `ScrollView` — fixed 210px `urgentBg` banner with two glows + full-width red `Get help now` pill + trust chips inside. Felt like system error, blocked greeting, broke 1:1 hierarchy vs website.
   - Website `apps/website/src/app/page.tsx:334` is `Greeting → ActiveBooking? → [Urgent Booking, Schedule Appointment]` as two equal `ActionCard minHeight 132` with photo bleed (`caresy-hospital-support.webp` / `caresy-family-app.webp` at `width 64%` + `linear-gradient(90deg, bg 0%, bg 36%, transparent 84%)`), not sticky.

2. **Rebuilt home to match website IA, natively:**
   - Removed `stickyUrgentWrap`/`heroUrgentPrimary`/`heroScheduledCompact`/`urgentGlow` entirely.
   - New `primaryActions` inside `ScrollView` after greeting: two `ActionCard` 1:1 cards:
     - **Urgent Booking:** `bg urgentBg #FFDAD6, ink urgentInk #93000A, btnBg urgent #BA1A1A`, label `Immediate need` (SF `bolt.heart` / `♥`), title/desc identical to website, `require('../assets/caresy-hospital-support.webp')` at `width 64% cover` + left `58%` solid `bg` fade (native approximation of website gradient; true gradient needs `expo-linear-gradient` + `prebuild --clean`), 44px arrow `→`.
     - **Schedule Appointment:** `bg green #1B4D3E, ink #fff, inkMuted rgba(255,255,255,0.82), btnBg greenDeep`, `calendar.badge.plus` / `◑`, `caresy-family-app.webp` same bleed.
   - Trust chips moved from inside urgent → new `trustCard` below Quick Actions (`Verified Companions`, `checkmark.shield.fill`, `Aadhaar-verified / 4.9/5 / Noida & Greater Noida`, `greenTint` chips) mirroring `page.tsx:411`.
   - Images copied: `apps/website/public/assets/*.webp` → `apps/mobile-app/assets/` (21K + 45K).
   - Added `Image` import, `ActionCard` now takes `img?: any` and renders photo bleed vs fallback decor glyph.

3. **Prior work carried in same commit (from 09:00 handoff):**
   - `family.tsx` new (7294 bytes, `patients` CRUD soft-delete), `quick-help.tsx` family picker + auto-fill, `booking.tsx` pincode debounce 400ms, `my-bookings.tsx` limit 50, `profile.tsx` glow, `ui.tsx` skeletons, `expo-symbols ^57.0.2` hybrid (SF on iOS, glyph fallback on Android/web). Needs `npx expo prebuild --clean` before SF shows in IPA.
   - Efficiency: `index.tsx` bookings `.limit(25)` + cancel guard + `useMemo`, `index.tsx` now also `.limit(25)`.

4. **SwiftUI vs Expo asked:** answered — Expo correct for Caresy now (one JS team, Android+iOS+Web reuse, OTA, 12×14 Play clock). SwiftUI would mean 2 teams, ~3mo delay, duplicate `slots.ts`/`bookingStatus` logic, for premium native feel you now get by making Expo cards website-identical.

## Verification

```bash
./node_modules/.bin/tsc --noEmit -p apps/mobile-app/tsconfig.json  # 0
./node_modules/.bin/tsc --noEmit -p apps/website/tsconfig.json     # 0
git log --oneline -3  # 4c6a719 mobile: home ... (photo bleed) -> pushed
git status            # clean (only this handoff untracked before update)
```

Preview (user's tunnel command, same-WiFi needs tunnel):
```bash
cd "/Users/1234/Desktop/Caresy phone/caresy_m3_worktree" && ./node_modules/.bin/expo start apps/mobile-app --tunnel --clear
# web: --web --clear (shows fallback glyphs, not SF)
```
Check: no fixed red top, both 132px cards scroll, urgent shows wheelchair photo on right faded into pink with text left on solid pink, schedule shows phone/timeline photo on green. Trust at bottom.

## Phase evaluation

**MOBILE_PLAN Phase 4 (~90%)** — same as before: `tracking.tsx` MapView+Realtime+10s poll ✅, `expo-image-picker` ✅, `expo-location` ✅, `push_tokens` upsert disabled in Expo Go ❌ (never tested `api/cron/send-push`), bottom sheet still Chips ❌. **Not production-ready.**
**Remaining Phase 4:** re-enable push after `prebuild --clean` (remove `AuthProvider.tsx:48` early return), test QUEUED→SENT; add bottom sheet for pickers.
**Phase 5:** SIWA 4.8 → deletion 5.1.1 E2E → `PrivacyInfo.xcprivacy` → EAS IPA/AAB → Play 12×14. Do not auto-start until push verified. If user said `gradient`, add `expo-linear-gradient` for true website 36%→84% fade (requires prebuild).

## Next agent — do this

1. Nothing dirty to commit — `4c6a719` already pushed. If handoff file needs committing: `git add NEXT_SESSION_HANDOFF_2026_08_16.md && git commit -m "docs: update handoff after website-identical urgent cards" && git push`.
2. On user `gradient` -> `npx expo install expo-linear-gradient`, replace `actionImgFade` solid 58% with `<LinearGradient colors={[bg, 'transparent']} start={[0,0]} end={[1,0]} style={s.actionImgFade} />` + `npx expo prebuild --clean` → `eas build --platform ios --profile production` → TestFlight.
3. Otherwise: Vercel deploy website, verify prod `is_admin() SECURITY DEFINER` / `trg_guard_trip_status` after migrations 30/31/33/34, update `docs/DATABASE.md` ⬜→✅.
4. Do not make broad visual refinements beyond urgent — await UI/UX audit.

**Last session ID:** `9865d629-d548-41bd-8bc7-344e7bf5eb63`
**Approved at:** 2026-08-16 13:38 — user: "approve , but inside of urgent booking is stil has to be like website" → done as photo bleed cards, committed.
