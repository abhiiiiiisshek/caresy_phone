// Self-check for the outbox copy and recipient rules.
//   node --experimental-strip-types lib/notifications.check.ts
//
// Properties that matter:
//   1. no status enum ever reaches a customer-facing message;
//   2. an unmapped event still produces something sendable;
//   3. a number is only given a country code when it plainly lacks one.

import { strict as assert } from 'node:assert';
import { copyFor, messageText, recipientOf, waNumber, waUrl, type NotifRow } from './notifications.ts';

const row = (over: Partial<NotifRow> = {}): NotifRow => ({
  id: 'n1', booking_id: 'b1', recipient_role: 'CUSTOMER',
  event: 'STATUS_EXPIRED', title: 'Booking CRS-1042 is now EXPIRED', body: 'status change',
  status: 'QUEUED', created_at: new Date().toISOString(), sent_at: null, error: null,
  booking: { reference_code: 'CRS-1042', service_metadata: { customerPhone: '9876543210' } },
  ...over,
});

// 1. Every mapped status reads as a message to a family, never as a raw enum.
for (const event of ['PENDING', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED']) {
  const c = copyFor(row({ event: `STATUS_${event}` }));
  assert.ok(c.title.length > 0, `${event} has no title`);
  assert.ok(!/[A-Z]{4,}/.test(`${c.title} ${c.body}`), `${event} leaks an enum: ${c.title} / ${c.body}`);
  assert.ok(c.body.includes('CRS-1042'), `${event} dropped the reference`);
}

// A booking with no reference code still reads as a sentence.
const noRef = copyFor(row({ event: 'STATUS_CANCELLED', booking: { reference_code: null, service_metadata: null } }));
assert.equal(noRef.body, "Your booking has been cancelled. If this wasn't expected, just reply here and we'll help.");

// 2. Unmapped events fall back to the stored row rather than rendering nothing.
const unmapped = copyFor(row({ event: 'TRIP_STARTED', title: 'Trip started', body: 'On the way' }));
assert.deepEqual(unmapped, { title: 'Trip started', body: 'On the way' });
assert.equal(messageText(row({ event: 'TRIP_STARTED', title: 'Trip started', body: null })), 'Trip started');

// 3. Country codes: add one only to a bare local number.
assert.equal(waNumber('9876543210'), '919876543210');
assert.equal(waNumber('+91 98765 43210'), '919876543210');
assert.equal(waNumber('+971 50 123 4567'), '971501234567');   // never re-prefixed
assert.equal(waNumber('09876543210'), '9876543210');           // trunk zero dropped
assert.equal(waNumber('12345'), null);
assert.equal(waNumber(null), null);

assert.equal(recipientOf(row()), '919876543210');
assert.equal(recipientOf(row({ booking: { reference_code: null, service_metadata: { phone: '9000000000' } } })), '919000000000');
assert.equal(recipientOf(row({ booking: { reference_code: null, service_metadata: null } })), null);

assert.ok(waUrl('919876543210', 'Hi there').startsWith('https://wa.me/919876543210?text=Hi%20there'));

console.log('notifications: ok');
