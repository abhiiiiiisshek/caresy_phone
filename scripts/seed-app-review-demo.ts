// Seed for App Review demo account (issue: App Review cannot complete a booking).
// Choice: option (a) — demo account pre-seeded with valid Indian number and booking.
// Why (a) over (b): widening the phone validator to E.164 would let a reviewer
// enter a US number, but the service area is still Noida — the booking would
// then fail at the pincode/trigger step with a confusing "not served" error.
// It also widens the contract for website + companion + mobile (packages/utils)
// and the SQL guard `enforce_service_area` would still block out-of-area
// bookings. Option (c) (reviewer-specific bypass) is a rejection risk per
// Apple guideline 2.1. Option (a) is minimal, honest, and requires no code
// change to `isValidIndianMobile` — the validator stays India-only as
// documented in `packages/utils/src/phone.ts`.
//
// What this does (idempotent):
//   1. Creates or reuses the auth user named by DEMO_APP_REVIEW_EMAIL, with
//      DEMO_APP_REVIEW_PASSWORD — never hardcoded, this repo is public
//   2. Upserts profile with phone +919999999999 (passes isValidIndianMobile) and onboarding_completed
//   3. Ensures patient + pickup/destination locations with served pincode 201301 (Noida)
//   4. Creates one SCHEDULED PENDING booking (HOSPITAL_COMPANION) for tomorrow 10am IST
//   5. Suppresses the auto-enqueued ADMIN notification (marks SKIPPED) so ops phone not paged
//
// Run:  node --experimental-strip-types scripts/seed-app-review-demo.ts
// Needs: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
//        DEMO_APP_REVIEW_EMAIL and DEMO_APP_REVIEW_PASSWORD in
//        apps/website/.env.local or the environment.
// Do NOT run casually against production — it writes real rows and the ADMIN
// notification would page ops via ntfy if not suppressed. Run once before
// submitting to App Store, then verify via `scripts/smoke.mjs` or admin panel.
//
// After seeding, paste the notes in docs/APP_REVIEW_NOTES.md into App Store Connect.

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { isValidIndianMobile, toE164 } from '../packages/utils/src/phone.ts';
import { isValidPincode } from '../packages/utils/src/serviceArea.ts';

const DEMO_PHONE_RAW = '9999999999';
const DEMO_PHONE_E164 = '+919999999999';
const DEMO_PINCODE = '201301';
const DEMO_NAME = 'App Review Demo';

// ── self-check (no DB) ──────────────────────────────────────────────────
assert.equal(isValidIndianMobile(DEMO_PHONE_RAW), true, 'demo phone must pass isValidIndianMobile');
assert.equal(toE164(DEMO_PHONE_RAW), DEMO_PHONE_E164, 'demo phone E164 mismatch');
assert.equal(toE164(DEMO_PHONE_E164), DEMO_PHONE_E164, 'E164 round-trip');
assert.equal(isValidPincode(DEMO_PINCODE), true, 'demo pincode must be valid 6-digit');
console.log(`phone: ${DEMO_PHONE_RAW} -> ${DEMO_PHONE_E164} valid=${isValidIndianMobile(DEMO_PHONE_RAW)}`);
console.log(`pincode: ${DEMO_PINCODE} valid=${isValidPincode(DEMO_PINCODE)}`);

// ── env ─────────────────────────────────────────────────────────────────
function loadEnv(): { url: string; serviceKey: string; email: string; password: string } {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const env: Record<string, string> = { ...process.env as Record<string,string> };
  for (const p of [join(root, 'apps/website/.env.local'), join(root, '.env.local')]) {
    try {
      const raw = readFileSync(p, 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !env[m[1]]) env[m[1]] = m[2].trim();
      }
    } catch {}
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  // Neither identity value is a constant in this file. The repo is public, and
  // these open a real account on production Supabase carrying a profile, a
  // patient record and a booking. The password lived here in plaintext until
  // 2026-08-31 — that one (`DemoAppReview2026!` on app-review@caresy.co.in) is
  // burned. Which account App Review uses is a Console-side decision that
  // changes without the code changing, so it is configuration, not source.
  // Re-running this script points the seed data at whatever the env names.
  const email = env.DEMO_APP_REVIEW_EMAIL;
  const password = env.DEMO_APP_REVIEW_PASSWORD;
  assert.ok(url, 'Missing NEXT_PUBLIC_SUPABASE_URL');
  assert.ok(serviceKey, 'Missing SUPABASE_SERVICE_ROLE_KEY (service-role, not anon)');
  assert.ok(
    email,
    'Missing DEMO_APP_REVIEW_EMAIL — set it in apps/website/.env.local or the environment.',
  );
  assert.ok(
    password,
    'Missing DEMO_APP_REVIEW_PASSWORD — set it in apps/website/.env.local or the environment. ' +
      'Never hardcode it here; this repo is public.',
  );
  return { url: url.replace(/\/$/, ''), serviceKey, email, password };
}

// Only connect if keys present and not in --check-only mode
const checkOnly = process.argv.includes('--check-only');
if (checkOnly) {
  console.log('check-only: phone/pincode validation ok, not touching DB');
  process.exit(0);
}

