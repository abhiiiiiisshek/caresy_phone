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

// ---- trips.status drives the timeline when there is a live trip -------------
// The booking row's IN_PROGRESS covers pickup, the drive and arrival; the trip
// row separates them, and advance_trip_status() is the only writer, so it wins.
const TRIP_STEP: Array<[string, number]> = [
  ['assigned', 0],
  ['en_route_pickup', 1],
  ['picked_up', 2],
  ['en_route_hospital', 2],
  ['arrived', 2],
  ['completed', 3],
];
for (const [tripStatus, idx] of TRIP_STEP) {
  assert.equal(
    trackingSteps('ACCEPTED', 'Asha', { tripStatus }).activeIdx, idx,
    `${tripStatus} should sit on step ${idx}`,
  );
}

// Monotonic: the timeline only ever moves forward along the trip enum, and the
// visible steps grow with it. A step that goes backwards means a customer
// watches their visit un-happen.
let prevIdx = -1;
let prevLen = 0;
for (const [tripStatus] of TRIP_STEP) {
  const { steps, activeIdx } = trackingSteps('ACCEPTED', 'Asha', { tripStatus });
  assert.ok(activeIdx >= prevIdx, `${tripStatus} went backwards`);
  assert.ok(steps.length >= prevLen, `${tripStatus} dropped a step`);
  assert.equal(steps.length, Math.max(activeIdx + 1, 2));
  prevIdx = activeIdx;
  prevLen = steps.length;
}

// The trip overrides the booking row in both directions: a coarse IN_PROGRESS
// does not drag the timeline forward past a trip that is still en route, and a
// trip that has moved on is not held back by an ACCEPTED booking.
assert.equal(trackingSteps('IN_PROGRESS', 'Asha', { tripStatus: 'en_route_pickup' }).activeIdx, 1);
assert.equal(trackingSteps('ACCEPTED', 'Asha', { tripStatus: 'arrived' }).activeIdx, 2);

// An unrecognised trip status falls back to the booking row rather than
// inventing a step — 'cancelled' has no place on a forward-only timeline.
assert.equal(
  trackingSteps('IN_PROGRESS', 'Asha', { tripStatus: 'cancelled' }).activeIdx,
  trackingSteps('IN_PROGRESS', 'Asha').activeIdx,
);

// Each in-visit stage says something different; identical copy across three
// stages is the same as having no stages.
const midDescs = ['picked_up', 'en_route_hospital', 'arrived'].map(
  (tripStatus) => trackingSteps('ACCEPTED', 'Asha', { tripStatus }).steps[2].desc,
);
assert.equal(new Set(midDescs).size, 3);
assert.ok(midDescs.every((d) => d.includes('Asha')));

// Headlines track the same enum.
assert.equal(trackingHeadline('ACCEPTED', { tripStatus: 'en_route_pickup' }), 'Your companion is on the way');
assert.equal(trackingHeadline('ACCEPTED', { tripStatus: 'en_route_hospital' }), 'On the way to the hospital');
assert.equal(trackingHeadline('ACCEPTED', { tripStatus: 'arrived' }), 'Arrived at the hospital');

// A trip still at 'assigned' has not left, whatever the companion's phone has
// already pinged. The location guess must not override it.
assert.equal(
  trackingHeadline('ACCEPTED', { tripStatus: 'assigned', hasLocation: true, tripStarted: true }),
  'Companion assigned — location will be shared when trip starts',
);
assert.equal(
  trackingSteps('ACCEPTED', 'Asha', { tripStatus: 'assigned', hasLocation: true }).activeIdx, 0,
);
// ...but a future-dated visit still says so rather than claiming a live state.
assert.ok(
  trackingHeadline('ACCEPTED', { tripStatus: 'assigned', scheduled_start_time: tomorrow, hasLocation: true })
    .startsWith('Companion assigned for'),
);

// No trip yet (guest link before the companion starts) behaves exactly as before.
assert.equal(
  trackingSteps('ASSIGNED', 'Asha', { tripStatus: null, hasLocation: true }).activeIdx,
  trackingSteps('ASSIGNED', 'Asha', { hasLocation: true }).activeIdx,
);

console.log('bookingStatus.check: ok');
