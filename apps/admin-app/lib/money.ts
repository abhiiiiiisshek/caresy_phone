import { bookingRevenueRupees, isBilled } from '@caresy/utils/pricing';

// Money and demand, read-only with one exception.
//
// Amounts are set by complete_booking() and collections by record_payment(),
// both companion-side (26_BILLING.sql). The single write the desk needs is
// "waive" — a visit that should not be charged — and it goes through a plain
// UPDATE because the guard trigger exempts is_admin(). That exemption is the
// documented escape hatch for correcting a bill by hand.
//
// UNBILLED bookings are excluded everywhere here: no amount yet means dispatch
// work, not payment work.

export type PaymentStatus = 'PENDING' | 'COLLECTED' | 'WAIVED';

export interface PaymentRow {
  id: string;
  reference_code: string | null;
  payment_status: PaymentStatus;
  payment_method: 'CASH' | 'UPI' | null;
  final_amount_paise: number | null;
  billed_minutes: number | null;
  collected_at: string | null;
  actual_end_time: string | null;
  patient?: { full_name: string | null } | null;
}

export const PAYMENT_SELECT = `
  id,
  reference_code,
  payment_status,
  payment_method,
  final_amount_paise,
  billed_minutes,
  collected_at,
  actual_end_time,
  patient:patients ( full_name )
`;

export const PAYMENT_FILTERS: { key: PaymentStatus | 'ALL'; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'COLLECTED', label: 'Collected' },
  { key: 'WAIVED', label: 'Waived' },
  { key: 'ALL', label: 'All' },
];

/** Local midnight, so "today" means the operator's day, not UTC's. */
export function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface PaymentTotals {
  pendingPaise: number;
  pendingCount: number;
  todayPaise: number;
  collectedPaise: number;
}

export function paymentTotals(rows: PaymentRow[], now = Date.now()): PaymentTotals {
  const today = startOfToday(now);
  const sum = (rs: PaymentRow[]) => rs.reduce((n, r) => n + (r.final_amount_paise ?? 0), 0);
  const pending = rows.filter((r) => r.payment_status === 'PENDING');
  const collected = rows.filter((r) => r.payment_status === 'COLLECTED');
  return {
    pendingPaise: sum(pending),
    pendingCount: pending.length,
    // A collection with no timestamp cannot be claimed as today's takings.
    todayPaise: sum(collected.filter((r) => r.collected_at && new Date(r.collected_at).getTime() >= today)),
    collectedPaise: sum(collected),
  };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsBooking {
  status: string;
  estimated_duration_minutes: number | null;
  final_amount_paise: number | null;
  created_at: string;
}

export interface AnalyticsCompanion {
  approval_status: string;
  is_online: boolean;
}

export interface AdminStats {
  byStatus: Record<string, number>;
  totalBookings: number;
  todayBookings: number;
  approvedCompanions: number;
  onlineCompanions: number;
  /** Whole rupees across completed bookings. */
  revenue: number;
  /** How many of those are projections rather than real bills. */
  projectedCount: number;
}

export function adminStats(
  bookings: AnalyticsBooking[],
  companions: AnalyticsCompanion[],
  now = Date.now(),
): AdminStats {
  const today = startOfToday(now);
  const byStatus: Record<string, number> = {};
  let todayBookings = 0;
  let revenue = 0;
  let projectedCount = 0;

  for (const b of bookings) {
    byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    if (new Date(b.created_at).getTime() >= today) todayBookings += 1;
    // Only completed work is revenue. A pending booking is a hope.
    if (b.status === 'COMPLETED') {
      revenue += bookingRevenueRupees(b);
      if (!isBilled(b)) projectedCount += 1;
    }
  }

  return {
    byStatus,
    totalBookings: bookings.length,
    todayBookings,
    approvedCompanions: companions.filter((c) => c.approval_status === 'APPROVED').length,
    onlineCompanions: companions.filter((c) => c.approval_status === 'APPROVED' && c.is_online).length,
    revenue,
    projectedCount,
  };
}

export const STATUS_ORDER = [
  'DRAFT', 'PENDING', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED',
] as const;
