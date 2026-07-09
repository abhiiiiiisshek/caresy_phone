# Caresy — Developer Handoff

_Last updated: 2026-07-09_

This document is the single source of truth for a developer taking over the Caresy
web application. It covers the product vision, what has been built, exactly what
remains and **how to build it**, setup steps, and the known gotchas.

---

## 1. Product overview & vision

**Caresy** is a hospital-companion booking platform for elderly / vulnerable
patients in India. Families book trained, police-verified companions to accompany
patients to hospital visits, diagnostic tests, and medicine pickups.

- **Coverage today:** Noida & Greater Noida only (validated by pincode).
- **Core services:** Hospital Companion (₹499), Medicine Pickup (₹299),
  Diagnostic Test (₹899), Safe Return (₹899), Full-day (₹1,299).
- **Three user types:** customers (families), companions (the supply side),
  admins/ops.

### The vision (owner's words, paraphrased)
Every critical business workflow must be complete and trustworthy before this is
called "production-ready" — not just the marketing site. Specifically:
a real **request lifecycle** (no request stuck in Pending forever), a real
**admin panel**, a real **companion portal** (register → KYC → approve → work),
correct **service-area validation** (reject out-of-area requests), plus
notifications, error handling, edge cases, DB integrity, and security.

### The owner's original 5 concerns and their status
| # | Concern | Status |
|---|---------|--------|
| 1 | Requests stuck in Pending; no expiry/timeout/transitions | ✅ Built (Phase 4) and scheduled (pg_cron, verified active) — fully resolved. |
| 2 | No real admin panel | ✅ Approvals, service-area editor, users list, analytics, settings, notifications viewer, and real companion assignment all built and live (§6-C). |
| 3 | No companion portal | ✅ Built (Phase 2): register → KYC → approve → job feed |
| 4 | Service-area logic wrong ("Gaur City" rejected) | ✅ Fixed (Phase 3): DB pincode allowlist + server-side rejection |
| 5 | Production readiness (notifications, errors, edge cases, security) | 🟡 Partially; see §6 and §8 |

---

## 2. Tech stack

- **Next.js 16.2.10** (App Router, TypeScript, React 19, Turbopack). ⚠️ This is a
  newer Next than most training data — read `node_modules/next/dist/docs/` before
  assuming APIs. See `AGENTS.md`.
- **Supabase** — Postgres + Auth (Google OAuth) + Storage + RLS.
- **Styling:** CSS custom properties (design tokens in `src/app/globals.css`) +
  inline React styles. No Tailwind / CSS-in-JS.
- **Design system:** `src/components/ds/` — 9 reusable primitives
  (Button, IconButton, Card, ServiceCard, StatCard, StepItem, CompanionCard,
  Badge, Input). Reuse these; don't invent new patterns.
- **Deployment:** Vercel, auto-deploys on push to `main`.
- **Icons:** `lucide-react`.
- **Repo:** https://github.com/abhiiiiiisshek/caresy_phone

---

## 3. Repository map (key files)

```
src/
  app/
    page.tsx                     Home (greeting, LocationBadge, services, companions)
    booking/page.tsx             Scheduled booking wizard (3 steps) + pincode validation
    quick-help/page.tsx          Same-day/urgent request + pincode validation
    my-bookings/page.tsx         Customer's bookings list + detail sheet
    support/page.tsx             Unified support (WhatsApp, FAQ, contact form)
    profile/page.tsx             Customer profile
    companion/page.tsx           COMPANION PORTAL: register → KYC → status → job feed
    admin-ops/page.tsx           Admin: bookings dispatch + ops metrics
    admin/companions/page.tsx    Admin: companion approval queue (KYC viewer)
    admin/service-areas/page.tsx Admin: pincode allowlist editor
    api/cron/expire-bookings/route.ts   Expiry sweep endpoint (called by a scheduler)
  components/
    Header.tsx Footer.tsx MobileBottomNav.tsx WhatsAppWidget.tsx
    LocationBadge.tsx            Pincode-based service-area indicator (home greeting)
    AuthModal.tsx                Google sign-in + onboarding (name/age/phone)
    ds/                          Design-system primitives (see §2)
  context/AuthContext.tsx        user/profile/isAdmin state; admin via is_admin() RPC
  utils/
    supabase/{client,server,middleware}.ts
    serviceArea.ts               checkPincodeServed() — mirrors DB is_pincode_served()
  data/companions.ts             Hardcoded MARKETING companion profiles (not live data)
  hooks/useLiveMetrics.ts        Ops metrics for the "live desk" widgets
docs/08_Database/                All SQL migrations (see §4)
```

