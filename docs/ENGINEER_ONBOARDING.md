# Caresy — engineer onboarding

_Current as of 2026-08-07. Start here if you have never seen this repo._

Read this once, end to end. It explains the product, the stack, the layout, and
the four or five ideas that make the rest of the code predictable. Everything
deeper is a link — follow it when you need it, not before.

---

## 1. The product

Caresy books **trained hospital companions for elderly patients** in Noida /
Greater Noida. A family books a companion; the companion meets the patient,
takes them through their hospital visit, and gets paid at the end of it.

Three humans, three apps, one database:

| Role | App | Domain |
|---|---|---|
| Customer / family | `apps/website` | `caresy.co.in` |
| Companion (the worker) | `apps/companion` | `companion.caresy.co.in` |
| Ops / admin | `apps/admin` | `admin.caresy.co.in` |

`apps/mobile` is today a **thin Capacitor shell** loading `caresy.co.in` in a
webview, holding no product logic. It is being replaced by a real Expo /
React Native app on the same Supabase backend — [ADR-0009](ADR/0009-expo-native-mobile.md),
phased plan in [`MOBILE_PLAN.md`](MOBILE_PLAN.md).

~14k lines of TypeScript total. It is a small codebase — the complexity lives in
Postgres, not in React.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16, App Router** | ⚠️ Not the Next.js you remember — read `node_modules/next/dist/docs/` before writing routing/caching code |
| UI | **React 19**, TypeScript strict | No state manager. React state + Supabase queries. |
| Styling | **Tailwind v4** + CSS custom properties | Tokens in `packages/ui/theme.css` |
| Icons | `lucide-react` | The only icon source |
| Backend | **Supabase** — Postgres + Auth + Storage + Realtime + RLS | No API server of our own ([ADR-0001](ADR/0001-supabase-as-backend.md)) |
| Auth | Google OAuth via Supabase, `@supabase/ssr` | Cookies scoped `.caresy.co.in` |
| Scheduling | **pg_cron inside Postgres** | Not Vercel Cron ([ADR-0003](ADR/0003-postgres-schedulers-not-vercel-cron.md)) |
| Push | FCM, drained from a DB queue | `apps/website/api/cron/send-push` |
| Native | **Expo / React Native** (migrating) | Capacitor 7 shell is deprecated — [ADR-0009](ADR/0009-expo-native-mobile.md), plan in `MOBILE_PLAN.md` |
| Deploy | **Vercel** — 3 projects, one repo | See `DEPLOYMENT.md` |
| Monorepo | **npm workspaces**, no Turborepo/Nx | Packages consumed as source ([ADR-0002](ADR/0002-npm-workspaces-monorepo.md)) |
| Tests | **No framework, deliberately** | `assert`-based `*.check.ts` files ([ADR-0008](ADR/0008-assert-selfchecks-no-test-framework.md)) |

Do not add a runtime dependency without an ADR. That rule is real, not decorative.

---

## 3. Layout

```
apps/
  website/      Customer app + marketing site. The big one.
    src/app/          booking/ my-bookings/ quick-help/ tracking/ care/
                      profile/ login/ auth/callback/ support/ services/ …
                      api/cron/expire-bookings, api/cron/send-push
    src/components/   Header, Footer, MeetingPoint, WhatsAppWidget, NativeBridge, …
    src/lib/          fcm, careGuides, mapLimit  (+ .check.ts self-checks)
    src/data/         hospitals, companions (static seed data)
  companion/    Companion portal. Literally one page (src/app/page.tsx) —
                the job feed, accept, start, complete & bill, all in one screen.
  admin/        Ops dashboard. companions/ payments/ live/ ops/ users/
                service-areas/ analytics/ notifications/ settings/
  mobile/       Capacitor shell. android/ + ios/. No product logic.

packages/
  ui/           9 primitives (Button, Card, Badge, Input, StatCard, …) + theme.css
  auth/         AuthContext, AuthModal, and the Supabase client factories:
                supabase/{client,server,middleware,callback,cookies}.ts
  types/        Shared domain types. If two apps need a type, it lives here.
  utils/        pricing, phone, serviceArea, slots  (+ .check.ts self-checks)

supabase/
  migrations/   NN_TOPIC.sql — the real backend. Applied by hand, in order.
  functions/    trip-eta Edge Function (OpenRouteService lookup)

docs/           You are here. ADR/ holds the "why".
```

`docs/08_Database/` describes a two-repo, pre-monorepo era — do not follow its
layout. `supabase/migrations/` is the live SQL.

---

## 4. The one idea you must absorb

**The browser talks to Postgres directly.** There is no API layer. A React
component calls `supabase.from('bookings').select(...)` and Postgres decides
what comes back.

Consequences, all of them load-bearing:

1. **RLS is the security boundary.** A check in a React component is not a
   check — a valid session plus `curl` walks straight past it. Every table gets
   RLS policies in the same migration that creates it. See `SECURITY.md`.
