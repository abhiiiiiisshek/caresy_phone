import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { cookieOptionsFor } from './cookies';

export async function createClient() {
  const cookieStore = await cookies();
  const host = ((await headers()).get('host') ?? '').split(':')[0];

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...cookieOptionsFor(host),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // This can be ignored if the client is run in a read-only environment
            // like a Server Component during render.
          }
        },
      },
    }
  );
}
