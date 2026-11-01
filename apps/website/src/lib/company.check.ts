/**
 * node --experimental-strip-types src/lib/company.check.ts
 *
 * These constants are the company's legal identity on a public website. If they
 * drift from the Certificate of Incorporation, App Store organization
 * verification fails and the privacy policy names the wrong legal person — so
 * the properties worth pinning are the shapes the registrars actually issue,
 * plus the exact strings we filed with Apple.
 */

import assert from 'node:assert';
import {
  LEGAL_NAME,
  CIN,
  PAN,
  DUNS,
  REGISTERED_ADDRESS,
  REGISTERED_ADDRESS_LINE,
  SUPPORT_EMAIL,
  LEGAL_EMAIL,
  SUPPORT_PHONE_E164,
} from './company.ts';

// --- Format properties: these are government-issued identifiers with fixed shapes.

// CIN is 21 characters: U + 5-digit NIC + 2-letter state + 4-digit year + type + 6-digit serial.
assert.match(CIN, /^[UL]\d{5}[A-Z]{2}\d{4}(OPC|PTC|PLC|SGC|GOI|NPL)\d{6}$/, 'CIN is malformed');
assert.strictEqual(CIN.length, 21, 'CIN must be exactly 21 characters');

// PAN is 5 letters + 4 digits + 1 letter. The 4th letter encodes holder type;
// "C" means Company, which is what an OPC must have.
assert.match(PAN, /^[A-Z]{5}\d{4}[A-Z]$/, 'PAN is malformed');
assert.strictEqual(PAN[3], 'C', 'PAN 4th character must be C for a company');

// D-U-N-S is always 9 digits, no separators.
assert.match(DUNS, /^\d{9}$/, 'D-U-N-S must be exactly 9 digits');

// Indian PIN codes are 6 digits and never start with 0.
assert.match(REGISTERED_ADDRESS.pincode, /^[1-9]\d{5}$/, 'PIN code is malformed');

// --- Identity properties: the exact values filed with Apple and the MCA.
// If someone edits these, the website stops matching the D-U-N-S record.

assert.strictEqual(CIN, 'U86100UW2026OPC257621', 'CIN no longer matches the Certificate of Incorporation');
assert.strictEqual(DUNS, '312183790', 'D-U-N-S no longer matches the record filed with Apple');
assert.strictEqual(REGISTERED_ADDRESS.pincode, '203207', 'PIN no longer matches the registered office');

// The entity is a One Person Company; the name must say so, or it is a different
// legal person from the one on the Certificate of Incorporation.
assert.ok(LEGAL_NAME.includes('(OPC)'), 'LEGAL_NAME must identify the entity as an OPC');
assert.ok(/private limited$/i.test(LEGAL_NAME), 'LEGAL_NAME must end with "Private Limited"');
assert.ok(
  !/care services/i.test(LEGAL_NAME),
  'LEGAL_NAME has reverted to the pre-incorporation placeholder "Caresy Care Services"',
);

// --- Derived value stays consistent with its parts.

for (const part of [REGISTERED_ADDRESS.line1, REGISTERED_ADDRESS.district, REGISTERED_ADDRESS.pincode]) {
  assert.ok(REGISTERED_ADDRESS_LINE.includes(part), `one-line address dropped "${part}"`);
}

// --- Contact details must be on the domain Apple and Google were given.

for (const email of [SUPPORT_EMAIL, LEGAL_EMAIL]) {
  assert.match(email, /^[^@\s]+@caresy\.co\.in$/, `${email} is not on the caresy.co.in domain`);
}

// The dialable form carries the country code and no punctuation, so tel: and
// wa.me links built from it both resolve.
assert.match(SUPPORT_PHONE_E164, /^91\d{10}$/, 'phone must be 91 + 10 digits, digits only');
