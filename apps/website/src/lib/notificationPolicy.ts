/**
 * Priority/delivery-mode policy for the notifications → Telegram drain.
 *
 * Telegram used to mirror every claimed row 1:1. Five status transitions on
 * one booking meant five pings, so admins couldn't tell "act now" from
 * "already handled" and the channel drifted toward noise. This maps each
 * event to a priority and a delivery mode so only CRITICAL/IMPORTANT events
 * send individually; INFORMATIONAL events roll up into a periodic digest
 * (see notification_digest_buckets, 49_NOTIFICATION_DIGEST.sql).
 *
 * Static config, not a DB table: the event set is fixed at deploy time by
 * the 9 SQL triggers that write `notifications` rows, so a runtime-editable
 * config would be an abstraction with nothing to point it at.
 */

export type Priority = 'CRITICAL' | 'IMPORTANT' | 'INFORMATIONAL';
export type DeliveryMode = 'IMMEDIATE' | 'BUFFERED' | 'SILENT';

export interface EventPolicy {
  priority: Priority;
  mode: DeliveryMode;
  /** Only set when mode === 'BUFFERED'. Rows sharing a key flush as one digest. */
  aggregationKey?: string;
}

// A new event string that isn't recognized here must still get sent, not
// silently dropped or swept into a digest nobody asked for.
const DEFAULT_POLICY: EventPolicy = { priority: 'IMPORTANT', mode: 'IMMEDIATE' };

const CRITICAL_IMMEDIATE = new Set([
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'ADMIN_STATUS_CANCELLED',
  'ADMIN_STATUS_EXPIRED',
]);

const IMPORTANT_IMMEDIATE = new Set([
  'BOOKING_RESCHEDULED',
  'BOOKING_REASSIGNED',
  'BOOKING_ASSIGNED_TO_YOU',
  'COMPANION_PENDING_APPROVAL',
  'ADMIN_STATUS_ACCEPTED',
  'STATUS_ACCEPTED',
  'STATUS_ASSIGNED',
  'STATUS_IN_PROGRESS',
  'TRIP_ASSIGNED',
  'TRIP_EN_ROUTE_PICKUP',
  'TRIP_PICKED_UP',
  'TRIP_EN_ROUTE_HOSPITAL',
  'TRIP_ARRIVED',
]);

const INFORMATIONAL_PREFIXES = ['STATUS_COMPLETED', 'STATUS_CANCELLED', 'STATUS_EXPIRED', 'TRIP_COMPLETED', 'TRIP_CANCELLED', 'CARE_EVENT_'];

function isInformational(event: string): boolean {
  return INFORMATIONAL_PREFIXES.some((p) => event === p || event.startsWith(p));
}

export type EntityType = 'BOOKING' | 'PATIENT' | 'NOTIFICATION';

/**
 * Groups a row's IMMEDIATE-priority notifications under one attention-tracked
 * entity (50_NOTIFICATION_ATTENTION.sql) — so "booking created" then "booking
 * expired" on the same booking are recognized as the same ongoing dispatch
 * problem, not two unrelated pings each starting their own cooldown.
 */
export function dedupeKeyFor(row: { booking_id?: string | null; patient_id?: string | null; id: string }): { key: string; entityType: EntityType } {
  if (row.booking_id) return { key: `booking:${row.booking_id}`, entityType: 'BOOKING' };
  if (row.patient_id) return { key: `patient:${row.patient_id}`, entityType: 'PATIENT' };
  return { key: `notif:${row.id}`, entityType: 'NOTIFICATION' };
}

export function classify(event: string, recipientRole?: string | null): EventPolicy {
  if (CRITICAL_IMMEDIATE.has(event)) return { priority: 'CRITICAL', mode: 'IMMEDIATE' };
  if (IMPORTANT_IMMEDIATE.has(event)) return { priority: 'IMPORTANT', mode: 'IMMEDIATE' };
  if (isInformational(event)) {
    return {
      priority: 'INFORMATIONAL',
      mode: 'BUFFERED',
      aggregationKey: `${recipientRole ?? 'UNKNOWN'}:informational`,
    };
  }
  return DEFAULT_POLICY;
}
