// Self-check for the companion approval rules.
//   node --experimental-strip-types lib/companions.check.ts
//
// Properties that matter:
//   1. a licence is valid through the whole of its expiry day, and not after;
//   2. driving clearance is impossible without approval AND a live licence —
//      the one gate that, left open, voids a customer's insurance.

import { strict as assert } from 'node:assert';
import { canClearDriving, licenceExpired, statusLabel } from './companions.ts';

const NOW = new Date('2026-09-18T15:00:00').getTime();

// 1. Expiry boundary, in the operator's own day.
assert.equal(licenceExpired('2026-09-18', NOW), false, 'expires today = still valid');
assert.equal(licenceExpired('2026-09-19', NOW), false);
assert.equal(licenceExpired('2026-09-17', NOW), true);
assert.equal(licenceExpired(null, NOW), false);
assert.equal(licenceExpired('not a date', NOW), false);

// 2. Clearance needs approval, a number, and an unexpired date — all three.
const approved = { approval_status: 'APPROVED' as const };
const pending = { approval_status: 'PENDING_REVIEW' as const };
assert.equal(canClearDriving(approved, { number: 'UP16 2019 0001234', expiry: '2027-01-01' }, NOW), true);
assert.equal(canClearDriving(pending, { number: 'UP16 2019 0001234', expiry: '2027-01-01' }, NOW), false);
assert.equal(canClearDriving(approved, { number: '   ', expiry: '2027-01-01' }, NOW), false);
assert.equal(canClearDriving(approved, { number: 'UP16', expiry: '' }, NOW), false);
assert.equal(canClearDriving(approved, { number: 'UP16', expiry: '2026-09-17' }, NOW), false);
// The boundary again, through the gate this time.
assert.equal(canClearDriving(approved, { number: 'UP16', expiry: '2026-09-18' }, NOW), true);

assert.equal(statusLabel('PENDING_REVIEW'), 'Pending review');
assert.equal(statusLabel('APPROVED'), 'Approved');

console.log('companions: ok');
