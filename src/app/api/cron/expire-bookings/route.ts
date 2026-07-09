import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Expiry sweep endpoint, called on a schedule by Vercel Cron (see vercel.json).
// Moves timed-out PENDING requests to EXPIRED via the DB function. Protected by
// CRON_SECRET so only the scheduler can trigger it.
//
// Setup: add a CRON_SECRET env var in Vercel. Vercel Cron automatically sends
// it as `Authorization: Bearer <CRON_SECRET>`.

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.rpc('expire_stale_bookings');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: data ?? 0, ranAt: new Date().toISOString() });
}