2. **Business rules live in SQL**, as triggers and SECURITY DEFINER functions.
   Service-area enforcement, booking expiry, billing, cancellation windows,
   companion self-approval blocks — all Postgres.
3. **Money is server-authoritative.** `complete_booking()` and
   `record_payment()` in `26_BILLING.sql` are the *only* writers of the money
   columns. `packages/utils/src/pricing.ts` draws the customer's quote — it
   never decides what is owed. Change a rate, change both, one commit.
4. Money is integer **paise**, never floats. Names say so
   (`final_amount_paise`). Format at the render edge with `formatINR`.

Only two server routes exist in the whole product, both cron:
`/api/cron/expire-bookings` and `/api/cron/send-push`. If you find yourself
adding a third, ask whether it should be a Postgres function instead.

---

## 5. How a booking flows

```
customer                    Postgres                     companion
   │                            │                            │
   ├─ pick service + pincode ──►│ enforce_service_area()     │
   │                            │  rejects out-of-area       │
   ├─ INSERT booking ──────────►│ PENDING                    │
   │                            │ set_booking_expiry()       │
   │                            │ enqueue_new_booking_notif  │
   │                            │◄──────── open job feed ────┤
   │                            │ ACCEPTED (RLS: one wins)  ◄┤
   │                            │ IN_PROGRESS               ◄┤ Start
   │                            │ complete_booking()        ◄┤ Complete & bill
   │                            │  computes final_amount     │
   │                            │ record_payment()          ◄┤ cash / UPI
   │◄─ my-bookings reads ───────┤ same columns               │
```

Status enum: `DRAFT → PENDING → ACCEPTED/ASSIGNED → IN_PROGRESS → COMPLETED`,
plus `CANCELLED` and `EXPIRED`.

Every status change enqueues a `notifications` row. `api/cron/send-push` drains
that queue to FCM using the service-role key.

Live tracking is a separate spine: `trips` + Supabase Realtime broadcast for
location pings (zero DB writes per ping), and a 122-bit `share_token` so family
without an account can watch ([ADR-0007](ADR/0007-share-token-for-guest-tracking.md)).

Payments are **gatewayless** — cash or direct UPI, recorded by the companion
([ADR-0005](ADR/0005-gatewayless-payments.md)). Transport is facilitated and
logged but never billed ([ADR-0006](ADR/0006-transport-is-facilitated-not-billed.md)).

---

## 6. Where each concern lives

Full table in `ARCHITECTURE.md`. The short version — one owner per concern, and
changing a concern means changing its owner, not adding a second copy:

| Concern | Owner |
|---|---|
| Auth, session, admin check | `packages/auth` (admin via `is_admin()` RPC) |
| Design tokens + primitives | `packages/ui` |
| Price quote (display) | `packages/utils/src/pricing.ts` |
| Price truth (the bill) | `supabase/migrations/26_BILLING.sql` |
| Booking creation & lifecycle | `apps/website/booking` + migrations 13, 14 |
| Job feed, accept, collect | `apps/companion` + migration 26 |
| Approvals, dispatch, areas, analytics | `apps/admin` |
| Live tracking | migrations 16–18, 22 + `apps/website/tracking` |
| Notifications | migrations 13, 20, 21, 24 + `api/cron/send-push` |

Copy-pasting a helper between two apps is a bug — move it to `packages/utils`.

---

## 7. Database

One Supabase Postgres. **Migrations are applied by hand** in the Supabase SQL
Editor, in number order. `docs/DATABASE.md` is the only record of what is live —
update the ledger in the same commit that adds a migration.

Rules that bite if ignored:

- Migrations are `NN_TOPIC.sql`, sequential, **idempotent**, and **never edited
  after they run**. Fix forward with a new number.
- Postgres enum values must be committed before use — that is why the lifecycle
  enums are migration 12, run alone before 13.
- A migration that creates a table creates its RLS policies too.
- Each migration's header comment carries the reasoning. Read it before changing
  what it built.

Core tables: `bookings` (the spine), `patients`, `locations`, `profiles`,
`companions` + `companion_documents`, `admin_users`, `service_areas`,
`app_settings`, `notifications`, `trips`, `booking_transport`,
`contact_messages`, `ops_metrics`, `audit_logs`.

Two private storage buckets: `companion-docs` (KYC) and `patient-docs`. Never
make them public. Access via policies + signed URLs.

---

## 8. Running it locally

```bash
npm install                       # at repo root, once — workspaces hoist
npm run dev -w @caresy/website    # or @caresy/companion / @caresy/admin
```

Env vars per app in `.env.local` (gitignored):

| Var | Where | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | all apps | everything |
| `SUPABASE_SERVICE_ROLE_KEY` | website server only | push delivery |
| `CRON_SECRET` | website server only | the cron routes |
| `NEXT_PUBLIC_UPI_VPA` | website + companion | UPI buttons (unset ⇒ cash-only) |

