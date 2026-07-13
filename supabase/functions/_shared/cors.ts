// Shared CORS handling for Caresy Edge Functions.
//
// Edge Functions do NOT get automatic CORS handling, so any browser (web
// portal) call must be answered with the right Access-Control-* headers and an
// OPTIONS preflight. We use a dynamic allow-list of our own origins (plus
// Vercel previews and localhost) rather than a blanket '*', since these
// functions run privileged logic. The mobile app calls via
// supabase.functions.invoke and is not subject to browser CORS.

const STATIC_ALLOWED = new Set<string>([
  "https://caresy.co.in",
  "https://companion.caresy.co.in",
  "https://admin.caresy.co.in",
  "http://localhost:3000",
  "http://localhost:8081", // Expo web / Metro dev server
]);

// Vercel preview deployments, e.g. https://caresy-git-feature-team.vercel.app
const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+-caresy[a-z0-9-]*\.vercel\.app$/;

function isAllowed(origin: string): boolean {
  return STATIC_ALLOWED.has(origin) || VERCEL_PREVIEW.test(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  // Echo the request origin only when it's on the allow-list; otherwise fall
  // back to the canonical site so we never reflect an arbitrary origin.
  const allowOrigin = origin && isAllowed(origin) ? origin : "https://caresy.co.in";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
