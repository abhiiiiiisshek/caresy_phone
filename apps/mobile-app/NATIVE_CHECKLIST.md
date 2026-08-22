# Caresy Native App — completion checklist

Native-only Expo/React Native. Web app is the reference for business rules, data
contracts, and Supabase queries/RPCs — **not** for layout or components. This
file tracks what is built, what is deferred, and what must be restored before
store submission.

_Last updated: 2026-08-22. Android finalisation: see docs/ANDROID_PARALLEL_WORKFLOW.md and ANDROID_RELEASE_NOTES.md. Post-finalisation state — ready for Play closed testing; deferred items marked._

_Android package: `in.co.caresy.app` · Expo 57 · `app.json` version 1.0.0 versionCode 1 · google-services.json `caresy-3cfa5`._

## Design system

- `lib/theme.ts` — brand tokens (mirrors `packages/ui/theme.css` --m3-* palette), spacing, radius, type scale, shadow.
- `components/ui.tsx` — `Screen`, `FormScreen` (keyboard-aware), `Txt`, `Overline`, `Card`, `Button`, `Chip`, `ChipRow`, `Field`, `LoadingState`, `EmptyState`, `ErrorState`. Haptics + accessibility built in.
- `components/StatusPill.tsx` — booking status → brand-colored pill (shared Home + My Bookings).
- Status→label contract lives in `@caresy/utils/bookingStatus` (shared with web, has self-check).

## Screens

| Screen | State | Native UX | Notes |
|---|---|---|---|
| Home (`app/index.tsx`) | ✅ improved | dashboard + 4 quick actions (Bookings, Urgent help, Guides, Profile) + WhatsApp fallback | served via `StatusPill` + `AnimatedHeadline` |
| Booking (`app/booking.tsx`) | ✅ finalised | 4-step form + hospital autocomplete + live `checkPincodeServed` + autofill pincode + inline served hint | `lib/hospitals.ts` (50 curated) + `AREA_PINCODE` autofill; pincode gate warns not blocks (server is authority) |
| My Bookings (`app/my-bookings.tsx`) | ✅ finalised | upcoming/past, live meter, cancel + **reschedule** + track, pull-to-refresh | Reschedule → `app/reschedule.tsx` reusing `availableSlots`; cancel via `cancel_booking` |
| Tracking (`app/tracking.tsx`) | ✅ built | headline, companion card, live-location, timeline, Share + Open in Maps | deep link is final for Android; inline `react-native-maps` deferred (see §5) |
| Quick Help (`app/quick-help.tsx`) | ✅ built | urgent-booking form + hospital chips + WhatsApp fallback | inserts `booking_type='URGENT'` with 60-min lead |
| Profile (`app/profile.tsx`) | ✅ built | name/phone edit + WhatsApp + privacy/terms links + sign out + delete | upserts `profiles`, calls `request_account_deletion` RPC |
| Care (`app/care.tsx`) | ✅ built | 6 guides (before/at/after visit, pickup, billing, help) + caresy.co.in/care link | static content; no DB |
| Reschedule (`app/reschedule.tsx`) | ✅ built | date chips + slot chips + `reschedule_booking` RPC | validates 60-min lead via `availableSlots` |
| Account deletion | ✅ built | in `app/profile.tsx` (danger button + confirm + RPC) | **Play blocker cleared**; also needs Supabase RPC `request_account_deletion` + web parity |

## Deferred functionality (post-finalisation — what remains deferred)

Client-side validation is UX only — **server-side/RLS enforcement remains authoritative**.

1. **Served-area enforcement** — ✅ **finalised** — Booking now calls `checkPincodeServed(supabase, pincode)` debounced (400 ms) and shows served / not-served hint; gate warns ("We don't serve this pincode yet — WhatsApp us") rather than blocks, so server `enforce_service_area()` remains the authority. Done in `app/booking.tsx`.
2. **Hospital selection / autocomplete** — ✅ **finalised** — `lib/hospitals.ts` + autocomplete dropdown in `app/booking.tsx` (also chips in `quick-help.tsx`). Free-text still allowed; picking autofills pincode via `pincodeForArea`. Full 456 list stays web-only; 50 top hospitals on native.
3. **Meeting-point / map location** — ⬜ **still deferred** — Booking sends `latitude/longitude = null`; web has a map picker. Companion Open-in-Maps falls back to address. *Restore:* `expo-location` + `react-native-maps` map picker — add when live-location is a headline Play feature. Permissions string already in `app.json`.
4. **Rescheduling** — ✅ **finalised** — `app/reschedule.tsx` + My Bookings reschedule button → `reschedule_booking` RPC with 60-min lead via `availableSlots`. Done 2026-08-22.
5. **Embedded live map** — ⬜ **still deferred** — Tracking deep-links to Google Maps. Acceptable for Play first release. *Restore:* `react-native-maps` centered on `last_lat/last_lng` before submission if live map is required.
6. **Notifications** — ✅ **finalised** — `lib/notifications.ts` + `app/_layout.tsx` `PushRegistrar` (lazy `expo-notifications`), `expo-notifications` added to `package.json`, permissions + channel on Android, token upsert to `push_tokens` (migration 21). Requires `expo install expo-notifications` + EAS rebuild; cron `api/cron/send-push` already drains `push_tokens`.
7. **Document / photo upload** — ⬜ **still deferred** — patient docs (`patient-docs` bucket). Needs `expo-image-picker` + Storage upload. Defer to post-closed-testing; permission string already in `app.json`.
8. **Account deletion** — ✅ **finalised** — `app/profile.tsx` (delete button + `request_account_deletion` RPC + signOut). Clears Play 5.1.1(v) blocker for Android. Also needs Supabase RPC creation + web `/account/delete` parity before production.

