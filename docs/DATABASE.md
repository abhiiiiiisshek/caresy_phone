# Database

One Supabase Postgres backs all three apps. Every rule that matters lives here,
not in the apps — see [ADR-0001](ADR/0001-supabase-as-backend.md).

**Detailed schema notes:** `docs/08_Database/BOOKING_ENGINE_SCHEMA.md`,
`docs/08_Database/TRIPS_AND_LIVE_TRACKING.md`. **Security model:** `docs/SECURITY.md`.

## Rules

- Migrations are `NN_TOPIC.sql` in `supabase/migrations/`, applied **by hand** in
  the Supabase SQL Editor, in number order. This ledger is the only record of
  what is live — update it in the same commit that adds a migration.
- Every migration is idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`).
- Never edit an applied migration. Fix forward with a new number.
- Postgres enum values must be committed before use — that is why lifecycle enums
  are migration 12, run alone before 13.
- A migration that creates a table creates its RLS policies too.
- The header comment of each migration carries the reasoning. Read it before
  changing what it built.

## Ledger

| # | File | Purpose | Applied |
|---|---|---|---|
| — | `SUPABASE_SCHEMA.sql` | Core: patients, locations, bookings, audit_logs, enums, RLS, `is_admin()` | ✅ |
| — | `PROFILES_TABLE.sql` | `profiles` (customer onboarding) | ✅ |
| — | `BOOKING_REFERENCE_CODE.sql` | `reference_code` generation | ✅ |
| — | `OPS_METRICS_AND_CONTACT.sql` | superseded by 28 | ✅ |
| 10 | `10_ADMIN_AND_COMPANIONS.sql` | admin allowlist, `companions`, `companion_documents`, KYC storage policies | ✅ |
| 11 | `11_SERVICE_AREAS.sql` | pincode allowlist, `is_pincode_served()`, booking guard trigger | ✅ |
| 12 | `12_LIFECYCLE_ENUMS.sql` | adds `ACCEPTED`, `EXPIRED` (run alone, before 13) | ✅ |
| 13 | `13_LIFECYCLE.sql` | `app_settings`, `expires_at`, expiry sweep, companion job RLS, `notifications` | ✅ |
| 14 | `14_SCHEDULER.sql` | pg_cron: `expire_stale_bookings()` every 5 min | ✅ |
| 15 | `15_ADMIN_USERS_RPC.sql` | `admin_list_users()` — joins profiles + auth.users | ✅ |
| 16 | `16_TRIPS_AND_LIVE_TRACKING.sql` | trips + real-time companion location | ✅ |
| 17 | `17_TRIP_ETA.sql` | trip destination lookup for ETA | ✅ |
| 18 | `18_BOOKING_TRIP_LINK.sql` | links booking lifecycle to trips | ✅ |
| 19 | `19_ADMIN_PERF.sql` | marks `is_admin()` STABLE (RLS performance) | ✅ |
| 20 | `20_NOTIFICATION_DELIVERY.sql` | admin outbox can drain the queue; `sent_at` | ✅ |
| 21 | `21_PUSH_TOKENS.sql` | device push tokens from the native shell | ✅ |
| 22 | `22_PUBLIC_TRACKING.sql` | `share_token` + guest tracking reader ([ADR-0007](ADR/0007-share-token-for-guest-tracking.md)) | ✅ |
| 23 | `23_CARE.sql` | patient passport, timeline, documents, family circle | ✅ |
| 24 | `24_PUSH_DELIVERY.sql` | `notifications.error`, queued-oldest index | ✅ |
| 25 | `25_PATIENT_DOCS_BUCKET.sql` | `patient-docs` bucket + policies ⚠️ bucket must exist in the dashboard | ✅ |
| 26 | `26_BILLING.sql` | money columns + `complete_booking` / `record_payment` ([ADR-0005](ADR/0005-gatewayless-payments.md)) | ✅ |
| 27 | `27_TRANSPORT.sql` | `booking_transport` fare log ([ADR-0006](ADR/0006-transport-is-facilitated-not-billed.md)) | ✅ |
| 28 | `28_CONTACT_AND_METRICS.sql` | `contact_messages`, `ops_metrics` | ✅ |
| 29 | `29_FIX_AUDIT_RLS.sql` | `trigger_audit_bookings` → `SECURITY DEFINER`; its RLS-blocked insert was aborting every booking UPDATE | ✅ |
| 30 | `30_LAUNCH_FIXES.sql` | same-day bookings no longer born expired; `service_metadata.companion` stamped by the DB; `can_drive` closed to self-service; new-booking notification | ✅ |
| 31 | `31_CUSTOMER_ACTIONS.sql` | `cancel_booking` / `reschedule_booking`, and the guard that makes them the only way a customer changes a visit; `min_lead_minutes` setting | ✅ |
| 32 | `32_MERGE_DUPLICATE_PATIENTS.sql` | one-off data fix: merges the patient rows `/quick-help` duplicated, soft-deleting the losers | ⬜* |
| 33 | `33_PHONE_SIGNIN.sql` | `find_user_by_phone()` (service-role only) — matches an MSG91 OTP number against `profiles.phone` AND `auth.users.phone` so OTP sign-in reuses the existing account | ✅ |
| 34 | `34_SECURITY_HARDENING.sql` | pins `search_path` on `is_admin()` and `guard_companion_privileged_fields()`; closes the `trips` column-guard gap (`guard_trip_status_columns()`) the same way 31 closed it on `bookings` | ✅ |
| 35 | `35_TRIP_NOTIFICATIONS.sql` | trip status → customer notifications (IN_PROGRESS/COMPLETED) | ✅ |
| 36 | `36_NOTIFICATIONS_CLAIM.sql` | exactly-once claim-before-send for notifications (`claimed_at`, `claim_notifications()` with FOR UPDATE SKIP LOCKED) | ✅ |
| 37 | `37_STAMP_COMPANION_PREFLIGHT.sql` | fixes shipped CARESY-7 Accept bug — second overload `stamp_companion_on_booking(UUID,UUID)` preflight (driving-licence gate) | ✅ |
| 38 | `38_BOOKING_STATE_MACHINE.sql` | DB-level state machine (`is_valid_booking_transition`, `trg_enforce_booking_transition`) + audited `admin_override_booking_status` RPC | ✅ |
| 39 | `39_BOOKING_REASSIGNMENT.sql` | first-class `reassign_booking` RPC (resets clock if IN_PROGRESS, notifies both companions) | ✅ |
| 40 | `40_BOOKING_RACE_FIXES.sql` | closes double-tap `complete_booking` and `reschedule_booking` vs expiry-sweep races (FOR UPDATE + status re-check) | ✅ |
| 41 | `41_ADMIN_COMBINED_SAVE.sql` | transactional `admin_save_booking_edit` — wraps `admin_override_booking_status` + `reassign_booking` so status+companion edits are atomic (either both apply or neither). **Superseded by 42**: inferred intent from client-supplied current values, so NULL meant both "unchanged" and "unassign" | ✅ |
| 42 | `42_ADMIN_SAVE_INTENT.sql` | drops 41's 4-arg overload; `admin_save_booking_edit` takes explicit `p_change_status` / `p_change_companion` and takes `FOR UPDATE` before deciding | ✅ |
| 43 | `43_FIX_IS_ADMIN_NULL.sql` | **security**: `is_admin()` returned NULL (not FALSE) for anonymous callers, so every `IF NOT is_admin() THEN RAISE` guard failed open. COALESCE moved outside the subquery; `anon` EXECUTE revoked on the three admin RPCs | ✅ |
| 44 | `44_NOTIFICATION_RETRY.sql` | **reliability** (issue #11): `FAILED` notifications retried with bounded exponential backoff (5 attempts: 5,10,20,40,60m). `attempts` + `next_retry_at` + `claim_notifications()` now re-queues eligible FAILED rows | ✅ |
| 46 | `46_PICKUP_PRECISION.sql` | scopes `"Companions read job locations"` to the assigned companion; open feed reads `open_job_pickups()` (hospital/pincode/city) instead of joining the row | ⬜ |

\* 32 is a one-off data fix — re-run `select * from patients where customer_user_id = auth.uid() and deleted_at is null group by full_name having count(*) >1` after; flip to ✅ once merged (see `32_MERGE_DUPLICATE_PATIENTS.sql` foot query).

## Core tables

- `bookings` — the spine. Status, timings, `expires_at`, `share_token`, money
  columns, `companion_user_id`, `trip` link.
- `patients`, `locations` — who the visit is for and where.
- `profiles` — customer onboarding (name/age/phone).
- `companions`, `companion_documents` — 1:1 with `auth.users`; KYC +
  `approval_status` + `is_online` + `can_drive`.
- `admin_users` — editable admin allowlist read by `is_admin()`.
- `service_areas` — served pincodes, editable at `/admin/service-areas`.
- `app_settings` — key/value config (`instant_expiry_minutes`, …).
- `notifications` — enqueued on status change; drained to FCM.
- `trips` + location rows — live tracking.
- `booking_transport` — recorded fares, never billed.
- `contact_messages`, `ops_metrics`, `audit_logs`.

## Booking status

`DRAFT → PENDING → ACCEPTED / ASSIGNED → IN_PROGRESS → COMPLETED`
plus `CANCELLED`, `EXPIRED`.

## Functions that enforce rules

| Function | Enforces |
|---|---|
| `is_admin()` | admin allowlist; STABLE for RLS performance |
| `is_pincode_served(text)` | serviceability; mirrored client-side in `packages/utils` |
| `enforce_service_area()` | rejects out-of-area bookings on INSERT |
| `set_booking_expiry()` / `expire_stale_bookings()` | nothing stays PENDING forever, and nothing arrives already expired |
| `enqueue_booking_notification()` | a row per status change |
| `enqueue_new_booking_notification()` | a row when a booking is created — ops's only automatic signal |
| `stamp_companion_on_booking()` | the customer learns who is coming, however the assignment happened |
| `guard_companion_privileged_fields()` | no companion self-approval, and no self-certified driving licence |
| `complete_booking()` / `record_payment()` | the **only** writers of money columns |
| `cancel_booking()` / `reschedule_booking()` | the **only** way a customer changes a visit; lead window and status window enforced server-side |
| `guard_customer_booking_columns()` | a customer's own session cannot PATCH `status`, `companion_user_id`, `scheduled_start_time` or `expires_at` directly |
| `admin_list_users()` | reads `auth.users` email that anon/authenticated cannot |

## Gotchas

- Supabase FK joins are typed as arrays by the TS client even for many-to-one.
- `docs/08_Database/` holds the older copies of migrations 1–15; the live source
  of truth is `supabase/migrations/`.
- Duplicate patient rows exist from an earlier bug (fixed); a merge script is
  still pending — see `docs/CURRENT.md`.
