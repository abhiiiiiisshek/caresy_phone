# Architecture

_Current as of 2026-07-31. Supersedes the layout sections of
`DEVELOPER_HANDOFF.md`, which describes the pre-monorepo single-app tree._

Caresy books trained hospital companions for elderly patients in Noida /
Greater Noida. Three human roles — customer, companion, admin — get one app
each, over one Postgres.

## Shape

```
apps/
  website/     Consumer app + marketing   → caresy.co.in          (Vercel)
  companion/   Companion portal           → companion.caresy.co.in (Vercel)
  admin/       Ops dashboard              → admin.caresy.co.in     (Vercel)
  mobile/      Capacitor shell            → Play Store            (ADR-0004)
packages/
  ui/          Design primitives + theme.css tokens
  auth/        AuthContext, AuthModal, Supabase client factories
  types/       Shared domain types
  utils/       pricing, phone, serviceArea (+ .check.ts self-checks)
supabase/
  migrations/  NN_TOPIC.sql — run manually against the shared project
```

npm workspaces, no build orchestrator. Packages are consumed as source; each app
builds with its own `next build`.

## Module ownership

One owner per concern. Changing a concern means changing its owner, not adding a
second copy somewhere else.

| Concern | Owner | Notes |
|---|---|---|
| Auth, session, admin check | `packages/auth` | Google OAuth; admin via `is_admin()` RPC |
| Design tokens + primitives | `packages/ui` | `theme.css` + 9 components |
| Pricing / money rules (client) | `packages/utils/src/pricing.ts` | quote only — DB decides the bill |
| Pricing / money rules (truth) | `supabase/migrations/26_BILLING.sql` | `complete_booking`, `record_payment` |
| Phone + pincode validation | `packages/utils` | mirrors `is_pincode_served()` in DB |
| Booking creation & lifecycle | `apps/website` + migrations 13, 14 | enum + expiry sweep |
| Job feed, accept, collect | `apps/companion` + migration 26 | companion is the only writer of payment |
| Approvals, dispatch, service areas, analytics | `apps/admin` | migrations 10, 11, 15, 19 |
| Live tracking + share links | migrations 16–18, 22; `apps/website/tracking` | `share_token`, no account needed |
| Notifications | migrations 13, 20, 21, 24; `api/cron/send-push` | enqueue in DB, drain over HTTP |
| Transport facilitation | migration 27 | recorded, never billed (ADR-0006) |
| Native shell | `apps/mobile` | no product logic lives here |

## Request flow (booking → money)

1. Customer picks a service and pincode in `apps/website/booking`.
   `checkPincodeServed()` blocks out-of-area client-side; `enforce_service_area()`
   rejects it server-side regardless.
2. `INSERT INTO bookings` → `PENDING`. `set_booking_expiry()` stamps `expires_at`;
   pg_cron sweeps overdue rows to `EXPIRED` every 5 min.
3. Companion sees it in the open feed, accepts (`ACCEPTED` → `IN_PROGRESS`).
   RLS makes exactly one accept win.
4. Companion hits **Complete & bill** → `complete_booking()` computes
   `final_amount_paise` in Postgres from elapsed time. Then `record_payment()`
   marks cash or UPI collected.
5. Customer sees the same numbers on `my-bookings`, read from the same columns.

Status changes enqueue a `notifications` row; `api/cron/send-push` drains the
queue to FCM using the service-role key.

## Server-side surface

Almost everything is a direct Supabase query from the client under RLS. The only
server routes:

| Route | Purpose | Auth |
|---|---|---|
| `apps/website/api/cron/expire-bookings` | expiry sweep (backup to pg_cron) | `CRON_SECRET` |
| `apps/website/api/cron/send-push` | drain `notifications` → FCM | `CRON_SECRET` + service-role key |

Privileged writes are SECURITY DEFINER Postgres functions, not API routes —
see `docs/SECURITY.md`.

## Environments

| Var | Where | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | all apps | everything |
| `SUPABASE_SERVICE_ROLE_KEY` | website server only | push delivery |
| `CRON_SECRET` | website server only | cron routes |
| `NEXT_PUBLIC_UPI_VPA` | website + companion | UPI buttons (unset ⇒ cash-only) |

## Smoke tests after any change

1. **Service area** — booking with `201009` succeeds; `110001` is blocked.
2. **Companion loop** — register → approve in admin → job appears in feed.
3. **Money loop** — book → accept → Start → Complete & bill → collect →
   amount matches on the customer's `my-bookings`.
