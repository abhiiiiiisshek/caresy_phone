# NEXT_SESSION.md — SINGLE SOURCE OF TRUTH FOR PROGRESS

**Read this first on restart — this is the ONE file for all progress. All other handoff/progress files are deprecated. Update this file before every `/clear`. Durable facts live in [PROJECT_MEMORY.md](./PROJECT_MEMORY.md). Claude + Muse both use this.**

_Last updated: 2026-08-19 (session 2) — branch `feature/mobile-quick-help`, uncommitted working-tree changes, `tsc 0` mobile-app._

## In progress — mobile UI parity pass (this session)

User: home screen looks good, every other screen "looks static" vs website. Ran an Explore audit comparing all 10 `apps/mobile-app/app/*.tsx` screens against `components/ui.tsx` primitives + website equivalents. Full ranked findings not persisted verbatim — re-run the audit prompt if detail needed beyond below.

**Root cause found:** `Stagger` (entrance animation, RN `Animated`, opacity 0→1 + translateY→0) was copy-pasted locally into `index.tsx`, `booking.tsx`, and `quick-help.tsx` — never exported from `ui.tsx`, so the other 7 screens had zero animation and no easy way to add it.

**Done this session:**
- Hoisted `Stagger` into `components/ui.tsx` (exported, `index`-based 56ms cadence, 480ms cubic-out) — single source now.
- `index.tsx`, `booking.tsx`, `quick-help.tsx` — removed local `Stagger` duplicates, import shared one, dropped now-unused `useRef`/`Animated`/`Easing` imports.
- `support.tsx` (ranked **worst** of the 10 — manual chip markup, zero animation) — replaced hand-rolled chip `Pressable`s with shared `Chip`/`ChipRow`, wrapped intro/category-chips/FAQ-list/escalate-card in `Stagger`, deleted dead `s.chips`/`s.chip`/`s.chipOn` styles. `tsc 0`.
- `family.tsx` (2nd worst) — fixed dead `s.topBar` bind (now applied to intro View), wrapped intro, add/edit form card, and each `FlatList` row in `Stagger`. `tsc 0`.
- `profile.tsx` — `s.headerWrap` bind fixed via `cavecrew-builder` subagent, confirmed + `tsc 0`. Then wrapped header/Account/Activity/Help & support/Danger zone/Sign-out in `Stagger` (index 0-5). `tsc 0`.
- `my-bookings.tsx` — `s.tabs` bind fixed via subagent. `Stagger` added: filter-chip row (index 0), each `BookingCard` in `FlatList` (index+1). `tsc 0`. Still open: no companion photo in `BookingCard` (lower priority, from original audit).
- `tracking.tsx` — `s.step` bind fixed (timeline row) via subagent, stale `{/* stagger */}` comment deleted. Then wrapped headline/companion-card/location-card in `Stagger` (index 0-2), each timeline step (index `i+3`), share button (index `steps.length+3`). `tsc 0`.
- `account-delete.tsx` — wrapped confirm-form body in `Stagger` (index 0) via `cavecrew-builder` subagent. "Sign in required" / "Account deleted" states left untouched (single-state screens, low value). `tsc 0`.

**Not committed yet** — working tree has: `components/ui.tsx`, `app/index.tsx`, `app/booking.tsx`, `app/quick-help.tsx`, `app/support.tsx`, `app/family.tsx`, `app/profile.tsx`, `app/my-bookings.tsx`, `app/tracking.tsx`, `app/account-delete.tsx`.

## Next task

**`care/index.tsx`** — add `Stagger` (missing) + photo-bleed `ActionCard` treatment that `index.tsx` has (creative — website comparison needed, keep for direct work not subagent). Then **`care/[slug].tsx`** — add `Stagger` to hero/text blocks, lowest-risk gap, likely last screen needed for parity.

## Leftovers — remaining screens, worst → best (from same audit)

Cross-cutting bug found in 4 screens: a StyleSheet key is defined but **never attached** to its View — literal cause of "looks static" on each. **All 4 binds now fixed** (family/profile this session directly, my-bookings/tracking via subagent):

