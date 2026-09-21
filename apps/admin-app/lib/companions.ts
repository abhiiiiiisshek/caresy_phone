import type { ApprovalStatus } from '@caresy/types';

// The approval queue. A companion is a person who will be alone with someone
// frail, so nothing here is one tap: rejection carries a reason, suspension
// warns about the visits it strands, and driving clearance is a separate act
// with its own evidence.

export interface CompanionRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  years_experience: number | null;
  languages: string[] | null;
  specialties: string[] | null;
  service_pincodes: string[] | null;
  bio: string | null;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  is_online: boolean;
  created_at: string;
  // Driving eligibility (migration 27). can_drive defaults FALSE and only an
  // admin may set it, so without this screen every CUSTOMER_VEHICLE booking is
  // undispatchable: the database rejects the assignment and nothing in the
  // product can clear it.
  driving_licence_number: string | null;
  driving_licence_expiry: string | null;
  driving_licence_class: string | null;
  can_drive: boolean;
  drive_verified_at: string | null;
}

export interface CompanionDoc {
  id: string;
  doc_type: string;
  file_path: string;
  status: string;
}

export const COMPANION_FILTERS: { key: ApprovalStatus | 'ALL'; label: string }[] = [
  { key: 'PENDING_REVIEW', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SUSPENDED', label: 'Suspended' },
  { key: 'ALL', label: 'All' },
];

export function statusLabel(s: ApprovalStatus): string {
  return s.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Statuses whose holder is mid-visit; suspending one strands that visit. */
export const LIVE_JOB_STATUSES = ['ACCEPTED', 'IN_PROGRESS'];

/**
 * Expiry is stored, not eyeballed: companion_may_drive() re-checks it at
 * assignment time, so a licence that lapses next month stops working by itself.
 * Today counts as valid — a licence is good until the end of its expiry date.
 */
export function licenceExpired(expiry: string | null, now = Date.now()): boolean {
  if (!expiry) return false;
  const t = new Date(expiry).getTime();
  if (Number.isNaN(t)) return false;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return t < startOfToday.getTime();
}

/**
 * Whether "Clear for driving jobs" may be pressed. An unapproved companion
 * cannot hold a clearance, and neither can a blank or lapsed licence — the
 * database would refuse the resulting assignment anyway, and an invalid licence
 * can void the customer's own-damage claim.
 */
export function canClearDriving(
  c: Pick<CompanionRow, 'approval_status'>,
  licence: { number: string; expiry: string },
  now = Date.now(),
): boolean {
  if (c.approval_status !== 'APPROVED') return false;
  if (licence.number.trim() === '' || licence.expiry === '') return false;
  return !licenceExpired(licence.expiry, now);
}
