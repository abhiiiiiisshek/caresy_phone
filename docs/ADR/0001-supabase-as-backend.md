# ADR-0001: Supabase (Postgres + RLS) is the backend; no custom API tier

- **Status:** Accepted
- **Date:** 2026-07-10
- **Code:** `supabase/migrations/`, `packages/auth/src/supabase/`

## Context

Solo founder, pre-revenue, three surfaces to ship (customer, companion, admin)
that all read and write the same booking rows. A conventional Node API tier
would have meant writing, deploying and securing a fourth service before the
first booking existed.

## Decision

Postgres is the application. The browser talks to Supabase directly; **RLS
policies are the authorization layer**, and privileged writes are SECURITY
DEFINER functions (`is_admin`, `complete_booking`, `record_payment`,
`admin_list_users`, `enforce_service_area`). Auth is Supabase Google OAuth.
Schema changes are hand-written idempotent SQL migrations run in the SQL Editor,
kept in `supabase/migrations/` in migration order.

## Alternatives rejected

- **Node/Express or NestJS API tier** — a whole service to deploy, monitor and
  secure for logic Postgres already enforces; every rule would exist twice.
- **Firebase** — the data is deeply relational (bookings ↔ patients ↔ companions
  ↔ trips) and reporting is SQL-shaped. Document modelling would fight it.
- **Prisma / an ORM** — the security-critical logic is in RLS and triggers, which
  an ORM does not express. Hand-written SQL keeps rules where they are enforced.

## Consequences

- Business rules live in SQL. Reviewing a feature means reading its migration.
- No column-level RLS in Postgres, so any field the client must not write needs a
  DEFINER function plus a trigger guard (see ADR-0005 and `26_BILLING.sql`).
- Migrations are applied by hand — the ledger in `docs/DATABASE.md` is the only
  record of what is actually live. Keep it current.
- **Revisit when** background jobs get heavier than pg_cron can carry, or a
  second write client that isn't a browser appears.
