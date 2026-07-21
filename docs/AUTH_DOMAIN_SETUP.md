# Auth & Domain Configuration

How Google sign-in works across the three Caresy domains, and the one-time
dashboard config that has to match. **The code side is done** (see
`packages/auth/`); everything below is Supabase / Google Cloud console setup.

## How the flow works (already built)

- **Provider:** Google OAuth only. No email/password, magic-link, or OTP — so
  there are **no Supabase auth email templates to configure** right now. (Add
  them only if email-based auth is introduced later.)
- **Subdomain logins route through the apex.** Supabase's redirect allowlist
  can't wildcard `*.caresy.co.in`, so a login on `companion.` or `admin.`
  sends the user to `https://caresy.co.in/auth/callback` with an absolute
  `next` back to the originating subdomain. Cookies are parent-domain scoped,
  so the PKCE exchange completes on the apex and the session is visible on the
  subdomain. (`AuthContext.signInWithGoogle` + `packages/auth/src/supabase/callback.ts`.)
- **Open-redirect safe.** The callback only honors `next` for `caresy.co.in`
  and its subdomains; relative paths stay on-origin; protocol-relative (`//…`)
  is rejected.
- **Preview/prod host fix.** In production, any non-canonical host hitting the
  callback (e.g. a `*.vercel.app` fallback) is bounced to the canonical host
  first so the verifier cookie is present.

## Supabase dashboard config

Project: `https://nhghrrtvecmsipeidmgj.supabase.co` → **Authentication → URL Configuration**

- **Site URL:** `https://caresy.co.in`
  (must be the apex — its origin is always accepted, which is what the
  subdomain-through-apex flow relies on.)
- **Redirect URLs** (allowlist — add all):
  - `https://caresy.co.in/auth/callback`
  - `https://companion.caresy.co.in/auth/callback`
  - `https://admin.caresy.co.in/auth/callback`
  - `http://localhost:3000/auth/callback` (local dev)
  - `https://*.vercel.app/auth/callback` (only if you sign in on preview deploys)

  > Subdomain logins actually land on the apex callback, so `caresy.co.in` is
  > the essential one. The subdomain entries are listed for completeness /
  > direct-login safety.

**Authentication → Providers → Google:** enabled, with the Client ID + Secret
from Google Cloud.

## Google Cloud console (OAuth client)

**APIs & Services → Credentials → your OAuth 2.0 Client:**

- **Authorized JavaScript origins:** `https://caresy.co.in`,
  `https://companion.caresy.co.in`, `https://admin.caresy.co.in`,
  `http://localhost:3000`
- **Authorized redirect URI:**
  `https://nhghrrtvecmsipeidmgj.supabase.co/auth/v1/callback`
  (Supabase's own callback — Google always returns to Supabase, which then
  redirects to the app callback above.)

## Verify

1. Sign in on each of `caresy.co.in`, `companion.caresy.co.in`,
   `admin.caresy.co.in`; confirm you land back on the same site, signed in.
2. Sign in on a subdomain from a deep link (`?next=/my-bookings` style) and
   confirm you return to that exact path.
3. Sign out on one tab; confirm other open tabs on sibling subdomains lose the
   session (parent-domain cookie).
4. **Web ↔ mobile parity:** pending — the mobile client (`caresy-app`) shares
   this Supabase project; verify its redirect scheme is in the allowlist when
   that repo is wired up.
