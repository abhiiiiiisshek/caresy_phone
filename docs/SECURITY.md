# Security

The browser talks to Postgres directly ([ADR-0001](ADR/0001-supabase-as-backend.md)),
so **RLS is the security boundary**. A check that only exists in a React
component is not a check — a valid session plus `curl` bypasses it.

## Rules

1. **Every table gets RLS policies in the migration that creates it.** No table
   ships with RLS off, not even "internal" ones.
2. **RLS is row-level, not column-level.** If a role may update *a row* but not
   *a column* of it, RLS cannot express that. Use a SECURITY DEFINER function
   plus a trigger that rejects direct writes — the pattern in `26_BILLING.sql`.
3. **Client input never decides money or authorization.** Amounts are computed in
   Postgres; admin status comes from `is_admin()`, never from a client flag.
4. **Service-role key is server-only.** `SUPABASE_SERVICE_ROLE_KEY` may appear in
   `apps/website` server routes and nowhere else. Never in a `NEXT_PUBLIC_*` var,
   a client component, the companion or admin app, or the Capacitor shell.
5. **Secrets live in Vercel env vars**, not in the repo. `.env.local` is
   gitignored and stays that way.
6. **Tokens in URLs must be unguessable and narrow** — `share_token` is 122 bits
   and its reader returns live-trip fields only ([ADR-0007](ADR/0007-share-token-for-guest-tracking.md)).
   Never widen that reader to PII.

## Known enforcement points

| Risk | Enforced by |
|---|---|
| Out-of-area booking | `enforce_service_area()` trigger (client check is UX only) |
| Companion approving themselves | `guard_companion_privileged_fields()` trigger |
| Customer zeroing their own bill | payment columns writable only via `complete_booking` / `record_payment` |
| Two companions accepting one job | RLS `WITH CHECK` on the accept UPDATE — one wins |
| Reading another user's KYC | `companion-docs` bucket policies: own folder only; admins read all |
| Reading patient documents | `patient-docs` bucket policies (migration 25) |
| Guest tracking link leaking PII | narrow SECURITY DEFINER reader keyed on `share_token` |
| Companion reading a pickup for a job they have not accepted | `locations` SELECT is assigned-companion only (migration 46); the open feed reads `open_job_pickups()`, which returns hospital/pincode/city and nothing else |
| Admin escalation | `admin_users` allowlist via `is_admin()`; RPC-callable, table not client-writable |

## Storage buckets

Both private. Access only through policies + signed URLs — never make them public.

| Bucket | Contents | Path |
|---|---|---|
| `companion-docs` | companion KYC | `<auth.uid>/<DOC_TYPE>.<ext>` |
| `patient-docs` | patient records uploaded by family | per migration 25 |

⚠️ `patient-docs` must be created in the Supabase dashboard; the migration only
adds policies.

## Open gaps (do not assume these are handled)

- **No RLS test suite.** Policies are reviewed by reading, not by running
  ([ADR-0008](ADR/0008-assert-selfchecks-no-test-framework.md)). Any policy touching
  `bookings`, `patients` or `locations` deserves a manual check that a companion
  cannot read PII for jobs they have not accepted.
- **No rate limiting** on public inserts (`contact_messages`, waitlist, companion
  registration). A captcha or server-side throttle is still owed.
- **`CRON_SECRET`** must be set for `/api/cron/*`; unset means the routes are
  unauthenticated.

## If a key leaks

Rotate in the Supabase dashboard → update Vercel env for every affected app →
redeploy → check `audit_logs` and `notifications` for activity in the window.
Anon-key leaks are low severity by design (RLS holds); a **service-role leak is
total compromise** — rotate immediately.

## `is_admin()` must never return NULL (2026-08-29)

`is_admin()` originally wrapped its COALESCE *inside* the scalar subquery:

```sql
RETURN (SELECT COALESCE(..., FALSE) FROM auth.users u WHERE u.id = auth.uid());
```

For an anonymous caller `auth.uid()` is NULL, the WHERE matches no row, the
COALESCE never runs, and the subquery returns **NULL**. `IF NOT NULL THEN` is not
taken in plpgsql, so every `IF NOT is_admin() THEN RAISE` guard failed open —
`admin_save_booking_edit`, `admin_override_booking_status` and `reassign_booking`
were all callable over PostgREST with just the publishable anon key. RLS still hid
booking IDs, so exploitation needed a leaked UUID, but the guard itself was dead.

Fixed in `43_FIX_IS_ADMIN_NULL.sql` (COALESCE outside the subquery, plus `REVOKE
EXECUTE ... FROM anon` on the three RPCs as a second layer).

**Rule:** a boolean guard function must return a boolean, never NULL. RLS `USING`
clauses treat NULL as deny, which is safe; plpgsql `IF NOT` treats it as pass,
which is not. Any new SECURITY DEFINER guard gets an assertion proving it returns
FALSE — not NULL — for a session with no `auth.uid()`.
