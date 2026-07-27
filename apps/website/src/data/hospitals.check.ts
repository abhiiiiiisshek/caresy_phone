// Self-check for the area -> pincode autofill. No framework, no network:
//   node --experimental-strip-types src/data/hospitals.check.ts
// from apps/website. Silence means pass.
//
// The two failure modes this guards are both silent in the browser:
//   * a typo in an AREA_PINCODE key never matches any hospital, so the autofill
//     just quietly never fires;
//   * a pincode that is not in service_areas fills the field with a value the
//     booking trigger will reject at submit.

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { AREA_PINCODE, HOSPITALS, pincodeForArea } from './hospitals.ts';

// Seeded coverage, read from the migration rather than copied — one source.
const sql = readFileSync(new URL('../../../../supabase/migrations/11_SERVICE_AREAS.sql', import.meta.url), 'utf8');
const served = new Set([...sql.matchAll(/\('(\d{6})',/g)].map((m) => m[1]));
assert.ok(served.size > 5, `only parsed ${served.size} pincodes from migration 11 — parser or file changed`);

const areas = new Set(HOSPITALS.map((h) => h.area));

for (const [area, pin] of Object.entries(AREA_PINCODE)) {
  assert.match(pin, /^\d{6}$/, `${area}: "${pin}" is not a 6-digit pincode`);
  assert.ok(served.has(pin), `${area}: ${pin} is not in service_areas — booking would be rejected on submit`);
  assert.ok(areas.has(area), `"${area}" matches no hospital's area — typo, so the autofill never fires`);
}

// The lookup only answers for mapped areas; everything else falls back to chips.
assert.equal(pincodeForArea('Sector 18, Noida'), '201301');
assert.equal(pincodeForArea('Noida'), undefined, 'bare "Noida" has 7 served pincodes and must not be guessed');
assert.equal(pincodeForArea('Greater Noida'), undefined);
assert.equal(pincodeForArea('Greater Noida West'), undefined);
assert.equal(pincodeForArea(''), undefined);
assert.equal(pincodeForArea('Nowhere'), undefined);

// Hospital rows stay well-formed — a blank name breaks the autocomplete's filter.
for (const h of HOSPITALS) {
  assert.ok(h.name.trim(), 'hospital with an empty name');
  assert.ok(h.area.trim(), `${h.name} has no area`);
}

const covered = HOSPITALS.filter((h) => pincodeForArea(h.area)).length;
const pct = Math.round((covered / HOSPITALS.length) * 100);
console.log(`hospitals: ok (${covered}/${HOSPITALS.length} autofill, ${pct}%)`);