1. ~~**`family.tsx`** — `s.topBar` unapplied. No `Stagger`.~~ **done.**
2. ~~**`profile.tsx`** — `s.headerWrap` unapplied.~~ **bind + `Stagger` done.**
3. ~~**`my-bookings.tsx`** — `s.tabs` unapplied.~~ **bind + `Stagger` done.** Still open: no companion photo in `BookingCard` (website has one) — lower priority.
4. ~~**`tracking.tsx`** — `s.step` unapplied, misleading stale comment.~~ **bind + comment + `Stagger` done.**
5. ~~**`account-delete.tsx`** — missing `Stagger`.~~ **done.**
6. **`care/index.tsx`** — already uses real `Chip`/`ChipRow` correctly + accent bars + icon badges. Missing `Stagger` and photo-bleed treatment (`ActionCard` style) that `index.tsx` has. *(next task, above)*
7. **`care/[slug].tsx`** — plain article page, `Card` hero + text. No `Stagger`. Lowest-risk gap, likely matches website's text-first article layout already.

`quick-help.tsx`/`booking.tsx` — already closest to bar (Card/Chip/ChipRow/BottomSheet + Stagger per-step). Remaining gap: no `index`-based per-field cadence (uniform fade only) and no `ActionCard` photo treatment — likely doesn't apply to form/wizard screens.

