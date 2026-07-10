# Caresy Monorepo Deployment

One GitHub repo → three Vercel projects, each with a different Root Directory.

| App | Root Directory | Production domain | Vercel project |
|---|---|---|---|
| Consumer website | `apps/website` | `caresy.co.in` | existing (caresy-phone) |
| Companion portal | `apps/companion` | `companion.caresy.co.in` | new |
| Admin dashboard | `apps/admin` | `admin.caresy.co.in` | new |

## 1. Update the existing Vercel project (website)

1. Vercel → caresy-phone project → Settings → Build & Development → **Root Directory** = `apps/website`.
2. Leave "Include files outside the Root Directory" **enabled** (default) — the app imports `packages/*`.
3. Redeploy. `caresy-phone.vercel.app` must serve exactly as before.

Do this immediately after pushing the monorepo commits; until the setting is changed, the next deploy would fail (no `package.json` build at repo root produces a site).

## 2. Create the two new Vercel projects

For each of `companion` and `admin`:

1. Vercel → Add New Project → import the **same** GitHub repo.
2. Root Directory: `apps/companion` (resp. `apps/admin`). Framework preset: Next.js.
3. Environment variables (copy from the website project):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy and verify the `*.vercel.app` URL renders and Google sign-in round-trips.

The `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` vars are only used by
`/api/cron/expire-bookings`, which stays in the **website** project — set them there only.

## 3. Supabase Auth redirect URLs

Supabase Dashboard → Authentication → URL Configuration → **Redirect URLs**, add:

```
https://caresy.co.in/auth/callback
https://companion.caresy.co.in/auth/callback
https://admin.caresy.co.in/auth/callback
https://<companion-project>.vercel.app/auth/callback
https://<admin-project>.vercel.app/auth/callback
```

(Keep the existing `caresy-phone.vercel.app` entry.)

## 4. DNS (at your registrar for caresy.co.in)

| Record | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` (Vercel) |
| CNAME | `companion` | `cname.vercel-dns.com` |
| CNAME | `admin` | `cname.vercel-dns.com` |

Then in each Vercel project → Settings → Domains, add its domain from the table at the top.
Vercel shows the exact records it wants — prefer what the dashboard says if it differs.

## 5. Order of operations (zero downtime)

1. Push monorepo commits → flip website Root Directory (step 1) → verify.
2. Create companion + admin projects (step 2) → verify on vercel.app URLs (login too, step 3 first).
3. Point DNS (step 4).
4. Done. The website already redirects `/companion`, `/admin/*`, `/admin-ops` to the subdomains.

## Notes

- Sessions **are** shared across `caresy.co.in` and its subdomains: auth cookies are scoped to `.caresy.co.in` (`packages/auth/src/supabase/cookies.ts`). Subdomain logins route through the apex `/auth/callback` because Supabase's redirect allowlist never matches `*.caresy.co.in` entries (dashboard shows them; the engine ignores them). Consequence: signing in on raw `*.vercel.app` URLs is unsupported — use the custom domains.
- `supabase/migrations/` holds the SQL (moved from `docs/08_Database/`); run new migrations manually in the Supabase SQL editor as before.
- Local dev: `npm install` at repo root, then `npm run dev -w @caresy/website` (or `@caresy/companion` / `@caresy/admin`).
