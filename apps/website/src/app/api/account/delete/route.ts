import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@caresy/auth/supabase/server';

// Permanently deletes the signed-in user's account (Apple Guideline 5.1.1(v),
// Play data-deletion). Identity comes from the caller's own session — either
// the website's session cookie, or (mobile has no cookie jar) a bearer access
// token — never an id in the body, so a user can only delete themselves.
// Deleting the auth.users row cascades to profiles, patients, locations,
// bookings, trips, care records, push tokens and notifications (all ON DELETE
// CASCADE); companion_user_id on past bookings is ON DELETE SET NULL, so a
// companion's own record is untouched.
//
// Env: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL.

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Account deletion is not configured.' }, { status: 503 });
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const userId = bearer
    ? (await admin.auth.getUser(bearer)).data.user?.id
    : (await (await createServerClient()).auth.getUser()).data.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: 'Could not delete your account. Please contact support.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
