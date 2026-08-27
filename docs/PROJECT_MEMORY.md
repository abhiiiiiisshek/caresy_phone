# PROJECT_MEMORY.md — durable "what & why"

Stable facts a fresh session needs. Slow-moving. For **in-flight / next** work
see [NEXT_SESSION.md](./NEXT_SESSION.md). For the *why* behind big choices see
`docs/ADR/`. Keep this lean — if it needs a paragraph, it's an ADR.

> Ritual on restart or when context is about to fill:
> 1. Read this file + `NEXT_SESSION.md`.
> 2. Update `NEXT_SESSION.md` before you `/clear`.
> 3. Record any new architectural decision in Graphify (`graphify update .`) and,
>    if a future reader would question it, a `docs/ADR/NNNN-*.md` entry.

## What Caresy is

Hospital-companion marketplace. Customer books a verified companion for a
hospital visit; companion accepts, travels, logs the visit; server settles the
bill. Web + Android (Capacitor) + iOS.

## Stack (do not substitute — see CLAUDE.md)

Next.js 16 App Router · React 19 · TypeScript strict · Supabase (Postgres +
Auth + Storage + RLS) · Tailwind v4 + CSS token vars · lucide-react ·
Capacitor 7 (Android) · iOS native shell · Vercel.

Monorepo: `apps/{website,admin,companion}` + `packages/{ui,auth,types,utils}`.

## Load-bearing rules

- **Server-authoritative money.** Prices/payment state computed in Postgres
  (`26_BILLING.sql`), written only via SECURITY DEFINER RPCs. Client
  `packages/utils/src/pricing.ts` only draws the quote. Rate change = both, one commit.
- **RLS is the security boundary**, not the UI. New table → policies in the same migration.
- Money is integer **paise**. Format only at render with `formatINR`.
- Shared logic → `packages/`. Copy-pasting a helper between apps is a bug.
- Migrations `NN_TOPIC.sql`, sequential, idempotent, never edited after they run.

## Milestones done

- **Auth:** MSG91 phone-OTP sign-in (`packages/auth/src/msg91.ts`,
  `AuthContext.startPhoneOtp/confirmPhoneOtp`). Sign in with Apple client secret
  JWT generated (Team `46CLB4HU9B`, Services ID `in.co.caresy.web`, ES256, 180d).
- **iOS:** automatic signing wired (Team `46CLB4HU9B`, bundle `in.co.caresy.app`),
  commit `fe9d1b3`.
- **Login UX:** "Ellie the elephant" mascot covers eyes during OTP entry
  (`apps/website/src/app/login/page.tsx`), mood API `'peek'|'cover'|'happy'`.
- **Data:** 33 migrations live. serviceArea helpers refactored to injected
  Supabase client (DI).
- **Companion signup:** police verification + driving licence now **optional**;
  pending optional docs surfaced on pending-review card + approved dashboard
  (`apps/companion/src/app/page.tsx`, commit `6dc9600`, on `main`).
- **Legal:** privacy policy rewritten for real DPDP data flows + sole-prop
  entity; all `FILL` blanks filled in, live on `main`.
- **Login bundle shipped:** MSG91 phone-OTP (`c92fa20`, `6f3e746`) + Sign in
  with Apple (`7d31fc0`), all on `main`.
- **Migrations 27 (`TRANSPORT`), 29 (`FIX_AUDIT_RLS`), 32
  (`MERGE_DUPLICATE_PATIENTS`)** committed on `main`.

## Key identifiers

- Apple Team ID `46CLB4HU9B` (individual enrollment).
- iOS bundle `in.co.caresy.app` · Apple Services ID `in.co.caresy.web`.
- Repo: `github.com/abhiiiiiisshek/caresy_phone`. Active branch `main`.
- Contact ops WhatsApp `+91 9717500225`.

## Gotchas

- Do **not** `npm run dev` in sandbox (Turbopack spawns runaway procs). Verify
  with `build` + Vercel preview.
- This Next.js has breaking changes vs training data — read
  `node_modules/next/dist/docs/` before writing Next code.
- Supabase FK joins typed as arrays even for many-to-one; cast at query boundary.
