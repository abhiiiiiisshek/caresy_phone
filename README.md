# Caresy

Monorepo for Caresy — trusted hospital companions.

```
apps/
  website/     Consumer website        → caresy.co.in
  companion/   Companion portal        → companion.caresy.co.in
  admin/       Admin dashboard         → admin.caresy.co.in
packages/
  ui/          Design system components + theme.css
  auth/        AuthContext, AuthModal, Supabase client factories
  types/       Shared domain types
  utils/       Shared utilities (service areas)
supabase/
  migrations/  SQL run manually against the shared Supabase project
```

## Docs

| | |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Coding standards — read before writing code |
| [AGENTS.md](AGENTS.md) | AI workflow + doc map |
| [docs/CURRENT.md](docs/CURRENT.md) | What's in flight and known-broken right now |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Module ownership, request flow, environments |
| [docs/ADR/](docs/ADR/README.md) | Why the big choices were made |
| [docs/DATABASE.md](docs/DATABASE.md) | Migration ledger, tables, enforcement functions |
| [docs/SECURITY.md](docs/SECURITY.md) | RLS model, secrets, buckets, open gaps |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Symptom index + deploy/rollback |

## Live tracking

Real-time companion location tracking spans this repo (Supabase backend) and the
`caresy-app` mobile client.

- **New developer? Start here:** [docs/DEV_ONBOARDING.md](docs/DEV_ONBOARDING.md)
  — what it is, how to import & run it, do's/don'ts, and next steps.
- Status, turn-it-on checklist & vision: [docs/LIVE_TRACKING_HANDOFF.md](docs/LIVE_TRACKING_HANDOFF.md).

## Develop

```bash
npm install                        # once, at the repo root
npm run dev -w @caresy/website     # or @caresy/companion / @caresy/admin
```

Each app needs a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (see its `.env.example`).

## Deploy

Three Vercel projects from this one repo, each with a different Root
Directory. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