const { url, serviceKey, email: DEMO_EMAIL, password: DEMO_PASSWORD } = loadEnv();
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  console.log(`Seeding demo account ${DEMO_EMAIL} against ${url}`);

  // 1. auth user
  let userId: string;
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = (existing?.users ?? []).find((u) => u.email === DEMO_EMAIL);
  if (found) {
    userId = found.id;
    console.log(` - auth user exists: ${userId}`);
    // reset password to known demo password
    const { error: updErr } = await supabase.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD, email_confirm: true, phone: DEMO_PHONE_E164 });
    if (updErr) console.warn('   updateUser warning:', updErr.message);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      phone: DEMO_PHONE_E164,
      user_metadata: { full_name: DEMO_NAME },
    });
    if (error) throw error;
    userId = data.user!.id;
    console.log(` - created auth user: ${userId}`);
  }

  // 2. profile
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: DEMO_NAME,
    phone: DEMO_PHONE_E164,
    onboarding_completed: true,
  }, { onConflict: 'id' });
  if (profErr) throw profErr;
  console.log(' - profile upserted');

  // 3. patient
  const { data: patExisting } = await supabase.from('patients').select('id').eq('customer_user_id', userId).eq('full_name', DEMO_NAME).maybeSingle();
  let patientId: string;
  if (patExisting) {
    patientId = (patExisting as { id: string }).id;
    console.log(` - patient exists: ${patientId}`);
  } else {
    const { data: pat, error: patErr } = await supabase.from('patients').insert({
      customer_user_id: userId,
      full_name: DEMO_NAME,
      age: 68,
      emergency_contact_phone: DEMO_PHONE_E164,
    }).select('id').single();
    if (patErr) throw patErr;
    patientId = (pat as { id: string }).id;
    console.log(` - patient created: ${patientId}`);
  }

  // 4. locations
  async function ensureLocation(title: string): Promise<string> {
    const { data: loc } = await supabase.from('locations').select('id').eq('customer_user_id', userId).eq('title', title).eq('pincode', DEMO_PINCODE).maybeSingle();
    if (loc) return (loc as { id: string }).id;
    const { data, error } = await supabase.from('locations').insert({
      customer_user_id: userId,
      title,
      address_line_1: title,
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: DEMO_PINCODE,
    }).select('id').single();
    if (error) throw error;
    return (data as { id: string }).id;
  }
  const pickupId = await ensureLocation('Fortis Hospital, Sector 62, Noida');
  const destId = await ensureLocation('Home');
  console.log(` - locations: pickup ${pickupId}, dest ${destId}`);

  // 5. booking - one scheduled for tomorrow 10am IST (UTC+5:30)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0); // local time; Supabase stores UTC but trigger handles expiry relative to scheduled_start_time
  // Check existing demo booking to keep idempotent
  const { data: existingBooking } = await supabase.from('bookings').select('id, reference_code, status').eq('customer_user_id', userId).eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  let bookingId: string;
  if (existingBooking && (existingBooking as { status: string }).status === 'PENDING') {
    bookingId = (existingBooking as { id: string }).id;
    console.log(` - booking exists: ${bookingId} ${(existingBooking as { reference_code: string }).reference_code}`);
  } else {
    const { data, error } = await supabase.from('bookings').insert({
      customer_user_id: userId,
      patient_id: patientId,
      pickup_location_id: pickupId,
      destination_location_id: destId,
      service_type: 'HOSPITAL_COMPANION',
      booking_type: 'SCHEDULED',
      status: 'PENDING',
      scheduled_start_time: tomorrow.toISOString(),
      special_instructions: 'Demo booking for App Review — please do not dispatch.',
      service_metadata: { demo: true, source: 'seed-app-review-demo' },
    }).select('id, reference_code').single();
    if (error) throw error;
    bookingId = (data as { id: string }).id;
    console.log(` - booking created: ${bookingId} ${(data as { reference_code: string }).reference_code} for ${tomorrow.toISOString()}`);
    // Suppress ops page: mark its ADMIN notification as SKIPPED so ntfy not paged
    const { error: notifErr } = await supabase.from('notifications').update({ status: 'SKIPPED', error: 'demo booking — not paging ops' }).eq('booking_id', bookingId).eq('recipient_role', 'ADMIN').eq('status', 'QUEUED');
    if (notifErr) console.warn('   suppress notification warning:', notifErr.message);
    else console.log(' - suppressed ADMIN notification (SKIPPED)');
  }

  console.log('\nDone. App Review notes:');
  console.log('  Email:    ' + DEMO_EMAIL);
  console.log('  Password: ' + DEMO_PASSWORD);
  console.log('  Phone:    ' + DEMO_PHONE_E164 + ' (valid Indian mobile, passes isValidIndianMobile)');
  console.log('  Pincode:  ' + DEMO_PINCODE + ' (Noida, served)');
  console.log('  Booking:  ' + bookingId + ' — visible in My Bookings after sign-in');
  console.log('\nPaste docs/APP_REVIEW_NOTES.md into App Store Connect > App Review notes.');
}

main().catch((e) => { console.error(e); process.exit(1); });
