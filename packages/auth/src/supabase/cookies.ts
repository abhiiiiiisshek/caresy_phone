/**
 * Auth cookies are scoped to the parent domain on production hosts so that
 * (a) the apex /auth/callback can complete a PKCE exchange started on a
 * subdomain — Supabase's redirect allowlist rejects *.caresy.co.in entries
 * (dashboard bug, entries visible but never matched), so subdomain logins
 * route through the apex — and (b) one session works on all three domains.
 * Anywhere else (localhost, vercel previews) cookies stay host-only.
 */
export function cookieDomain(host: string): string | undefined {
  return host === 'caresy.co.in' || host.endsWith('.caresy.co.in') ? '.caresy.co.in' : undefined;
}

export function cookieOptionsFor(host: string) {
  const domain = cookieDomain(host);
  return domain ? { cookieOptions: { domain, path: '/', sameSite: 'lax' as const, secure: true } } : {};
}
