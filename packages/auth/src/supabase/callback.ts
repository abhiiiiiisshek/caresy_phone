import { NextRequest, NextResponse } from 'next/server';
import { createClient } from './server';

/**
 * Shared /auth/callback GET handler. `canonicalHost` is the app's production
 * domain (e.g. "companion.caresy.co.in").
 *
 * Two quirks this handler absorbs:
 * - Supabase falls back to its Site URL when a redirect URL isn't allowlisted,
 *   landing users on a *.vercel.app host where the PKCE verifier cookie doesn't
 *   exist. On production we bounce the whole callback (code included) to the
 *   canonical host first.
 * - Supabase's allowlist never matches *.caresy.co.in entries, so subdomain
 *   logins arrive HERE on the apex with an absolute `next` back to the
 *   subdomain (see AuthContext.signInWithGoogle). Cookies are parent-domain
 *   scoped, so the exchange works on the apex and the session is visible on
 *   the subdomain we hop back to. Absolute `next` is only honored within
 *   *.caresy.co.in.
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

    // Default: relative path on this origin. Absolute URLs are honored only
    // for caresy.co.in and its subdomains — never redirect off-domain.
    let destination = `${url.origin}/`;
    if (rawNext.startsWith('/') && !rawNext.startsWith('//')) {
      destination = `${url.origin}${rawNext}`;
    } else {
      try {
        const target = new URL(rawNext);
        if (
          target.protocol === 'https:' &&
          (target.hostname === 'caresy.co.in' || target.hostname.endsWith('.caresy.co.in'))
        ) {
          destination = target.toString();
        }
      } catch {
        // not a URL — keep default
      }
    }

    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(`${url.origin}/?auth_error=${encodeURIComponent(error.message)}`);
      }
    }

    return NextResponse.redirect(destination);
  };
}