**After screens:** run `npx tsc --noEmit` + `npm run lint -w @caresy/mobile-app` + `npm run build -w @caresy/mobile-app` per `CLAUDE.md` post-change workflow, then commit. `graphify update .` if touched files shift module boundaries (they don't here — same components, same imports).

## Just shipped (committed + pushed, not yet deployed — prior session)

- `8bc8d64` — **fix(mobile): restore stagger via RN Animated (Expo Go safe)** — reanimated stripped for RN 0.86 crash left UI flat; re-added `Stagger` (`opacity 0→1 + translateY 14→0`, 56ms, 420-480ms cubic) via `react-native Animated` (no native module). Home + Booking + QuickHelp now stagger, depth `raised/overlay` preserved. `tsc 0`.
- `6caebe1` — **fix(mobile): Expo Go safe — hide native requires** — `expo-device`/`expo-notifications`/`expo-linear-gradient` now early-return if `isExpoGo` (`storeClient` or `appOwnership expo`) + `eval("require")` to hide from Metro. Fixes `ExpoDevice`/`ExpoPushTokenManager`/`LinearGradient` redbox loops via `AuthProvider`/`_layout`. `tsc 0`, web 1.8MB.
- `b532bdd` / `7797028` — **fix(expo): one-go LAN** — hotspot `172.20.10.4` AP isolation made `exp.direct` the only working mode, then ngrok outage killed tunnel. Added `scripts/start-expo.sh` (detects IP `en0`/`en1`, clears `:8081`, `expo start --lan/--tunnel` with correct `--host lan` enum, fallback `exp://IP:8081` manual), `package.json` `start:lan`/`start:tunnel`/`start:web`/`start:direct`, `app.json` `android.usesCleartextTraffic`. Corrected `--host IP` misuse (Expo 57 host is `lan|tunnel|localhost`).
- `ab4bbf5` — **fix(mobile): maps web-safe** — `react-native-maps` `codegenNativeCommands` broke web bundling (996 modules failed). Hidden via `eval("require")` behind `Platform.OS !== 'web'`. `expo export --platform web` now 996 modules 1.8MB.
- `b3b3e57` / `a5e0346` — **gesture-handler + reanimated stripped for RN 0.86** — both referenced `Renderer/shims/ReactNative` moved in RN 0.86.2, broke Metro. Removed `gesture-handler`, fell back from `reanimated` to plain View (later restored via RN Animated). Kept `reanimated` removal.
- `fcd4317` — **feat(mobile): Apple Design premium polish — depth, motion, platform fidelity** — 3-level shadow `card/raised/overlay` + `material.scrim`, `Card level` prop, pressed `scale 0.97`, `Stack slide_from_right 320ms` + `GestureHandlerRootView` (later removed), stagger 56ms Home/Booking/QuickHelp/MyBookings/Tracking/Profile/Family. `tsc 0` (later cleaned for Expo Go).
- `7797028` earlier → `7797028` includes  `fcd4317` polish; `b532bdd` fixed host enum.
- Prior: `ef2e26f` — SDK 57 align (`expo-constants` `57.0.11`, `expo-device`, `expo-notifications` `57.0.11`), `60470cc` — guard push + gradient for Expo Go, `4c6a719` — home website-identical ActionCards, `3700524` bottom sheet, `f2c367d` LinearGradient 36%→84%, `af3558a`/`6c3e052` audit fixes. Ledger `30/31/33/34` → ✅.

## In progress (deferred per user, proceed to next phase)

**Deferred (leave for later — Claude should skip):**
- `apps/website/src/app/login/page.tsx` — custom OTP + Ellie mascot — sign-in button.
- `packages/auth/src/msg91.ts` + `apps/website/src/app/api/auth/phone/route.ts` + `33_PHONE_SIGNIN.sql` — MSG91 OTP (needs `MSG91_AUTH_KEY`/`TEMPLATE_ID` env).

**Proceeding → Phase 5/6 Ship** — Phase 4 ~90% done: MapView+Realtime+10s poll ✅, image-picker ✅, location ✅, push Expo Go guarded ✅, bottom-sheet ✅, gradient Expo Go safe ✅, depth polish ✅, motion restored via RN Animated ✅, web safe ✅.

**Outstanding still (not sign-in/MSG91):**
- `apps/website/src/app/{privacy,terms}/page.tsx` — legal copy (placeholder).
- `supabase/migrations/32_MERGE_DUPLICATE_PATIENTS.sql` — one-off patient dedup `⬜*`.
- `docs/PROGRESS_EASY.md` / `TODAYS_WORK_DETAILED.md` / `NEXT_SESSION_HANDOFF_*.md` — deprecated, see this file only.

## Next tasks (do these) — user: "leave we can set them later proceed to the phase"

1. **EAS Ship (Phase 6):** `npx expo prebuild --clean` already done (ios/ generated). Next: `eas build --platform ios --profile production` → TestFlight + `eas build --platform android --profile production` → AAB → Play 12×14 closed testing (keystore + tester list not started). Verify on TestFlight: bottom-sheet pickers, `LinearGradient` solid fallback in Expo Go / real gradient in dev-client, push `push_tokens` upsert (`google-services.json` + `SUPABASE_SERVICE_ROLE_KEY` + `projectId f1c994af-5e87-43f4-8d64-f33366e6756d`), RN Animated stagger (no reanimated native).
2. **Run (one-go):** `npm run start:lan -w @caresy/mobile-app` → `exp://172.20.10.4:8081` (LAN, no --host IP), `npm run start:web` → `http://localhost:8081`, `npm run start:tunnel` → fallback to LAN if ngrok down. If `Firewall is enabled (State = 1)`: `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off`.
3. **Deploy website:** Vercel deploy (verify `SELECT prosecdef FROM pg_proc WHERE proname='is_admin'` + `tgname='trg_guard_trip_status'`).
4. **Before first customer (CURRENT.md):** set `NEXT_PUBLIC_UPI_VPA` + `OPS_WEBHOOK_URL` (ntfy.sh, no www/trailing slash) + `CRON_SECRET`, enable `pg_cron` 5min + `cron-job.org` 1min, create `patient-docs` bucket, approve 1 companion at `/admin/companions`, walk money loop on 2 phones.
5. **Later (deferred):** sign-in + MSG91 when ready.

Verification: `tsc 0` both apps, `expo export --platform web` 996 modules 1.8MB, `npm run start:lan` no longer throws `AssertionError: --host`.

## Open decisions / unknowns

- Whether to gate driving jobs on licence in UI too (DB already refuses via `can_drive`).
- SwiftUI vs Expo — answered this session: Expo correct now (reuse, speed, Android). Native feel achieved via website-identical cards; SwiftUI would be ~3mo delay for same.

## On restart / low-context ritual

1. `git status` + `git log --oneline -5` — reconcile against "In progress" above. **Read `/NEXT_SESSION_HANDOFF_2026_08_16.md` first** — it has the full urgent-fix detail + preview command.
2. Read `docs/CURRENT.md` for anything not captured here.
3. When you finish or change state: edit this file, move done items into `PROJECT_MEMORY.md`'s milestones, then `graphify update .`.
