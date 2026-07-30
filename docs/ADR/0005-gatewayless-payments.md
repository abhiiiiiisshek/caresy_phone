# ADR-0005: Cash/UPI collected at completion; no payment gateway

- **Status:** Accepted
- **Date:** 2026-07-28
- **Code:** `supabase/migrations/26_BILLING.sql`, `packages/utils/src/pricing.ts`,
  companion **Complete & bill** flow, customer `my-bookings` bill panel

## Context

At 15–20 customers, a payment gateway costs onboarding paperwork, per-transaction
fees and a settlement cycle, to solve a problem that does not exist yet: the
companion is standing next to the customer when the job ends. The final amount
also is not known at booking time — it depends on how long the visit actually ran.

## Decision

Bill at completion, collect in person. The companion taps **Complete & bill**;
`complete_booking()` computes `final_amount_paise` **in Postgres** from elapsed
time; `record_payment()` records CASH or UPI. UPI is a `upi://` deep link to
`NEXT_PUBLIC_UPI_VPA` — no gateway, no webhook, no settlement account.

Payment columns are writable **only** inside those SECURITY DEFINER functions,
enforced by a trigger. This is not ceremony: Postgres RLS is row-level, not
column-level, and the existing booking UPDATE policies would otherwise let a
customer's own session run `UPDATE bookings SET final_amount_paise = 0`.

The rules are duplicated between `pricing.ts` and the migration on purpose — the
client copy draws the quote, the SQL copy decides what is owed. **Changing a rate
means changing both in one commit.**

## Alternatives rejected

- **Razorpay / Stripe at booking** — charges before the duration is known, and
  adds refunds and reconciliation to a two-person operation.
- **Client-computed final amount** — a modified app could bill anything.
- **Plain payment columns without the RPC** — see the RLS hole above.

## Consequences

- No automatic reconciliation: collected-vs-owed is an admin screen, not a
  gateway dashboard. Unpaid bills need a UI (`docs/CURRENT.md`).
- With `NEXT_PUBLIC_UPI_VPA` unset, UPI buttons hide and the flow is cash-only.
- **Revisit when** volume makes chasing cash the bottleneck, or prepayment is
  needed to stop no-shows.
