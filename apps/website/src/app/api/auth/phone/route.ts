import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { phoneFromVerifyResult } from '@/lib/msg91';

// Trades a verified MSG91 OTP for a Supabase session.
//
// The browser proves nothing: it sends only the widget's access-token. This
// route asks MSG91 which number that token belongs to (the authkey is secret
// and lives here), then mints a one-shot magic-link token hash for that user's
// account. No email is ever sent — the hash goes straight back to the browser,
// which calls verifyOtp() to get a real session. That is the only supported way
// to hand a Supabase session to a user we authenticated ourselves.
//
// Env: MSG91_AUTHKEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL.

export const dynamic = 'force-dynamic';

const VERIFY_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';

/** Domain for accounts that have a number but no real email address. */
const PHONE_EMAIL_DOMAIN = 'phone.caresy.co.in';

export async function POST(request: Request) {
  const authkey = process.env.MSG91_AUTHKEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!authkey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Phone sign-in is not configured.' }, { status: 503 });
  }

  const { accessToken } = await request.json().catch(() => ({ accessToken: null }));
  if (typeof accessToken !== 'string' || !accessToken) {
    return NextResponse.json({ error: 'Missing access token.' }, { status: 400 });
  }

  let verified: unknown = null;
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authkey, 'access-token': accessToken }),
    });
    verified = await response.json();
  } catch {
    return NextResponse.json({ error: 'Could not reach the OTP service.' }, { status: 502 });
  }

  const phone = phoneFromVerifyResult(verified);
  if (!phone) {
    return NextResponse.json({ error: 'That OTP could not be verified.' }, { status: 401 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Reuse the account this number already belongs to, so someone who signed in
  // with Google and gave us their number lands on the same account when they
  // later use OTP. find_user_by_phone (migration 33) checks both profiles.phone
  // AND auth.users.phone, so an OTP account whose profile row never got written
  // is still found. Oldest wins. Never off auth.users from the browser — this
  // RPC is service-role-only for exactly that reason.
  const { data: existing } = await admin
    .rpc('find_user_by_phone', { p_phone: phone })
    .maybeSingle<{ id: string; email: string | null }>();

  let email: string | undefined = existing?.email ?? undefined;

  if (!email) {
    // OTP-only accounts have no real address; Supabase still keys sessions off
    // email, so synthesise a non-deliverable one that maps 1:1 to the number.
    email = `${phone.slice(-10)}@${PHONE_EMAIL_DOMAIN}`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      phone_confirm: true,
    });
    // "already been registered" means a previous run created it and the profile
    // row is missing or has no phone — the magic link below still works.
    if (error && !/already/i.test(error.message)) {
      return NextResponse.json({ error: 'Could not create your account.' }, { status: 500 });
    }
    // Seed the number so onboarding only has to ask for a name and age.
    if (created?.user) {
      await admin.from('profiles').upsert({ id: created.user.id, phone }, { onConflict: 'id' });
    }
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return NextResponse.json({ error: 'Could not start your session.' }, { status: 500 });
  }

  return NextResponse.json({ tokenHash });
}
