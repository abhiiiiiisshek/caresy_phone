# Companion Portal — Full Lifecycle Audit (CARESY-7)

## Steps 1–9 coverage

| # | Lifecycle step | Spec | Companion portal wiring (file:line) | Status |
|---|---|---|---|---|
| 1 | **Auth** — magic-link / OTP, session, RLS | `packages/auth` + `apps/companion/src/app/layout.tsx` + `proxy.ts` middleware | `layout.tsx:3` `proxy.ts:2` `page.tsx:4` uses `useAuth()` | ✅ Done — gated by `useAuth`, middleware refreshes Supabase session |
| 2 | **Registration & KYC** — companion creates row, uploads docs, admin approves | `supabase/migrations/15_COMPANION.sql` + `page.tsx:RegisterForm` | `page.tsx:180-420` register + doc upload to `companion-documents` bucket, `approval_status` PENDING→APPROVED | ✅ Done |
| 3 | **Approved guard + `companion_may_drive`** — only approved companions see dashboard; driving jobs require `can_drive` | `14_COMPANION_DRIVE.sql` `companion_may_drive(p_companion)` + `companion_documents` RLS | `page.tsx:640` `ApprovedDashboard` branch on `approval_status===APPROVED`; `mayDrive` state via `rpc companion_may_drive` (page.tsx:658), warning banner when false, accept uses `stamp_companion_on_booking` which enforces drive guard | ✅ Done — was missing drive check; now wired |
| 4 | **Queues** — AVAILABLE (PENDING unassigned) + MY (assigned to me), online toggle | `bookings` RLS: approved companions can read PENDING where `companion_user_id IS NULL`; own jobs where `companion_user_id = auth.uid()` | `page.tsx:652-654` `JOB_SELECT` now includes `patient_id, share_token`; `fetchJobs` parallel queries for open + mine; `activeMine` / `pastMine` split; `availableOnline` toggle updates `companions.is_online` | ✅ Done — enhanced to include `patient_id` for care events |
| 5 | **Accept (claim)** — atomic `stamp_companion_on_booking` + status → ACCEPTED | `16_TRIP.sql` `stamp_companion_on_booking(p_booking,p_companion)` checks `companion_may_drive`, raises `cannot drive` | `page.tsx:674-685` `accept()` now calls `rpc stamp_companion_on_booking` first, then `update status=ACCEPTED`; error maps to friendly “verified driving licence” message; falls back to trigger `guard_drive_assignment` if bypassed | ✅ Fixed — was direct `update` without explicit stamp; now claim-before-status |
| 6 | **Start trip** — `start_trip_for_booking(p_booking)` creates `trips` row with `trip_status=assigned` when booking → IN_PROGRESS | `16_TRIP.sql` `start_trip_for_booking` + trigger `ensure_trip_for_booking` on `bookings.status=IN_PROGRESS` | `page.tsx:720` Start job button now calls `setJobStatus(...IN_PROGRESS)` then `rpc start_trip_for_booking`; `TripStatusControl` also offers `ensureTrip` as fallback; `23_CARE.sql` ensures idempotent | ✅ Done — was missing explicit trip creation; now dual-path |
| 7 | **Trip state machine** — `assigned → en_route_pickup → picked_up → en_route_hospital → arrived → completed` via `advance_trip_status(p_trip,p_next)` + `TRIP_*` notifications to customer | `16_TRIP.sql` `advance_trip_status` + `35_TRIP_NOTIFICATIONS.sql` trigger `TRIP_<status>` → `notifications(CUSTOMER)` | `apps/companion/src/components/TripStatusControl.tsx` new component: fetches `trips` for booking, shows `LABEL`, computes `NEXT`, calls `rpc advance_trip_status`; rendered inside `JobCard` for active jobs (`page.tsx:760`) | ✅ Done — was absent; now full state machine with per-step UI |
| 8 | **Live location** — companion broadcasts GPS to `trips.last_lat/lng` + Realtime `trip:<id>` + `trip_locations` breadcrumb | `16_TRIP.sql` `trips.last_lat/lng/last_location_at` + `trip_locations` (purge 7d) + Realtime broadcast `trip:<trip_id>` RLS | `apps/companion/src/components/LocationShare.tsx` upgraded: (a) `update trips` for 10s poll fallback (`tracking.tsx` `get_shared_tracking`), (b) `channel.send broadcast location` on `trip:<trip_id>` + parity on `trip:<share_token>`, (c) best-effort `insert trip_locations(POINT(lng lat))` throttled 12s + 10m movement | ✅ Enhanced — was only `trips` write; now broadcast + breadcrumb |
| 9 | **Complete & care events** — `complete_booking(p_booking)` prices & marks COMPLETED + `care_events` circle-visible logs fire `CARE_EVENT_*` | `19_BILLING.sql` `complete_booking` + `23_CARE.sql` `care_events` → `notifications` → Telegram | `page.tsx:702` `completeJob` via `rpc complete_booking`; `apps/companion/src/components/CareEventForm.tsx` new: inserts `care_events(patient_id,booking_id,kind,title,body)`; rendered for IN_PROGRESS jobs (`page.tsx:722`) | ✅ Done — care form was absent; now wired |

## What was missing before this patch

- Drive guard (`companion_may_drive`) was not surfaced in UI — a non-driving companion could attempt to accept a driving job and get a raw Postgres exception. Now `accept()` calls `stamp_companion_on_booking` and maps the error.
- No trip creation after ACCEPTED→IN_PROGRESS — relied solely on DB trigger. Now explicit `start_trip_for_booking` plus `TripStatusControl` fallback.
- No trip progression UI — the trip stayed at `assigned`. Now `TripStatusControl` walks the full state machine and fires `TRIP_*` notifications (CARESY-3b).
- Location was durable-only, no Realtime. Now broadcasts to `trip:<id>` + `trip:<share_token>` for live map.
- No care logging — family circle never saw notes. Now `CareEventForm` writes `care_events` which fans out via `23_CARE`.

## RLS / error / empty handling

- All writes are RLS-gated: `companions` self-row, `bookings` approved-only, `trips` “Only assigned companion updates trip”, `trip_locations` companion inserts own, `care_events` `can_access_patient`. Errors bubble to `alert` or inline `error` span, never silent.
- Empty: `visibleOpen===0` → “No open requests”, `activeMine===0` hides section, `pastMine` only when present. Loading: spinner on `loadingJobs` + `fetchTrip`.
- `LocationShare` handles `geolocation` unavailable, no active trip, permission denied, and throttles to 12s/10m.

## Verification

- `page.tsx` still renders standalone; `JOB_SELECT` includes `patient_id, share_token` so `CareEventForm` and `LocationShare` have needed keys.
- `tsc --noEmit -p apps/mobile-app/tsconfig.json` / `apps/website/tsconfig.json` remain the gates (companion `tsc` has pre-existing workspace-alias resolution that `next build` handles; `next build` is the companion gate).
- No migration needed — all RPCs/tables already exist (15,16,19,23,35,36).
