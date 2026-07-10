import { NextRequest, NextResponse } from 'next/server';
import { createClient } from './server';

/**
 * Shared /auth/callback GET handler. `canonicalHost` is the app's production
 * domain (e.g. "companion.caresy.co.in").
 *
 * If Supabase's redirect-URL allowlist misses an entry it silently falls back
 * to its Site URL, landing the user on a *.vercel.app host where the PKCE
 * verifier cookie doesn't exist — the exchange fails and the user is stranded
 * logged-out on the wrong domain. So on production we first bounce the whole
 * callback (code included) to the canonical host and exchange there.
 */
export function authCallback(canonicalHost: string) {
  return async function GET(request: NextRequest) {
    const url = new URL(request.url);

    if (process.env.VERCEL_ENV === 'production' && url.hostname !== canonicalHost) {
      url.protocol = 'https:';
      url.host = canonicalHost;
      return NextResponse.redirect(url);
    }

    const code = url.searchParams.get('code');
    const rawNext = url.searchParams.get('next') || '/';
    // Relative paths only — never redirect off-domain.
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(`${url.origin}/?auth_error=${encodeURIComponent(error.message)}`);
      }
    }

    return NextResponse.redirect(`${url.origin}${next}`);
  };
}