## Store-submission blockers — Android only (iOS-unblocked items marked)

- [x] Push notifications (`expo-notifications` + delivery) — ✅ `expo-notifications` added, `lib/notifications.ts` + `_layout.tsx` registrar, `push_tokens` upsert. Run `expo install expo-notifications` then EAS build.
- [x] Account deletion in-app — ✅ `app/profile.tsx` (RPC `request_account_deletion`). **Play blocker cleared for Android.** iOS + web parity still needed for iOS track.
- [x] Permissions strings — ✅ `app.json` `android.permissions` (INTERNET, LOCATION, CAMERA, VIBRATE, etc.) + `android.edgeToEdgeEnabled`; `ios.infoPlist` for location/camera. Notifications permission requested at runtime.
- [ ] Privacy / data-safety disclosures + manifest — Play Data Safety form + `privacy` URL `caresy.co.in/privacy` (exists) still needs form fill; iOS privacy manifest deferred (Android-only release).
- [ ] Offline / network-failure states — `lib/useNetInfo.ts` added (HEAD poll), needs wiring into `ErrorState` + `RefreshControl` retry across screens. Infra ready, UI wiring deferred.
- [ ] Accessibility pass — labels via design system present; needs audit on device (TalkBack).
- [x] Android build config — ✅ `app.json` `versionCode` + `permissions` + `eas.projectId`, `eas.json` (development/preview/production), `google-services.json` linked.
- [ ] Production signing — Android keystore via EAS (auto) — run `eas build --platform android --profile production` to generate; Play App Signing enabled on first upload.
- [ ] Google Play closed testing — 12 testers × 14 days (personal account) — open track now; clock runs in background. Not a code blocker.
- [ ] Real-device QA — `tsc` passes, `expo start` + physical Android required (sandbox forbids dev server per `CLAUDE.md`).
- [ ] Sign in with Apple — ⬜ iOS only — not required for Android production track; needed before iOS submission.

## What changed in finalisation (2026-08-22)

*   **Parallel workflow** added: `docs/ANDROID_PARALLEL_WORKFLOW.md` — branching (`feature/android-*` from `main`), sharing boundary (`types`/`utils` read-only), 11 milestones A1→A11, per-milestone DoD, EAS build table. `apps/mobile` Capacitor shell frozen until Phase 6.
*   **Booking** finalised: `lib/hospitals.ts` (50 hospitals, `AREA_PINCODE`), autocomplete dropdown + pincode autofill, debounced `checkPincodeServed` with served hint. No new native dep.
*   **New screens:** `app/profile.tsx` (edit + delete), `app/quick-help.tsx` (urgent `booking_type='URGENT'`), `app/care.tsx` (6 guides), `app/reschedule.tsx` (date+slot → `reschedule_booking`).
*   **My Bookings** finalised: Reschedule + Cancel + Track actions, cancel via `cancel_booking`.
*   **Notifications:** `lib/notifications.ts` (lazy load), `app/_layout.tsx` `PushRegistrar`, `expo-notifications` dependency, Android channel, `push_tokens` upsert.
*   **Android build:** `app.json` (+ `versionCode`, permissions, `infoPlist`, `extra.eas.projectId`, `edgeToEdgeEnabled`), `eas.json` (development/preview/production), `google-services.json` linked to `caresy-3cfa5`.
*   **Net:** 15 files touched, 0 new native SDKs beyond `expo-notifications`. `triage: tsc --noEmit` must pass before PR.

## Not yet verified on device

Nothing above has been run on a real device — `tsc` is the only gate in sandbox. `npm run dev`/Metro forbidden here per `CLAUDE.md`; verify with `expo start` on physical Android:
`caresy://` redirect, `SecureStore` persist after kill, `patients`→`locations`→`bookings` insert under RLS, `cancel_booking`/`reschedule_booking` windows, `push_tokens` write, haptics, keyboard, safe-area.
