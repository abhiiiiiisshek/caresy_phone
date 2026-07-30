# ADR-0006: Transport is facilitated and recorded, never billed

- **Status:** Accepted
- **Date:** 2026-07-29
- **Code:** `supabase/migrations/27_TRANSPORT.sql`

## Context

Companions arrange rides (Rapido, autos, the customer's own vehicle) as part of a
hospital visit. Putting those fares on the Caresy bill would make Caresy a
transport reseller — different economics, different liability, and a companion
who is out of pocket until reimbursement.

## Decision

Caresy arranges rides; the customer pays the driver directly on the provider's
rails. Fares are logged to `booking_transport` **for the dataset only** and never
touch `bookings.final_amount_paise`. `provider` is TEXT with a soft allowlist
rather than an enum, so a new operator is a row, not a migration.

## Alternatives rejected

- **Bill transport through Caresy** — reseller liability, GST implications,
  companion float, refunds on cancelled rides.
- **Ignore transport entirely** — throws away the one dataset no competitor has:
  what a ride between two real Noida points actually costs, by provider, by hour.
- **A provider enum** — every new operator would need a migration.

## Consequences

- The bill a customer sees is Caresy's service only; transport is visible but
  separate. UI must never merge the two totals.
- `CUSTOMER_VEHICLE` bookings depend on companion `can_drive`, which defaults
  FALSE and currently has no admin UI (`docs/CURRENT.md`).