---

## 4. Database — schema & migrations

Run migrations in the Supabase **SQL Editor** in this order. All are idempotent.
Files live in `docs/08_Database/`.

| Order | File | Purpose | Status |
|-------|------|---------|--------|
| 1 | `SUPABASE_SCHEMA.sql` | Core: patients, locations, bookings, audit_logs, enums, RLS, `is_admin()` | applied |
| 2 | `PROFILES_TABLE.sql` | `profiles` (onboarding) | applied |
| 3 | `BOOKING_REFERENCE_CODE.sql` | `reference_code` generation | applied |
| 4 | `OPS_METRICS_AND_CONTACT.sql` | `ops_metrics`, `contact_messages` | applied |
| 5 | `10_ADMIN_AND_COMPANIONS.sql` | admin allowlist, `companions`, `companion_documents`, KYC storage policies | **applied** |
| 6 | `11_SERVICE_AREAS.sql` | `service_areas` pincode allowlist, `is_pincode_served()`, booking guard trigger | **applied** |
| 7 | `12_LIFECYCLE_ENUMS.sql` | adds `ACCEPTED`, `EXPIRED` enum values (run FIRST, alone) | **applied** |
| 8 | `13_LIFECYCLE.sql` | `app_settings`, `bookings.expires_at`, expiry sweep, companion job RLS, `notifications` | **applied** |
| 9 | `14_SCHEDULER.sql` | pg_cron job: runs `expire_stale_bookings()` every 5 min | **applied** — verified active in `cron.job` |
| 10 | `15_ADMIN_USERS_RPC.sql` | `admin_list_users()` — joins profiles + auth.users email for `/admin/users` | **applied** |

### Tables (as of migration 13)
- `patients`, `locations`, `bookings`, `audit_logs` — core.
- `profiles` — customer onboarding (name/age/phone).
- `ops_metrics`, `contact_messages` — ops widgets + form/waitlist inbox.
- `admin_users` — **editable admin allowlist**. `is_admin()` checks this OR
  `@caresy.co`. Seeded with `checkgovt@gmail.com`.
- `companions` — companion account (1:1 with `auth.users`), KYC + `approval_status`
  (PENDING_REVIEW/APPROVED/REJECTED/SUSPENDED) + availability (`is_online`).
  A DB trigger blocks self-approval; allows REJECTED→PENDING_REVIEW re-apply.
- `companion_documents` — KYC file records (bucket `companion-docs`, private).
- `service_areas` — served pincodes (`is_active`). Editable at `/admin/service-areas`.
- `app_settings` — key/value config (`instant_expiry_minutes`=30,
  `scheduled_flag_hours`=2). Admin-editable.
- `notifications` — enqueued on booking status change (delivery NOT wired yet).

### `booking_status_enum`
`DRAFT → PENDING → ACCEPTED / ASSIGNED → IN_PROGRESS → COMPLETED`
(+ `CANCELLED`, `EXPIRED`).

### Storage
- Bucket **`companion-docs`** (private). KYC files stored at `<auth.uid>/<DOC_TYPE>.<ext>`.
  Policies in migration 10 let a companion manage only their own folder; admins read all.

