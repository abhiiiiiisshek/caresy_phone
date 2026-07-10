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
