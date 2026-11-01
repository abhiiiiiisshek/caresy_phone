/**
 * The registered legal identity of the company behind Caresy.
 *
 * These values are read off the Certificate of Incorporation (MCA, Central
 * Registration Centre, 21 August 2026) and must match the MCA record, the
 * D&B / D-U-N-S record, and whatever is filed with Apple and Google — a
 * mismatch between the website and the D-U-N-S record is a standard rejection
 * reason for App Store organization verification.
 *
 * Before this file existed the site named "Caresy Care Services Pvt. Ltd."
 * at an address in Bisrakh Jalalpur. No such entity is registered; both were
 * placeholders written before incorporation. Anything user-facing that names
 * the company imports from here so the two can never drift apart again.
 */

export const LEGAL_NAME = 'Caresy Companion Services (OPC) Private Limited';

/** Corporate Identity Number, as issued by the Registrar of Companies. */
export const CIN = 'U86100UW2026OPC257621';

/**
 * Company PAN, as issued by the Income Tax Department.
 *
 * Nothing renders this, and it must stay that way: it is tree-shaken out of the
 * client bundle today (verified against `.next/static` after a production
 * build), but importing it into a component would ship a tax identifier to
 * every visitor. Filings and verification forms only.
 */
export const PAN = 'AAOCC1770C';

/** D-U-N-S number on the Dun & Bradstreet record for this entity. */
export const DUNS = '312183790';

/** Registered office, exactly as it appears on the Certificate of Incorporation. */
export const REGISTERED_ADDRESS = {
  line1: 'ShopNo-5 Ramavtar Complex, Sector-2 Greater Noida',
  line2: 'Dadri, Noida',
  district: 'Gautam Buddha Nagar',
  state: 'Uttar Pradesh',
  pincode: '203207',
  country: 'India',
} as const;

/** One-line form, for footers and contact blocks. */
export const REGISTERED_ADDRESS_LINE = [
  REGISTERED_ADDRESS.line1,
  REGISTERED_ADDRESS.line2,
  `${REGISTERED_ADDRESS.district}, ${REGISTERED_ADDRESS.state} ${REGISTERED_ADDRESS.pincode}`,
].join(', ');

export const SUPPORT_EMAIL = 'support@caresy.co.in';
export const LEGAL_EMAIL = 'legal@caresy.co.in';
export const SUPPORT_PHONE = '+91 97175 00225';
/** Same number, in the tel:/wa.me digit form. */
export const SUPPORT_PHONE_E164 = '919717500225';

export const INCORPORATED_ON = '21 August 2026';