### Important triggers/functions
- `is_admin()` — allowlist-based admin check (RPC-callable).
- `is_pincode_served(text)` — used by client + `enforce_service_area()`.
- `enforce_service_area()` — **rejects** out-of-area bookings on INSERT.
- `set_booking_expiry()` — sets `expires_at` on booking creation.
- `expire_stale_bookings()` — moves overdue PENDING → EXPIRED (idempotent). GRANTed to anon/authenticated.
- `enqueue_booking_notification()` — inserts a `notifications` row on status change.
- `guard_companion_privileged_fields()` — prevents companion self-approval.

---

## 5. What has been built (chronological)

### Presentation layer (earlier)
- Full rebuild to the "App UI Kit" design; 4-tab app nav (Home / Bookings /
  Support / Profile); marketing pages retain full header/footer; unified `/support`
  (merged old `/contact` + `/faq`, which now 301-redirect).

### Phase 0 — DB foundation
- Admin allowlist (`admin_users`), `companions`, `companion_documents`, RLS,
  self-approval guard, KYC storage policies. `AuthContext` + `/admin-ops` now use
  the allowlist via `is_admin()` RPC.

### Phase 3 — Service areas (the "Gaur City" fix)
- Serviceability decided by **pincode against `service_areas`**, not fuzzy text.
- `LocationBadge` uses reverse-geocoded postcode / manual pincode.
- Booking + Quick-Help forms capture a **real pincode** (was hardcoded `201301`),
  validate live, and **block out-of-area** submissions (also enforced server-side).
- `/admin/service-areas` editor (add/enable/disable/remove pincodes, no deploy).

### Phase 2 — Companion portal
- `/companion`: self-registration + KYC upload → PENDING_REVIEW → (admin) →
  APPROVED dashboard with online/offline toggle and a **live job feed**
  (Open requests → Accept → Start → Mark complete; active + history).

### Phase 1 — Admin (partial)
- `/admin/companions`: approval queue, KYC signed-URL viewer, approve/reject/
  suspend/reinstate. `/admin/service-areas` editor. Booking dispatch at `/admin-ops`.

### Phase 4 — Request lifecycle
- `ACCEPTED`/`EXPIRED` statuses; `expires_at` auto-set + backfilled;
  `expire_stale_bookings()` sweep; `/api/cron/expire-bookings` route; configurable
  timeouts in `app_settings`; `notifications` enqueued on status change.
- **Verified live:** the sweep already expired the 2 old stuck Pending requests.

---

## 6. What's PENDING and HOW to do it

### A. Notification DELIVERY (highest priority for production)
**State:** `notifications` rows are enqueued on every status change, but nothing
sends them. Only the CUSTOMER role is targeted; recipient contact isn't resolved.

**How:**
1. Choose provider(s): **MSG91** or **Gupshup** (popular in India for SMS +
   WhatsApp), **Twilio**, and/or email via **Resend**. Add API keys to Vercel env.
2. Enrich `enqueue_booking_notification()` (migration 13) to also enqueue COMPANION
   and ADMIN rows and to store the recipient phone/email (resolve from `profiles`,
   `companions`, and `bookings.service_metadata`).
3. Build a **drain worker**: a route (e.g. `src/app/api/cron/send-notifications/route.ts`)
   that selects `notifications WHERE status='QUEUED'`, sends via the provider,
   and marks `SENT`/`FAILED` (add a `sent_at`, `error` column). Protect with
   `CRON_SECRET`. Use the Supabase **service-role key** here (server-only env var).
4. Schedule it (see §B). Add retry/backoff for FAILED.
5. Templates: booking received, companion assigned/accepted, on-the-way, completed,
   expired, waitlist confirmation.