> **Security:** `SUPABASE_SERVICE_ROLE_KEY` may appear in `apps/website` server
> routes and nowhere else. Never in a `NEXT_PUBLIC_*` var, never in a client
> component, never in the companion or admin app, never in the Capacitor shell.
> An anon-key leak is low severity by design — RLS holds. A service-role leak is
> total compromise: rotate immediately.

⚠️ **Do not run `npm run dev` in an AI sandbox.** Turbopack has spawned runaway
processes here. Verify with `build` plus a Vercel preview instead.

To sanity-check that things actually work, run the three smoke tests in
`ARCHITECTURE.md`: service area (201009 books, 110001 blocked), companion loop
(register → approve → job appears), money loop (book → accept → start →
complete & bill → collect → amount matches on `my-bookings`).

---

## 9. Deploying

One GitHub repo → three Vercel projects, each with a different **Root
Directory** (`apps/website`, `apps/companion`, `apps/admin`). "Include files
outside the Root Directory" must stay enabled — apps import `packages/*`.

Migrations do **not** deploy with the code. Paste them into the Supabase SQL
Editor yourself, in order, and tick the ledger.

Full runbook, DNS records, and Supabase redirect URLs: `DEPLOYMENT.md`.

---

## 10. Conventions

Full standards in `CLAUDE.md`. The ones you will hit on day one:

- **TypeScript strict, no `any`.** Model the type or use `unknown` + a narrow.
- Supabase FK joins are typed as **arrays** by the client even for many-to-one.
  Cast with `as unknown as T[]` at the query boundary, not deeper.
- Naming: components/types `PascalCase`, functions/vars `camelCase`, DB columns
  and SQL functions `snake_case`, enum values `SCREAMING_SNAKE`.
- **Reuse `@caresy/ui`.** Do not start a parallel design system. Style with the
  tokens in `theme.css`.
- **Tests:** no framework. Non-trivial logic (money, validation, parsers,
  anything branchy) leaves one runnable `assert`-based self-check beside it:

  ```bash
  node --experimental-strip-types packages/utils/src/pricing.check.ts   # silence = pass
  ```

  Check *properties* (monotonic price, no arbitrage), not just examples. UI and
  glue code get no test — smoke them instead.

### Before you say "done"

```bash
npx tsc --noEmit                  # in each touched app/package
npm run lint -w @caresy/<app>     # pre-existing errors fine; new ones are not
node --experimental-strip-types src/<module>.check.ts   # if logic changed
npm run build -w @caresy/<app>    # the real gate — Vercel runs this
graphify update .                 # keep the knowledge graph current
```

Then update the doc your change invalidated, **in the same commit**:
`ARCHITECTURE.md` if a module boundary moved, `DATABASE.md` if you added a
migration, a new `ADR/` entry if you made a choice a future reader would
question, `NEXT_SESSION.md` if in-flight state changed.

---

## 11. Traps that catch newcomers

- **Adding a check only in React.** It is not a check. Put it in RLS or a
  trigger, and keep the client copy as UX only.
- **Writing a money column directly.** It will be rejected. Go through
  `complete_booking()` / `record_payment()`.
- **Editing an applied migration.** Never. New number, fix forward.
- **Assuming a helper doesn't exist.** `packages/utils` and `packages/ui`
  probably already have it. `graphify query "<question>"` first, then `rg`.
- **Signing in on a raw `*.vercel.app` URL.** Unsupported — auth cookies are
  scoped to `.caresy.co.in` and Supabase's redirect allowlist ignores wildcard
  subdomain entries. Use the custom domains.
- **Reading a whole file to answer a narrow question.** Budget rules in
  `CLAUDE.md`: graphify → `rg` → a specific file range. The repo is the source
  of truth, not the chat.

---

## 12. Known gaps

Do not assume these are handled:

- **No RLS test suite.** Policies are reviewed by reading. Any policy touching
  `bookings`, `patients` or `locations` deserves a manual check that a companion
  cannot read PII for jobs they have not accepted.
- **No rate limiting** on public inserts (`contact_messages`, waitlist,
  companion registration).
- **No account deletion flow** — required by both app stores before mobile ship.
- **No Sign in with Apple** — required by App Store guideline 4.8 because Google
  sign-in is offered.
- **No Android release signing config** — `apps/mobile/android/app/build.gradle`
  has no `signingConfig`, so no uploadable AAB yet.
- Duplicate patient rows from an earlier `/quick-help` bug; merge migration 32
  is written but not applied.

Live status always in `docs/NEXT_SESSION.md` — **read it first after any `/clear`.**

---

## 13. Reading order

1. This file.
2. `docs/NEXT_SESSION.md` — what is in flight and what is broken right now.
3. `CLAUDE.md` — how code is written here.
4. `docs/ARCHITECTURE.md` — module ownership table.
5. `docs/DATABASE.md` + the header comments of migrations 13, 26, 31.
6. `docs/SECURITY.md`.
7. `docs/ADR/` — the *why* behind every decision above. Ten minutes, all of it.
8. `docs/TROUBLESHOOTING.md` — when it breaks.
