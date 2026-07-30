// Self-check for phone validation. No framework, no network:
//   node --experimental-strip-types src/phone.check.ts
// from packages/utils. Silence means pass.
//
// This gates whether a companion can reach a customer, so the cases that matter
// are the rejections: a nine-digit number that looks fine in a form is a job
// nobody can be dispatched to.

import { strict as assert } from 'node:assert';
import {
  normalizeIndianMobile, isValidIndianMobile, toE164, formatIndianMobile, mobileHint,
} from './phone.ts';

// Every shape a real person types must land on the same 10 digits.
for (const input of [
  '9876543210',
  '+91 9876543210',
  '+919876543210',
  '91 98765 43210',
  '0091-9876543210',
  '09876543210',
  '98765 43210',
  '(987) 654-3210',
  '  9876543210  ',
]) {
  assert.equal(normalizeIndianMobile(input), '9876543210', `failed to normalize "${input}"`);
}

// Rejections. Each of these previously sailed through as "non-empty".
for (const bad of [
  '',
  '987654321',      // 9 digits
  '98765432101',    // 11 digits
  '1234567890',     // starts with 1
  '5876543210',     // starts with 5
  '0000000000',
  'not a phone',
  '+1 415 555 0123', // valid, but not reachable by our companions
]) {
  assert.equal(normalizeIndianMobile(bad), null, `"${bad}" should be rejected`);
  assert.equal(isValidIndianMobile(bad), false, `"${bad}" should be invalid`);
}

// A 12-digit string only loses its 91 when that makes it a valid mobile —
// '911234567890' is 12 digits but 1234567890 is not a mobile.
assert.equal(normalizeIndianMobile('911234567890'), null);
// ...while a real +91 number keeps working.
assert.equal(normalizeIndianMobile('919876543210'), '9876543210');

// A national number that HAPPENS to start with 91. Stripping unconditionally
// would leave 8 digits and reject a number that is perfectly valid.
assert.equal(normalizeIndianMobile('9123456789'), '9123456789');
assert.equal(mobileHint('9123456789'), null, 'valid 91-prefixed mobile must not be called incomplete');
// Same trap with a leading zero: 0 is stripped only at 11 digits.
assert.equal(normalizeIndianMobile('9012345678'), '9012345678');

assert.equal(toE164('98765 43210'), '+919876543210');
assert.equal(toE164('123'), null, 'never store a number we could not parse');
assert.equal(formatIndianMobile('+919876543210'), '98765 43210');
assert.equal(formatIndianMobile('garbage'), 'garbage', 'unparseable input is echoed, not blanked');

// Hints stay quiet until there is something useful to say.
assert.equal(mobileHint(''), null, 'empty field must not scold');
assert.equal(mobileHint('98'), '8 more digits');
assert.equal(mobileHint('987654321'), '1 more digit', 'singular at exactly one');
assert.equal(mobileHint('9876543210'), null, 'valid number needs no hint');
assert.equal(mobileHint('+91 9876543210'), null, 'country code must not read as extra digits');
assert.equal(mobileHint('98765432101'), 'That is too long for an Indian mobile number');
assert.equal(mobileHint('1234567890'), 'Indian mobile numbers start with 6, 7, 8 or 9');

console.log('phone: ok');
