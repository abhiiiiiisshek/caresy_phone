import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Expiry sweep endpoint. Moves timed-out PENDING requests to EXPIRED via the DB
// function. Meant to be hit on a schedule.
//
// Scheduling (pick one):
//   • pg_cron in Supabase (recommended, free, every 5 min) — see migration 13.
//   • An external uptime cron (e.g. cron-job.org) calling this URL every 5 min
//     with header `Authorization: Bearer <CRON_SECRET>`.
//   • Vercel Cron — only on Pro (Hobby caps cron at once/day); add a vercel.json
//     `crons` entry if you're on Pro.
//
// Protection: if CRON_SECRET is set, the caller must send it as a Bearer token.

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
