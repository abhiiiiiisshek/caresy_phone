#!/usr/bin/env node
// Smoke checks for the loops that silently break bookings if a migration or an
// RLS policy regresses. Read-only against the live project with the anon key —
// no rows are created. Run: node scripts/smoke.mjs
//
// Covers docs/DEVELOPER_HANDOFF.md §9: service-area validation (owner concern
// #4), the expiry sweep being callable (concern #1), and the RLS wall that
// keeps patient PII away from anonymous callers.
//
// ponytail: no framework, no auth. The authenticated loops (companion accept,
// out-of-area booking insert) need a signed-in session — add a service-role
// variant if those start regressing.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  // .env.local is gitignored, so a fresh clone won't have one — fall back to
  // the real environment rather than blowing up with ENOENT.
  const env = { ...process.env };
  try {
    const raw = readFileSync(join(root, 'apps/website/.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(
    url && key,
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY — in apps/website/.env.local or the environment.',
  );
  return { url: url.replace(/\/$/, ''), key };
}

const { url, key } = loadEnv();
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

const get = (path) => fetch(`${url}/rest/v1/${path}`, { headers });
const rpc = (fn, body = {}) =>
  fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(body) });

// Preflight: a bad key 401s on everything, which would make the RLS checks
// below "pass" for the wrong reason. Fail loudly instead.
{
  const res = await get('service_areas?select=pincode&limit=1');
  if (res.status === 401) {
    console.error(`Anon key rejected by ${url}: ${(await res.json()).message}`);
    console.error('Fix NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/website/.env.local (Dashboard > Project Settings > API keys).');
    process.exit(2);
  }
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push([true, name]);
  } catch (err) {
    results.push([false, `${name}\n    ${err.message.split('\n')[0]}`]);
  }
}

// 1. Service area — the "Gaur City rejected" bug (concern #4). The DB function
//    is authoritative; the UI mirrors it in packages/utils/src/serviceArea.ts.
await check('service_areas is readable and seeded', async () => {
  const res = await get('service_areas?select=pincode,city,is_active&is_active=eq.true');
  assert.equal(res.status, 200, `expected 200, got ${res.status}`);
  const rows = await res.json();
  assert.ok(rows.length > 0, 'no active service areas — every booking would be rejected');
});

await check('is_pincode_served: 201009 (Gaur City) served', async () => {
  const res = await rpc('is_pincode_served', { p: '201009' });
  const body = await res.text();
  assert.equal(res.status, 200, `expected 200, got ${res.status}: ${body}`);
  assert.equal(JSON.parse(body), true);
});

await check('is_pincode_served: 110001 (Delhi) NOT served', async () => {
  assert.equal(await (await rpc('is_pincode_served', { p: '110001' })).json(), false);
});

await check('is_pincode_served: junk input rejected, not thrown', async () => {
  assert.equal(await (await rpc('is_pincode_served', { p: '' })).json(), false);
  assert.equal(await (await rpc('is_pincode_served', { p: 'abcdef' })).json(), false);
});

// 2. Expiry sweep (concern #1) — pg_cron calls this every 5 min. It only
//    touches rows already past their expiry, so calling it here is a no-op
//    unless something was genuinely overdue.
await check('expire_stale_bookings() is callable', async () => {
  const res = await rpc('expire_stale_bookings');
  assert.equal(res.status, 200, `expected 200, got ${res.status}: ${await res.text().catch(() => '')}`);
});

// 3. RLS wall — anonymous callers must not read patient/booking/contact PII.
for (const table of ['bookings', 'patients', 'locations', 'profiles', 'notifications', 'contact_messages']) {
  await check(`RLS: anon cannot read ${table}`, async () => {
    const res = await get(`${table}?select=*&limit=1`);
    // 200 + [] means the table exists and RLS returned nothing. A 404 would
    // mean the table is gone — that must fail, not pass by absence.
    assert.equal(res.status, 200, `expected 200 (table present), got ${res.status}`);
    const rows = await res.json();
    assert.equal(rows.length, 0, `anon read ${rows.length} row(s) from ${table} — PII is exposed`);
  });
}

const failed = results.filter(([ok]) => !ok);
for (const [ok, name] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
