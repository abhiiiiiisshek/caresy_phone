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
| `set_booking_expiry()` / `expire_stale_bookings()` | nothing stays PENDING forever |
| `enqueue_booking_notification()` | a row per status change |
| `guard_companion_privileged_fields()` | no companion self-approval |
| `complete_booking()` / `record_payment()` | the **only** writers of money columns |
| `admin_list_users()` | reads `auth.users` email that anon/authenticated cannot |

## Gotchas

- Supabase FK joins are typed as arrays by the TS client even for many-to-one.
- `docs/08_Database/` holds the older copies of migrations 1–15; the live source
  of truth is `supabase/migrations/`.
- Duplicate patient rows exist from an earlier bug (fixed); a merge script is
  still pending — see `docs/CURRENT.md`.
