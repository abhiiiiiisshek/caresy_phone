// Indian mobile numbers, validated the same way everywhere.
//
// Four screens ask for a phone number — onboarding, booking, quick help and
// support — and each accepted anything non-empty. A companion cannot be
// dispatched to a customer whose number is nine digits, and nobody discovers
// that until someone tries to call.
//
// Deliberately India-only: the service area is Noida and Greater Noida, so a
// generic international parser would be a dependency earning nothing. When
// Caresy crosses a border, swap the body for libphonenumber-js and keep the
// signatures.

/** Every digit, ignoring spaces, dashes, brackets and a leading +. */
function digits(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

/**
 * Strip an international access or country code, if one is really there.
 *
 * The length guards are load-bearing. 9123456789 is a perfectly good mobile
 * that happens to start with "91" — stripping unconditionally would leave
 * eight digits and call a valid number incomplete.
 */
function nationalDigits(raw: string): string {
  const d = digits(raw);
  if (d.startsWith('0091') && d.length === 14) return d.slice(4);
  if (d.startsWith('91') && d.length === 12) return d.slice(2);
  if (d.startsWith('0') && d.length === 11) return d.slice(1);
  return d;
}

/**
 * The 10 national digits, or null if this cannot be one.
 *
 * Accepts what people actually type: 9876543210, +91 98765 43210,
 * 0098765..., 098765..., 91-9876543210.
 */
export function normalizeIndianMobile(raw: string): string | null {
  const d = nationalDigits(raw);
  // Indian mobiles are 10 digits starting 6-9. Landlines and shortcodes are
  // rejected on purpose: this field exists so somebody can be reached en route.
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export function isValidIndianMobile(raw: string): boolean {
  return normalizeIndianMobile(raw) !== null;
}

/** Storage form: +919876543210. One shape in the database, always. */
export function toE164(raw: string): string | null {
  const d = normalizeIndianMobile(raw);
  return d ? `+91${d}` : null;
}

/** Display form: 98765 43210 — how the number is read aloud. */
export function formatIndianMobile(raw: string): string {
  const d = normalizeIndianMobile(raw);
  return d ? `${d.slice(0, 5)} ${d.slice(5)}` : raw;
}

/**
 * What to show under the field, or null when there is nothing to say.
 *
 * Silent while the number is still being typed — telling someone their number
 * is invalid after two digits is noise, not help.
 */
export function mobileHint(raw: string): string | null {
  if (isValidIndianMobile(raw)) return null;
  const d = nationalDigits(raw);
  if (d.length === 0) return null;
  if (d.length < 10) return `${10 - d.length} more digit${10 - d.length === 1 ? '' : 's'}`;
  if (d.length > 10) return 'That is too long for an Indian mobile number';
  if (!/^[6-9]/.test(d)) return 'Indian mobile numbers start with 6, 7, 8 or 9';
  return null;
}
