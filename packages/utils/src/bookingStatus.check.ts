// node --experimental-strip-types src/bookingStatus.check.ts  → silence = pass
import assert from 'node:assert';
import { getStatusInfo, isPastBooking, prettyService } from './bookingStatus.ts';

// The bug this module exists to prevent: the two "confirmed" enums must not drift.
assert.equal(getStatusInfo('ACCEPTED').label, 'Confirmed');
assert.equal(getStatusInfo('ASSIGNED').label, 'Confirmed');
assert.equal(getStatusInfo('ACCEPTED').cls, getStatusInfo('ASSIGNED').cls);

// Every known DB enum resolves to a curated label, never the raw string.
for (const s of ['PENDING', 'DRAFT', 'IN_REVIEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED']) {
  assert.notEqual(getStatusInfo(s).label, s, `raw status leaked: ${s}`);
}
// Unknown enum falls through to the raw string + pending (visible, not crashing).
assert.equal(getStatusInfo('WEIRD_NEW').label, 'WEIRD_NEW');

// Terminal statuses are always past regardless of clock.
const T = 1_000_000;
assert.equal(isPastBooking({ status: 'COMPLETED', scheduled_start_time: null }, T), true);
assert.equal(isPastBooking({ status: 'CANCELLED', scheduled_start_time: null }, T), true);
// Non-terminal: past iff scheduled time already elapsed.
assert.equal(isPastBooking({ status: 'ASSIGNED', scheduled_start_time: new Date(T - 1).toISOString() }, T), true);
assert.equal(isPastBooking({ status: 'ASSIGNED', scheduled_start_time: new Date(T + 60_000).toISOString() }, T), false);
assert.equal(isPastBooking({ status: 'PENDING', scheduled_start_time: null }, T), false);

assert.equal(prettyService('HOSPITAL_COMPANION'), 'Hospital Companion');

console.log('bookingStatus.check: ok');
