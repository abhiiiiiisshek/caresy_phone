// The outbox. `notifications` rows (migration 13) are enqueued by the database
// on every booking status change; api/cron/send-push drains them to push and
// Telegram. What is left for a human is the customer-facing message — the desk
// sends it on WhatsApp and marks the row done.
//
// The copy rewrite is the point. The database enqueues operational text like
// "Booking CRS-1042 is now EXPIRED"; nobody should send a family a status enum.
// Rewriting here (and not in SQL) keeps what is shown and what is sent
// identical, and leaves the raw row intact for debugging.

export type NotifStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface NotifRow {
  id: string;
  booking_id: string | null;
  recipient_role: string | null;
  event: string;
  title: string;
  body: string | null;
  status: NotifStatus;
  created_at: string;
  sent_at: string | null;
  error: string | null;
  booking?: {
    reference_code: string | null;
    service_metadata: { customerPhone?: string; phone?: string } | null;
  } | null;
}

export const NOTIF_SELECT = '*, booking:bookings(reference_code, service_metadata)';

/** SKIPPED is written by the cron when no device could be reached — it is a
 *  real outcome, not an error, and it gets its own tab so those rows cannot
 *  quietly vanish from the desk's view. */
export const NOTIF_FILTERS: { key: NotifStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'QUEUED', label: 'Queued' },
  { key: 'SENT', label: 'Sent' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'SKIPPED', label: 'Skipped' },
];

// `ref` is a leading-space reference suffix (" CRS-1042") or "" when the
// booking has no code, so every template reads naturally either way.
const STATUS_COPY: Record<string, { title: string; body: (ref: string) => string }> = {
  PENDING: {
    title: 'Booking received',
    body: (r) => `We've received your Caresy booking${r} and are finding a companion for you.`,
  },
  ACCEPTED: {
    title: 'Your booking is confirmed',
    body: (r) => `Good news — a Caresy companion has accepted your booking${r}. We'll share their details shortly.`,
  },
  ASSIGNED: {
    title: 'Companion assigned',
    body: (r) => `A verified companion has been assigned to your booking${r}. You can track them live from your bookings page.`,
  },
  IN_PROGRESS: {
    title: 'Your visit is in progress',
    body: (r) => `Your Caresy companion has started the visit for your booking${r}.`,
  },
  COMPLETED: {
    title: 'Visit completed',
    body: (r) => `Your Caresy visit${r ? ` for booking${r}` : ''} is complete. Thank you for trusting us — we'd love your feedback.`,
  },
  CANCELLED: {
    title: 'Booking cancelled',
    body: (r) => `Your booking${r} has been cancelled. If this wasn't expected, just reply here and we'll help.`,
  },
  EXPIRED: {
    title: 'Booking could not be confirmed',
    body: (r) => `We're sorry — we couldn't confirm a companion for your booking${r} in time. Reply here and we'll rebook you right away.`,
  },
};

/** Customer-facing title/body, falling back to the stored row for any event
 *  without a template — an unmapped event must still be sendable. */
export function copyFor(n: Pick<NotifRow, 'event' | 'status' | 'title' | 'body' | 'booking'>): { title: string; body: string } {
  const status = (n.event || '').replace(/^STATUS_/, '') || n.status;
  const code = n.booking?.reference_code;
  const ref = code ? ` ${code}` : '';
  const c = STATUS_COPY[status];
  return c ? { title: c.title, body: c.body(ref) } : { title: n.title, body: n.body || '' };
}

/**
 * India-first: the forms collect a bare 10-digit mobile, and WhatsApp needs a
 * country code. A number that already carries one (with or without +, with or
 * without spaces) is left alone — prefixing 91 onto +971… would message a
 * stranger.
 */
export function waNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length < 10) return null;
  return digits.replace(/^0+/, '');
}

export function waUrl(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** The message as the family will read it. */
export function messageText(n: Parameters<typeof copyFor>[0]): string {
  const c = copyFor(n);
  return c.body ? `${c.title}\n\n${c.body}` : c.title;
}

/** The customer's number on the booking, in whichever shape the form wrote. */
export function recipientOf(n: Pick<NotifRow, 'booking'>): string | null {
  const meta = n.booking?.service_metadata ?? null;
  return waNumber(meta?.customerPhone ?? meta?.phone ?? null);
}
