# Current state

_Updated: 2026-07-31._

Short-lived working memory: what is in flight, what is known-broken, what is
next. Not architecture — a thing that settles here for good belongs in
`docs/ARCHITECTURE.md` or a `docs/ADR/` entry. Prune ruthlessly; anything stale
here is worse than nothing.

Read this first after a `/clear`.

## In flight

- **Billing pipeline (migration 26) is shipped but never exercised end to end by
  a human.** The happy path — book → accept → Start → Complete & bill → collect
  — needs one real run before it can be trusted.
- **Admin coverage for the newer data model is partial.** `/payments` now exists
  (owed / collected today / collected all-time, filter by state, waive a bill)
  and Analytics revenue uses `final_amount_paise` where billing wrote one. Still
  missing: a `can_drive` verification screen, and nothing renders
  `transport_fare_reference`.
- **Play Store**: personal-account registration needs 12 testers × 14 continuous
  days before production. Keystore + tester list not started.

## Known broken / blocked

| Thing | Effect | Fix |
|---|---|---|
| `NEXT_PUBLIC_UPI_VPA` unset | UPI buttons hidden, cash-only | set in Vercel env (website + companion) |
| `SUPABASE_SERVICE_ROLE_KEY` unset | push delivery dead; `notifications` queue grows | set on website server env |
| `can_drive` defaults FALSE, no UI | `CUSTOMER_VEHICLE` bookings refuse assignment | clear via SQL, or build the admin screen |
| Duplicate patient rows | from a bug since fixed | merge script still owed |
| `patient-docs` bucket | must be created by hand in the dashboard | migration 25 only adds policies |

## Next up (rough order)

1. Run the money loop end to end on a real phone — `/payments` is the place to
   confirm the bill landed, and it has never been looked at with real rows in it.
2. Driving verification on the companion detail page.
3. Set the two missing env vars.
4. Duplicate-patient merge script.
5. Play Store keystore + testers.

## Stale docs

`docs/DEVELOPER_HANDOFF.md` (2026-07-09) predates the monorepo — its repository
map and pending-work sections describe the old single-app `src/` tree. Useful as
history; do not follow its layout. `docs/ARCHITECTURE.md` supersedes it.
