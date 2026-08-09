// Self-check for the one piece of logic standing between an arbitrary token and
// a Supabase session. No framework, no network:
//   node --experimental-strip-types src/lib/msg91.check.ts
// from apps/website. Silence means pass.

import { strict as assert } from 'node:assert';
import { phoneFromVerifyResult } from './msg91.ts';

// The happy path: MSG91 returns the identifier it verified, country code first.
assert.equal(phoneFromVerifyResult({ type: 'success', message: '919876543210' }), '+919876543210');
assert.equal(phoneFromVerifyResult({ type: 'success', message: '+91 98765 43210' }), '+919876543210');
assert.equal(phoneFromVerifyResult({ type: 'success', message: '9876543210' }), '+919876543210');

// A mobile that genuinely starts "91" must survive: stripping unconditionally
// would turn 9123456789 into eight digits and reject a real customer.
assert.equal(phoneFromVerifyResult({ type: 'success', message: '9123456789' }), '+919123456789');

// Everything else fails closed — treating any of these as success would hand
// out a session for an OTP nobody entered.
for (const bad of [
  null,
  undefined,
  {},
  'success',
  { type: 'error', message: '919876543210' },
  { message: '919876543210' },
  { type: 'success' },
  { type: 'success', message: '' },
  { type: 'success', message: 'Token verified' },
  { type: 'success', message: '98765432' },
  { type: 'success', message: '1234567890' }, // landlines and shortcodes: nobody can be called back
]) {
  assert.equal(phoneFromVerifyResult(bad), null, `accepted ${JSON.stringify(bad)}`);
}
