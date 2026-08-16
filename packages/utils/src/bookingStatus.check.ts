// node --experimental-strip-types src/bookingStatus.check.ts  → silence = pass
import assert from 'node:assert';
import { getStatusInfo, isPastBooking, prettyService, trackingSteps, trackingHeadline } from './bookingStatus.ts';

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

// Tracking timeline: active step advances with status, and ACCEPTED tracks the
// same as ASSIGNED (the self-accept path must not fall to "finding companion").
assert.equal(trackingSteps('ASSIGNED', 'Asha').activeIdx, 1);
assert.equal(trackingSteps('ACCEPTED', 'Asha').activeIdx, 1);
assert.equal(trackingSteps('IN_PROGRESS', 'Asha').activeIdx, 2);
assert.equal(trackingSteps('COMPLETED', 'Asha').activeIdx, 3);
// Only reached steps are returned (never show future stages as history).
assert.equal(trackingSteps('ASSIGNED', 'Asha').steps.length, 2);
assert.equal(trackingSteps('COMPLETED', 'Asha').steps.length, 4);
assert.ok(trackingSteps('ASSIGNED', 'Asha').steps[0].desc.includes('Asha'));
assert.equal(trackingHeadline('ACCEPTED'), 'Your companion is on the way');
assert.equal(trackingHeadline('IN_PROGRESS'), 'Your companion is with the patient');
assert.equal(trackingHeadline('PENDING'), 'Finding your companion');

// Tracking honesty (the opts branch): ASSIGNED/ACCEPTED must not claim "on the
// way" before a live location or trip start actually exists.
assert.equal(
  trackingHeadline('ASSIGNED', { hasLocation: false, tripStarted: false }),
  'Companion assigned — location will be shared when trip starts',
);
assert.equal(
  trackingHeadline('ASSIGNED', { hasLocation: true, tripStarted: false }),
  'Your companion is on the way',
);
assert.equal(
  trackingHeadline('ASSIGNED', { hasLocation: true, tripStarted: true }),
  'Your companion is on the way',
);
// A future-scheduled visit shows the date, never a live-sounding claim.
const tomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
assert.ok(
  trackingHeadline('ASSIGNED', { scheduled_start_time: tomorrow, hasLocation: false }).startsWith('Companion assigned for'),
);
// activeIdx stays at "Confirmed" (0) until location/trip-start exists, then
// advances to "En Route" (1) — this is the bug the honesty fix closed.
assert.equal(trackingSteps('ASSIGNED', 'Asha', { hasLocation: false, tripStarted: false }).activeIdx, 0);
assert.equal(trackingSteps('ASSIGNED', 'Asha', { hasLocation: true, tripStarted: false }).activeIdx, 1);

console.log('bookingStatus.check: ok');