### B. Expiry / worker SCHEDULING — ✅ DONE
`docs/08_Database/14_SCHEDULER.sql` was run in the Supabase SQL Editor.
`expire-stale-bookings` is confirmed active in `cron.job` (`*/5 * * * *`),
so `expire_stale_bookings()` now runs automatically — no more requests stuck
in Pending forever (owner concern #1).

**Alternative (kept for reference, not needed — pg_cron is active):**
- **External uptime cron** (cron-job.org) hitting
  `https://<app>/api/cron/expire-bookings` every 5 min with
  `Authorization: Bearer <CRON_SECRET>`. Set `CRON_SECRET` in Vercel env first
  (not currently set in `.env.local` — the route works without it, just
  unauthenticated, since the function only touches already-overdue rows).
- **Vercel Cron** — Pro plan only (Hobby caps cron at once/day). If on Pro, add a
  `vercel.json` `crons` entry. ⚠️ Do NOT add a sub-daily Vercel cron on Hobby — it
  **fails the whole deployment** (this happened once; see §8).

### C. Admin panel — ✅ DONE
All six items below are built and `15_ADMIN_USERS_RPC.sql` has been applied.

- **Users list** (`/admin/users`) — reads `admin_list_users()` (migration 15,
  SECURITY DEFINER), which joins `profiles` + `auth.users` for email since
  anon/authenticated can't read `auth.users` directly. Excludes companion
  accounts (those live at `/admin/companions`). Search by name/email/phone.
- **Analytics** (`/admin/analytics`) — requests today, total requests,
  companions online/approved, and an estimated revenue figure (via
  `src/utils/pricing.ts` — payments aren't built yet, so this is a derived
  estimate from `service_type`/duration, clearly labeled as such in the UI),
  plus a request-by-status breakdown. All client-side queries against
  existing admin RLS — no new RPC needed.
- **Timeout settings editor** (`/admin/settings`) — CRUD over `app_settings`.
- **Notifications viewer** (`/admin/notifications`) — lists the `notifications`
  table with a status filter; makes visible that delivery isn't wired yet (§6-A).
- **Real companion assignment** — `/admin-ops` previously wrote a free-text
  name into `service_metadata.companion` and never touched
  `bookings.companion_user_id` at all. It now fetches APPROVED rows from the
  live `companions` table and sets `companion_user_id` on save (`data/companions.ts`
  hardcoded roster is no longer used here — it's still used for the
  illustrative match on the customer-facing booking/quick-help forms).
- **Unified nav** — `src/components/AdminNav.tsx`, a shared tab row (Dispatch /
  Companions / Service areas / Users / Analytics / Settings / Notifications)
  now appears on every `/admin*` page.

### D. Companion job feed — polish (Phase 2)
- Filter open jobs to the companion's `service_pincodes` (currently shows all open).
- Persist **decline** (today it only hides locally). Consider a
  `booking_declines(companion_id, booking_id)` table so declined jobs stay hidden.
- **Realtime**: subscribe to `bookings` via Supabase Realtime so feeds update live.
- Handle concurrent-accept races (two companions accept same job) — the RLS/WITH
  CHECK already makes only one win; surface a friendly "already taken" message.

### E. Service areas — remaining (Phase 3)
- **Verify/expand** the seeded pincode list to your real coverage at
  `/admin/service-areas` (15 pincodes seeded as a starting point).
- Optional later: **polygon geofencing** (PostGIS) for sub-pincode precision.

### F. Cross-cutting production hardening
- **Payments** — not built. Prices are display-only. Integrate Razorpay/Stripe if
  online payment is desired; otherwise keep cash/manual and document it.
- **Self-service reschedule/cancel** — currently routed to WhatsApp. Build real
  status transitions (customer CANCELLED) with RLS + a cancellation policy.
- **Error handling** — standardize toasts/inline errors (several `alert()` calls
  remain in booking/quick-help/admin — replace with the toast pattern used in
  `/admin/companions`).
- **Loading skeletons** instead of blank/spinner-only states.
- **Anti-spam / rate limiting** on public inserts (`contact_messages`, waitlist,
  companion registration) — add a captcha or server-side throttle.
- **Security/RLS audit** — review every policy added in migrations 10/11/13
  (companion open-job SELECT, accept UPDATE, locations/patients companion reads).
  Confirm a companion can't read PII of jobs they haven't accepted.
- **Tests** — there are none. Add at least integration tests for booking insert
  (served vs out-of-area), companion accept, and expiry.
- **Accessibility / images / dark mode** — image optimization (`next/image`),
  ARIA on custom controls, verify dark tokens.

### G. Domain (operational)
⚠️ The production domain **`caresy.co.in` / `www.caresy.co.in` currently points to
a DIFFERENT, older static HTML site — NOT this Next.js app.** This app is live at
**`caresy-phone.vercel.app`**. To go live on the real domain, reassign it to the
`caresy-phone` Vercel project (Vercel dashboard → caresy-phone → Settings →
Domains → add `caresy.co.in`, confirm removal from the old project).

---

## 7. Setup / running locally

1. `git clone https://github.com/abhiiiiiisshek/caresy_phone.git && cd caresy_phone`
2. `npm install`
3. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   # server-only (for the future notifications drain worker / service tasks):
   SUPABASE_SERVICE_ROLE_KEY=<service role key>
   CRON_SECRET=<random string>   # protects /api/cron/* endpoints
   ```
4. Verify: `npx tsc --noEmit` then `npm run build`.
5. ⚠️ **Avoid `npm run dev` in constrained sandboxes** — Turbopack has spawned
   runaway processes here. Verify via `build` + the Vercel preview instead.
6. Admin access: sign in with an email in `admin_users` (seeded: `checkgovt@gmail.com`),
   or add yours: `INSERT INTO admin_users(email) VALUES ('you@example.com');`

### Vercel env vars (Production + Preview)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (for cron/notifications)
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

---

## 8. Known gotchas (learned the hard way)

- **Vercel Hobby + Cron:** a sub-daily `vercel.json` cron (`*/5 * * * *`) is rejected
  on Hobby and **fails the entire deployment silently** (site keeps serving the old
  build). Use pg_cron or an external cron instead. Only add Vercel cron on Pro.
- **Turbopack dev server** can spawn hundreds of processes in sandboxes — don't run
  `npm run dev` there; use `build` + deploy previews.
- **Custom domain** points to an old static site, not this app (see §6-G).
- **Geolocation needs HTTPS** — the LocationBadge permission prompt won't fire on
  `http://localhost`; works on `*.vercel.app` and the real domain.
- **Postgres enum values** must be committed before use — that's why lifecycle enums
  are a separate migration (12) run before 13.
- **Supabase FK joins** are typed as arrays by the TS client even for many-to-one;
  cast with `as unknown as T[]` when needed (see `companion/page.tsx`).
- **`data/companions.ts` is marketing data**, not live companions. Real companions
  live in the `companions` table.

---

## 9. Verification approach

Because a browser couldn't always be driven here, backend loops were verified with
small read-only Node scripts using the anon key against the live DB (e.g. confirming
`service_areas` seeding, `is_pincode_served()` results, `expire_stale_bookings()`
behavior). Recommended going forward: add real automated tests (§6-F) and drive the
UI loops (register → approve → accept → complete; out-of-area rejection) in a browser.

### The three loops to smoke-test after any change
1. **Service area:** booking with `201009` (Gaur City) succeeds; `110001` is blocked.
2. **Companion+admin:** register at `/companion` → approve at `/admin/companions` →
   approved dashboard shows the job feed.
3. **Lifecycle:** create a same-day request → after `instant_expiry_minutes`, the
   sweep marks it EXPIRED (or call `/api/cron/expire-bookings`).

---

## 10. Quick status snapshot

| Area | Status |
|------|--------|
| Design / UI / navigation | ✅ Done |
| DB foundation, admin allowlist | ✅ Done |
| Service-area validation (pincode) | ✅ Done |
| Companion portal (register→approve→jobs) | ✅ Done |
| Request lifecycle + expiry sweep | ✅ Done, scheduled (§6-B) |
| Notification delivery | 🔴 Enqueue only; sending pending (§6-A) |
| Admin users list / analytics | ✅ Done (§6-C) |
| Payments / self-service cancel | 🔴 Not built (§6-F) |
| Tests / hardening / a11y | 🔴 Pending (§6-F) |
| Real domain pointing to this app | 🔴 Pending (§6-G) |
```
```
```
