# Caresy Native App — completion checklist

Native-only Expo/React Native. Web app is the reference for business rules, data
contracts, and Supabase queries/RPCs — **not** for layout or components. This
file tracks what is built, what is deferred, and what must be restored before
store submission.

_Last updated: 2026-08-13._

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
| My Bookings (`app/my-bookings.tsx`) | ✅ built | upcoming/past tabs, live meter, pull-to-refresh, cancel | states via design system |
| Tracking | ⬜ todo | — | next |
| Quick Help (urgent) | ⬜ todo | — | |
| Profile | ⬜ todo | — | |
| Care / Guides | ⬜ todo | — | content screens |
| Account deletion | ⬜ todo | — | **store-compliance blocker** |

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
4. **Rescheduling** — My Bookings ships Cancel (`cancel_booking` RPC) but not
   Reschedule (`reschedule_booking`). *Why:* needs a native datetime picker. *Restore:*
   reuse the Booking day/slot chooser (no extra dep) as a reschedule sheet.
5. **Tracking** — not yet ported (web `/tracking` via `share_token`).
6. **Notifications** — `expo-notifications` not wired; push pipeline (Firebase
   config present) unproven on native. **Store-relevant.**
7. **Document / photo upload** — patient docs (`patient-docs` bucket). Needs
   native camera/file handling.
8. **Account deletion** — web `/account/delete`. **Store-compliance blocker.**

## Store-submission blockers (do NOT submit until done)

- [ ] Sign in with Apple (iOS requirement — Google is the only method today)
- [ ] Push notifications (`expo-notifications` + delivery)
- [ ] Account deletion in-app
- [ ] Privacy / data-safety disclosures + iOS privacy manifest
- [ ] Permissions strings (location, camera, notifications)
- [ ] Offline / network-failure states across all screens
- [ ] Accessibility pass (labels present via design system; needs audit)
- [ ] Production signing (Android keystore, iOS certs)
- [ ] Google Play closed testing (12 testers × 14 days, personal account) + TestFlight
- [ ] Real-device QA (iOS + Android)

## Not yet verified on device

Everything above is `tsc`-clean but **not yet run on a real device**. Native
functionality (auth redirect, haptics, keyboard, Supabase writes, safe-area) must
be tested on Android + iOS per the workflow. `npm run dev`/Metro not run in the
sandbox (CLAUDE.md forbids dev server here).
