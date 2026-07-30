# Troubleshooting & deployment playbook

Symptom → first place to look. Written from problems that actually happened here.

## Deploy

Push to `main` → Vercel builds each app. Three projects, one repo.

**Before pushing:** `npx tsc --noEmit` and `npm run build -w @caresy/<app>` for
every touched app. The build is the real gate — Vercel runs the same thing.

**Migrations deploy separately and first.** Paste the SQL into the Supabase SQL
Editor, in number order, then push the code that depends on it. Update the ledger
in `docs/DATABASE.md`.

**Rollback:** Vercel dashboard → Deployments → promote the previous build.
A migration cannot be rolled back that way — fix forward with a new one.

## Symptom index

**Site serves an old build after a successful-looking push**
A bad `vercel.json` — notably a sub-daily `crons` entry on Hobby — fails the
whole deployment silently. Check the Vercel deployment log, not the site.
See [ADR-0003](ADR/0003-postgres-schedulers-not-vercel-cron.md).

**Push notifications never arrive**
1. `/admin/notifications` — are rows stuck at `QUEUED`? Then the drain is not
   running: check `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` on the website.
2. Rows `FAILED`? Read `notifications.error` (migration 24).
3. No rows at all? The enqueue trigger did not fire — the status never changed.

**Bookings stuck in PENDING**
pg_cron job not running. In SQL: check `cron.job` for `expire-stale-bookings`
(`*/5 * * * *`). Manual kick: `SELECT expire_stale_bookings();` or call
`/api/cron/expire-bookings`.

**A valid pincode is rejected (or an invalid one accepted)**
`service_areas` is the truth; the client helper mirrors it. Fix the row at
`/admin/service-areas` — no deploy needed. If client and server disagree,
`packages/utils/src/serviceArea.ts` has drifted from `is_pincode_served()`.

**Bill shows the wrong amount**
`final_amount_paise` is computed in Postgres. If the customer's view disagrees
with the quote, `packages/utils/src/pricing.ts` and `26_BILLING.sql` have drifted —
they are deliberately duplicated and must change together
([ADR-0005](ADR/0005-gatewayless-payments.md)). Run
`node --experimental-strip-types src/pricing.check.ts` in `packages/utils`.

**UPI buttons missing**
`NEXT_PUBLIC_UPI_VPA` unset ⇒ cash-only by design.

**Companion cannot be assigned to a `CUSTOMER_VEHICLE` booking**
`can_drive` defaults FALSE and has no admin UI yet. Clear it in SQL.

**"Row violates row-level security policy"**
The policy is the spec, not the bug. Read the policy in the migration that
created the table before changing app code. Column-level restrictions do not
exist — if a column must be protected, it needs a DEFINER function
(`docs/SECURITY.md`).

**Signed URL / file upload fails**
The bucket may not exist. `patient-docs` must be created by hand in the Supabase
dashboard; migration 25 only adds policies.

**Geolocation prompt never appears**
Geolocation needs HTTPS. It will not fire on `http://localhost`; test on a Vercel
preview.

**`npm run dev` spawns hundreds of processes**
Turbopack in a constrained sandbox. Do not run the dev server there — use
`build` plus a preview deploy.

**TypeScript complains a many-to-one join is an array**
It is, per the Supabase client's types. Cast `as unknown as T[]` at the query
boundary.

**Native app shows the error page**
The shell loads `caresy.co.in` live ([ADR-0004](ADR/0004-capacitor-remote-url-shell.md)).
No network, or the site is down — there is no offline mode. Check the web deploy
first; a broken web deploy breaks every installed app instantly.
