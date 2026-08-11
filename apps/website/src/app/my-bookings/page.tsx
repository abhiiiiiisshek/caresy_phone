'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { MessageSquare, Mail, ShieldCheck, Check, User, MapPin, Activity, ShoppingBag, Loader2, Hash, Calendar, Clock, CalendarHeart, X, CalendarClock, XCircle, ArrowLeft, ChevronRight, MoreHorizontal, Briefcase, CalendarDays, Smartphone, Wallet, Phone } from 'lucide-react';
import { Button, MotionSpot } from '@caresy/ui';
import { formatINR, upiPayUrl, runningTotalPaise } from '@caresy/utils/pricing';
import { MIN_LEAD_MINUTES } from '@caresy/utils/slots';

const EPILOGUE = 'var(--font-epilogue), sans-serif';

/** Statuses a customer may still cancel or move themselves (migration 31). */
const CHANGEABLE = new Set(['PENDING', 'ACCEPTED', 'ASSIGNED']);

/** Statuses worth naming on a list row — "Completed" and "Cancelled" differ. */
const TERMINAL = new Set(['CANCELLED', 'EXPIRED', 'COMPLETED']);

interface CompanionDetails {
  name: string;
  avatar: string;
  rating: string;
  verification: string;
  lang: string;
  specialty: string;
  color?: string;
  photo?: string;
  // Stamped by the database whenever a booking gains a companion (migration 30),
  // so it is present however the assignment happened. Customers cannot read the
  // companions table directly.
  phone?: string | null;
}

interface BookingRecord {
  id: string;
  reference_code: string;
  share_token: string;
  status: string;
  created_at: string;
  scheduled_start_time: string | null;
  special_instructions: string | null;
  estimated_duration_minutes: number | null;
  service_type: string;
  booking_type: string;
  service_metadata: any;
  actual_start_time: string | null;
  final_amount_paise: number | null;
  billed_minutes: number | null;
  payment_status: string;
  payment_method: string | null;
  patient?: any;
  pickup_location?: any;
}

const SUPPORT_WA = '919717500225';
const SUPPORT_EMAIL = 'support@caresy.co.in';

function waLink(ref: string, companionName?: string) {
  const msg = companionName
    ? `Hi ${companionName}, checking status for booking ${ref}`
    : `Hello Caresy Support,\n\nBooking Reference: ${ref}\n\nI need help regarding this booking.`;
  return `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(msg)}`;
}
function mailLink(ref: string) {
  const body = `Hello Caresy Support,\n\nBooking Reference: ${ref}\n\nI need help regarding this booking.`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Help with booking ' + ref)}&body=${encodeURIComponent(body)}`;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; dot: string; live?: boolean }> = {
  pending: { bg: 'rgba(231,163,62,0.16)', fg: '#8A5A12', dot: 'var(--warning)' },
  review: { bg: 'var(--terracotta-soft)', fg: 'var(--terracotta-deep)', dot: 'var(--terracotta)' },
  assigned: { bg: '#baeed9', fg: '#002117', dot: 'var(--m3-green)', live: true },
  active: { bg: '#baeed9', fg: '#002117', dot: 'var(--success)', live: true },
  completed: { bg: 'rgba(92,107,100,0.14)', fg: 'var(--muted)', dot: 'var(--muted)' },
};

function getStatusInfo(status: string) {
  const s = status.toLowerCase();
  if (s === 'pending' || s === 'draft') return { label: 'Pending Assignment', cls: 'pending' };
  if (s.includes('review')) return { label: 'Under Review', cls: 'review' };
  // ACCEPTED is what a companion self-accepting writes (migration 12); ASSIGNED
  // is what the admin board writes. Only the second was handled, so the common
  // path fell through to the default and showed the customer a raw "ACCEPTED".
  if (s.includes('assigned') || s.includes('accepted')) return { label: 'Confirmed', cls: 'assigned' };
  if (s.includes('progress') || s === 'active') return { label: 'Active Visit', cls: 'active' };
  if (s === 'completed') return { label: 'Completed', cls: 'completed' };
  if (s === 'cancelled') return { label: 'Cancelled', cls: 'completed' };
  if (s === 'expired') return { label: 'Expired', cls: 'completed' };
  return { label: status, cls: 'pending' };
}

// Turn a raw enum (HOSPITAL_COMPANION) into a friendly label when the booking
// has no human-entered service name in its metadata.
function prettyService(raw: string) {
  return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function serviceLabel(b: BookingRecord) {
  return (b.service_metadata?.originalService as string) || prettyService(b.service_type || 'Booking');
}

// A booking is "past" if it reached a terminal status OR its scheduled time
// has already elapsed (stale pending/expired shouldn't sit under Upcoming).
function isPastBooking(b: BookingRecord) {
  const s = b.status.toLowerCase();
  if (s === 'completed' || s === 'cancelled' || s === 'expired') return true;
  const when = b.scheduled_start_time ? new Date(b.scheduled_start_time).getTime() : null;
  return when !== null && when < Date.now();
}

/**
 * The bill, once the companion has completed the visit.
 *
 * Read-only on purpose: the customer cannot mark their own booking paid. A raw
 * UPI link has no confirmation callback, so somebody has to assert the money
 * arrived, and it must not be the person who owes it. The companion taps
 * "received" on their side; this screen just shows what is due and opens the
 * payment app.
 */
/**
 * The meter, while the visit is still running.
 *
 * The companion has watched this number climb since billing shipped; the
 * customer — the one actually paying — saw nothing until Complete, then a final
 * figure with no warning. Same helper as the companion's RunningTotal, so the
 * two screens cannot drift, and the same evening surcharge the server will add.
 *
 * Deliberately hedged wording. The amount owed is whatever complete_booking()
 * computes from the server clock; this is a browser guess a minute or two behind
 * and must never read as the final bill.
 */
function LiveMeter({ booking }: { booking: BookingRecord }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const running = runningTotalPaise(
    booking.actual_start_time,
    new Date(now).toISOString(),
    booking.service_metadata?.eveningSurchargePaise ?? 0,
  );
  if (!running) return null;

  const hrs = Math.floor(running.minutes / 60);
  const elapsed = hrs > 0 ? `${hrs}h ${running.minutes % 60}m` : `${running.minutes} min`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 17, borderRadius: 16, background: '#fff', border: '1px solid var(--m3-green)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--m3-green-deep)' }}>
            <Activity style={{ width: 13, height: 13 }} /> Visit in progress
          </span>
          <span style={{ fontSize: 12, color: 'var(--m3-muted)' }}>{elapsed} of companion time so far</span>
        </span>
        <strong style={{ fontSize: 26, fontWeight: 700, color: 'var(--m3-green-deep)' }}>{formatINR(running.paise)}</strong>
      </div>
      <span style={{ fontSize: 11.5, lineHeight: '16px', color: 'var(--m3-muted)' }}>
        Running total, updated every 30 seconds. Your companion confirms the final
        amount when the visit ends, and you pay then — by cash or UPI.
      </span>
    </div>
  );
}

function BillPanel({ booking }: { booking: BookingRecord }) {
  // Before the bill exists, show the meter instead of nothing.
  if (booking.payment_status === 'UNBILLED') {
    return booking.status === 'IN_PROGRESS' ? <LiveMeter booking={booking} /> : null;
  }
  if (booking.payment_status !== 'PENDING' && booking.payment_status !== 'COLLECTED') return null;

  const paid = booking.payment_status === 'COLLECTED';
  const paise = booking.final_amount_paise ?? 0;
  const vpa = process.env.NEXT_PUBLIC_UPI_VPA;
  const upiUrl = !paid && vpa
    ? upiPayUrl({ vpa, name: 'Caresy', paise, ref: booking.reference_code })
    : null;
  const mins = booking.billed_minutes;
  const timeLabel = mins == null ? null : mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 17, borderRadius: 16, background: paid ? 'var(--m3-chip)' : '#fff', border: `1px solid ${paid ? 'var(--m3-line)' : 'var(--m3-green)'}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--m3-muted)' }}>
            {paid ? `Paid${booking.payment_method ? ` · ${booking.payment_method === 'CASH' ? 'Cash' : 'UPI'}` : ''}` : 'Amount due'}
          </span>
          {timeLabel && <span style={{ fontSize: 12, color: 'var(--m3-muted)' }}>{timeLabel} of companion time</span>}
        </span>
        <strong style={{ fontSize: 26, fontWeight: 700, color: paid ? 'var(--m3-muted)' : 'var(--m3-green-deep)' }}>{formatINR(paise)}</strong>
      </div>

      {paid ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--m3-muted)' }}>
          <Check style={{ width: 14, height: 14 }} /> Payment received. Thank you.
        </span>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {upiUrl && (
              // Android hands upi:// to the OS, which offers every installed
              // UPI app. iOS has no generic handler, hence the VPA line below.
              <a href={upiUrl} style={{ flex: 1, minWidth: 150, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 999, background: 'var(--m3-green-deep)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                <Smartphone style={{ width: 15, height: 15 }} /> Pay by UPI
              </a>
            )}
            <span style={{ flex: 1, minWidth: 130, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 999, border: '1px solid var(--m3-line)', color: 'var(--m3-muted)', fontSize: 13.5, fontWeight: 600 }}>
              <Wallet style={{ width: 15, height: 15 }} /> or pay cash
            </span>
          </div>
          <span style={{ fontSize: 11.5, lineHeight: '16px', color: 'var(--m3-muted)' }}>
            {vpa ? `Paying from another phone? Send to ${vpa}. ` : ''}
            Your companion confirms the payment on their app.
          </span>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const info = getStatusInfo(status);
  const s = STATUS_STYLE[info.cls] || STATUS_STYLE.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 16px', borderRadius: 999, background: s.bg, color: s.fg, fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', lineHeight: '16px', flexShrink: 0 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, animation: s.live ? 'caresy-pulse 1.8s infinite' : 'none' }} />
      {info.label}
    </span>
  );
}

function Timeline({ status, companionName }: { status: string; companionName: string }) {
  const s = status.toLowerCase();
  let step1 = 'pending', step2 = 'pending', step3 = 'pending', step4 = 'pending';

  if (s.includes('assigned')) {
    step1 = 'active';
  } else if (s.includes('reached') || s.includes('arrival') || s.includes('hospital') || s.includes('check')) {
    step1 = 'completed'; step2 = 'active';
  } else if (s.includes('progress') || s.includes('consultation')) {
    step1 = 'completed'; step2 = 'completed'; step3 = 'active';
  } else if (s.includes('medicines') || s.includes('pharmacy')) {
    step1 = 'completed'; step2 = 'completed'; step3 = 'completed'; step4 = 'active';
  } else if (s === 'completed') {
    step1 = 'completed'; step2 = 'completed'; step3 = 'completed'; step4 = 'completed';
  } else {
    step1 = 'active';
  }

  const steps = [
    { cls: step1, icon: User, title: 'Companion Assigned', desc: `${companionName} is background-checked, Aadhaar verified, and preparing to support the patient.` },
    { cls: step2, icon: MapPin, title: 'Hospital Arrival & Check-In', desc: 'Companion guides patient safely through registration, billing queues, and the waiting lounge.' },
    { cls: step3, icon: Activity, title: 'Doctor Consultation Notes', desc: 'Companion records dosage instructions, doctor notes, and next follow-up dates.' },
    { cls: step4, icon: ShoppingBag, title: 'Medicines & Return', desc: 'Companion collects pharmacy medicines and escorts the patient safely back home.' },
  ];

  return (
    <div className="live-tracker-timeline">
      <span className="tracker-title"><span className="pulse"></span> Live Companion Journey</span>
      {steps.map((step) => {
        const Icon = step.cls === 'completed' ? Check : step.icon;
        return (
          <div className={`timeline-step ${step.cls}`} key={step.title}>
            <div className="timeline-icon-ring"><Icon /></div>
            <div className="timeline-step-content">
              <div className="timeline-step-header">
                <span className="timeline-step-title">{step.title}</span>
              </div>
              <p className="timeline-step-desc">{step.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string, withTime = true) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, padding: 16, borderRadius: 16, background: '#e7e9e4' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--m3-muted)' }}>
        <Icon style={{ width: 12, height: 12 }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.55px' }}>{label}</span>
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.25px', color: 'var(--ink-teal)', lineHeight: '20px' }}>{value}</span>
    </div>
  );
}

function PrimaryBookingCard({ booking, onDetails }: { booking: BookingRecord; onDetails: (b: BookingRecord) => void }) {
  const customMeta = booking.service_metadata || {};
  const companion: CompanionDetails | null = customMeta.companion || null;
  const scheduleDate = booking.scheduled_start_time ? formatDate(booking.scheduled_start_time) : formatDate(booking.created_at, false);
  // Same vocabulary gap as getStatusInfo: without 'accepted' the Track button
  // never appeared on a job a companion had picked up themselves.
  const trackable = ['assigned', 'accepted', 'in_progress', 'active'].some((k) => booking.status.toLowerCase().includes(k));

  return (
    <article style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 24, padding: 25, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-chip)', border: '1px solid #e1e3de', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          {companion?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={companion.photo} alt={`Companion ${companion.name}`} style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--m3-green)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
              {(companion?.name || serviceLabel(booking)).charAt(0)}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.15px', color: 'var(--ink-teal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {companion?.name || serviceLabel(booking)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>
              {companion ? (companion.specialty || 'Verified Companion') : booking.reference_code}
            </div>
          </div>
        </div>
        <StatusPill status={booking.status} />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <InfoTile icon={Briefcase} label="Service" value={serviceLabel(booking)} />
        <InfoTile icon={CalendarDays} label="Date & time" value={scheduleDate} />
      </div>

      <BillPanel booking={booking} />

      {/* The single thing a family wants on the day: the number of the person
          meeting them. Nothing rendered it before, on either side. */}
      {companion?.phone && trackable && (
        <a href={`tel:${companion.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 16, background: '#fff', border: '1px solid var(--m3-green)', color: 'var(--m3-green-deep)', textDecoration: 'none' }}>
          <Phone style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--m3-muted)' }}>Call your companion</span>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{companion.name} · {companion.phone}</span>
          </span>
        </a>
      )}

      <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
        {trackable ? (
          <Link href={`/tracking?t=${booking.share_token}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', borderRadius: 999, background: 'var(--m3-green-deep)', color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '0.1px', textDecoration: 'none' }}>
            <MapPin style={{ width: 15, height: 15 }} />
            Track Companion
          </Link>
        ) : (
          <a href={waLink(booking.reference_code, companion?.name)} target="_blank" rel="noopener" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', borderRadius: 999, background: 'var(--m3-green-deep)', color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '0.1px', textDecoration: 'none' }}>
            <MessageSquare style={{ width: 15, height: 15 }} />
            Chat Support
          </a>
        )}
        <button onClick={() => onDetails(booking)} aria-label="Booking details" style={{ display: 'grid', placeItems: 'center', padding: '0 25px', borderRadius: 999, border: '1px solid #707974', background: 'transparent', cursor: 'pointer', color: 'var(--ink-teal)' }}>
          <MoreHorizontal style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </article>
  );
}

function BookingRow({ booking, onDetails }: { booking: BookingRecord; onDetails: (b: BookingRecord) => void }) {
  const customMeta = booking.service_metadata || {};
  const companion: CompanionDetails | null = customMeta.companion || null;
  const when = booking.scheduled_start_time
    ? new Date(booking.scheduled_start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : new Date(booking.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <button onClick={() => onDetails(booking)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', padding: 17, borderRadius: 16, background: 'var(--m3-bg)', border: '1px solid #c0c9c3', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--m3-cyan)', color: 'var(--m3-cyan-ink)', flexShrink: 0 }}>
          <Activity style={{ width: 20, height: 20 }} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, letterSpacing: '0.25px', color: 'var(--ink-teal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {serviceLabel(booking)}
          </span>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>
            {when}{companion ? ` • ${companion.name}` : ` • ${booking.reference_code}`}
          </span>
        </span>
      </span>
      {/* The hero card shows a status pill and these rows did not, so the same
          cancelled booking read as cancelled in one place and fine in the other. */}
      {TERMINAL.has(booking.status.toUpperCase()) && (
        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--m3-muted)' }}>
          {getStatusInfo(booking.status).label}
        </span>
      )}
      <ChevronRight style={{ width: 14, height: 14, color: 'var(--m3-muted)', flexShrink: 0 }} />
    </button>
  );
}

/** The companion's name, when one is attached — the cancel warning names them. */
function companionName(b: BookingRecord): string | null {
  return (b.service_metadata?.companion?.name as string) || null;
}

/** <input type="datetime-local"> wants a local "YYYY-MM-DDTHH:MM", not a UTC one. */
function localInputValue(ms: number) {
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/**
 * Cancel and move, done by the customer instead of by a support message.
 *
 * Both go through the RPCs in migration 31 — the customer's session cannot write
 * `status` or `scheduled_start_time` directly, and the server re-checks the lead
 * window and the status, so a stale sheet cannot cancel a visit already running.
 */
function PlanChange({ booking, onChanged }: { booking: BookingRecord; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  // 'confirm' is a real step, not a nicety: one stray tap here calls off a
  // hospital visit somebody's family is relying on. It replaces a window.confirm,
  // which an in-app webview can suppress outright.
  const [mode, setMode] = useState<'idle' | 'moving' | 'confirm'>('idle');
  const moving = mode === 'moving';
  const [when, setWhen] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Read once when the sheet opens: the clock is not a render input.
  const [min] = useState(() => localInputValue(Date.now() + MIN_LEAD_MINUTES * 60_000));

  // The picker replaces the buttons at the very bottom of a scrollable sheet, so
  // on a phone it opens below the fold and reads as "the button disappeared".
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== 'idle') panel.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [mode]);

  const call = async (fn: 'cancel_booking' | 'reschedule_booking', args: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc(fn, args);
    setBusy(false);
    if (rpcError) { setError(rpcError.message); return; }
    onChanged();
  };

  const cancel = () => call('cancel_booking', { p_booking: booking.id, p_reason: null });

  const reschedule = () => {
    if (!when) return;
    const picked = new Date(when);
    if (picked.getTime() < Date.now() + MIN_LEAD_MINUTES * 60_000) {
      setError(`Pick a time at least ${MIN_LEAD_MINUTES} minutes from now.`);
      return;
    }
    call('reschedule_booking', { p_booking: booking.id, p_start: picked.toISOString() });
  };

  return (
    <div ref={panel} style={{ display: 'grid', gap: 8, marginTop: 2 }}>
      {moving ? (
        <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <label htmlFor="reschedule-at" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>New date &amp; time</label>
          <input
            id="reschedule-at"
            type="datetime-local"
            value={when}
            min={min}
            onChange={(e) => setWhen(e.target.value)}
            style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--ink)', background: 'var(--m3-bg)' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" full disabled={busy || !when} onClick={reschedule}>
              {busy ? 'Moving…' : 'Confirm new time'}
            </Button>
            <Button variant="ghost" full disabled={busy} onClick={() => { setMode('idle'); setError(null); }}>Back</Button>
          </div>
        </div>
      ) : mode === 'confirm' ? (
        <div style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 'var(--radius)', background: 'var(--terracotta-soft, #fdeeea)', border: '1px solid var(--terracotta)' }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--terracotta-deep, var(--terracotta))' }}>Cancel this visit?</span>
          <span style={{ fontSize: '0.78rem', lineHeight: '18px', color: 'var(--ink)' }}>
            {companionName(booking)
              ? `${companionName(booking)} is told straight away and the slot is released. Booking it again means starting over.`
              : 'The request is withdrawn and the slot released. Booking it again means starting over.'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" full disabled={busy} onClick={() => setMode('idle')}>Keep it</Button>
            <Button variant="primary" full disabled={busy} onClick={cancel} style={{ background: 'var(--terracotta)' }}>
              {busy ? 'Cancelling…' : 'Yes, cancel'}
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" full disabled={busy} onClick={() => setMode('moving')} iconLeft={<CalendarClock style={{ width: 16, height: 16 }} />}>Reschedule</Button>
          <Button variant="ghost" full disabled={busy} onClick={() => setMode('confirm')} style={{ color: 'var(--terracotta)' }} iconLeft={<XCircle style={{ width: 16, height: 16 }} />}>
            Cancel
          </Button>
        </div>
      )}
      {error && <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--terracotta)' }}>{error}</p>}
    </div>
  );
}

function DetailSheet({ booking, onClose, onChanged }: { booking: BookingRecord | null; onClose: () => void; onChanged: () => void }) {
  if (!booking) return null;
  const customMeta = booking.service_metadata || {};
  const companion: CompanionDetails | null = customMeta.companion || null;
  const careNeeds: string[] = customMeta.careNeeds || [];
  const scheduleDate = booking.scheduled_start_time ? formatDate(booking.scheduled_start_time) : formatDate(booking.created_at, false);
  // The same window migration 31 enforces: a visit that has started has time on
  // the clock and a bill to settle, so that one goes through support.
  const changeable = !isPastBooking(booking) && CHANGEABLE.has(booking.status.toUpperCase());

  const rows: [React.ElementType, string, React.ReactNode][] = [
    [Hash, 'Booking reference', booking.reference_code],
    [Activity, 'Service', serviceLabel(booking)],
    ...(companion ? [[User, 'Companion', companion.name] as [React.ElementType, string, React.ReactNode]] : []),
    ...(companion?.phone ? [[Phone, 'Companion phone', <a key="cp" href={`tel:${companion.phone}`} style={{ color: 'var(--teal)' }}>{companion.phone}</a>] as [React.ElementType, string, React.ReactNode]] : []),
    [Calendar, 'Date', scheduleDate],
    [MapPin, 'Address', booking.pickup_location?.title || '—'],
    [ShieldCheck, 'Status', getStatusInfo(booking.status).label],
    ...(booking.patient?.full_name ? [[User, 'Patient', `${booking.patient.full_name}${booking.patient.age ? ` (${booking.patient.age} yrs)` : ''}`] as [React.ElementType, string, React.ReactNode]] : []),
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(22,48,43,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end', fontFamily: EPILOGUE }}>
      {/* Bottom padding clears the phone's gesture bar; without it the last
          button sits under the home indicator on iOS. */}
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '86vh', overflowY: 'auto', background: 'var(--m3-bg)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '10px 0 calc(24px + env(safe-area-inset-bottom))', animation: 'caresy-sheet-up 0.28s var(--ease-out)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line-strong)', margin: '8px auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink-teal)' }}>{serviceLabel(booking)}</div>
            <div style={{ marginTop: 6 }}><StatusPill status={booking.status} /></div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', cursor: 'pointer', flexShrink: 0 }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div style={{ margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {rows.map(([Icon, label, value], i) => (
            <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 16px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
              <Icon style={{ width: 16, height: 16, color: 'var(--teal)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', width: 120, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-teal)', textAlign: 'right', marginLeft: 'auto' }}>{value}</span>
            </div>
          ))}
          {careNeeds.length > 0 && (
            <div style={{ padding: '13px 16px', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Specific needs</span>
              <div className="needs-tags">
                {careNeeds.map((need, idx) => <span className="need-tag" key={idx}>{need}</span>)}
              </div>
            </div>
          )}
          {booking.special_instructions && (
            <div style={{ padding: '13px 16px', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Notes</span>
              <span style={{ fontSize: '0.84rem', color: 'var(--ink)' }}>{booking.special_instructions}</span>
            </div>
          )}
        </div>

        {companion && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 16px 0', padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--success-soft)' }}>
              <ShieldCheck style={{ width: 16, height: 16, color: '#1B7A54' }} />
              <span style={{ fontSize: '0.78rem', color: '#1B7A54', fontWeight: 600 }}>{companion.name} is Aadhaar + police verified via AuthBridge.</span>
            </div>
            <div style={{ margin: '12px 16px 0' }}>
              <Timeline status={booking.status} companionName={companion.name} />
            </div>
          </>
        )}

        <div style={{ display: 'grid', gap: 8, padding: '16px 16px 4px' }}>
          <a href={waLink(booking.reference_code, companion?.name)} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
            <Button variant="primary" full size="lg" shape="pill" iconLeft={<MessageSquare style={{ width: 18, height: 18 }} />}>Chat Support on WhatsApp</Button>
          </a>
          <a href={mailLink(booking.reference_code)} style={{ textDecoration: 'none' }}>
            <Button variant="secondary" full iconLeft={<Mail style={{ width: 16, height: 16 }} />}>Email Support instead</Button>
          </a>
          {changeable && <PlanChange booking={booking} onChanged={onChanged} />}
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--muted)', margin: '6px 0 0' }}>
            {changeable
              ? 'Free to change until your companion starts the visit. After that, message support.'
              : 'Need to change something? Message support and we will sort it out.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyBookings({ label, showBookLinks }: { label: string; showBookLinks: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)' }}>
      <div style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', background: 'var(--m3-cyan)', margin: '0 auto 16px' }}>
        <CalendarHeart style={{ width: 28, height: 28, color: 'var(--m3-cyan-ink)' }} />
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--m3-ink)' }}>No {label} bookings</h3>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--m3-muted)' }}>When you book a companion, it will show up here with live status and support.</p>
      {showBookLinks && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/booking" style={{ padding: '12px 24px', borderRadius: 999, background: 'var(--m3-green)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Schedule a Visit</Link>
          <Link href="/quick-help" style={{ padding: '12px 24px', borderRadius: 999, background: 'var(--m3-urgent)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Get Urgent Help</Link>
        </div>
      )}
    </div>
  );
}

function PageHeader({ initial }: { initial: string }) {
  const router = useRouter();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.back()} aria-label="Go back" style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-teal)' }}>
          <ArrowLeft style={{ width: 20, height: 20 }} />
        </button>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 700, color: 'var(--ink-teal)' }}>My Bookings</h1>
      </div>
      <Link href="/profile" aria-label="Your profile" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--m3-green)', padding: 2, boxSizing: 'border-box', textDecoration: 'none' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--m3-green)', color: '#fff', fontWeight: 800, fontSize: 14 }}>{initial}</span>
      </Link>
    </div>
  );
}

export default function MyBookings() {
  const { user, profile, isLoading: authIsLoading, openLogin } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [detail, setDetail] = useState<BookingRecord | null>(null);

  // `quiet` skips the full-page loader so the live-visit poll below can refresh
  // in place instead of blanking the screen every minute.
  const fetchBookings = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          reference_code,
          share_token,
          status,
          created_at,
          scheduled_start_time,
          special_instructions,
          estimated_duration_minutes,
          service_type,
          booking_type,
          service_metadata,
          actual_start_time,
          final_amount_paise,
          billed_minutes,
          payment_status,
          payment_method,
          patient:patients (
            full_name,
            age,
            emergency_contact_phone
          ),
          pickup_location:locations!pickup_location_id (
            title,
            address_line_1
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBookings(data || []);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'Failed to connect to the database. Please check configuration.');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authIsLoading) return;
    if (user) {
      fetchBookings();
    } else {
      setIsLoading(false);
    }
  }, [user, authIsLoading]);

  // Status and payment_status only change with a fetch, so without this the
  // meter would keep climbing after the companion tapped Complete — the one
  // reading a customer would take as a bill still running up. Only polls while
  // a visit is actually live, and stops on its own once it isn't.
  const hasLiveVisit = bookings.some((b) => b.status === 'IN_PROGRESS');
  useEffect(() => {
    if (!hasLiveVisit) return;
    const id = setInterval(() => { fetchBookings(true); }, 60_000);
    return () => clearInterval(id);
  }, [hasLiveVisit]);

  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string);
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'C';

  if (isLoading || authIsLoading) {
    return (
      <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 24px' }}>
          <Loader2 style={{ width: 40, height: 40, color: 'var(--m3-green)' }} className="animate-spin" />
          <p style={{ color: 'var(--m3-muted)', fontWeight: 600 }}>Loading your bookings...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, paddingBottom: 96 }}>
        <div style={{ maxWidth: 576, margin: '0 auto' }}>
          <PageHeader initial={initial} />
          <div style={{ margin: '16px 16px 0', textAlign: 'center', padding: '40px 24px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><MotionSpot variant="calendar" size={128} /></div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--m3-ink)' }}>No bookings yet</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: '20px', color: 'var(--m3-muted)' }}>
              Book a verified companion in a couple of minutes — no account needed to start. Sign in later to see your visits here and follow them live.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button variant="primary" onClick={() => router.push('/booking')}>Book Now</Button>
              <Button variant="outline" onClick={() => openLogin('/my-bookings')}>Sign In</Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const when = (b: BookingRecord) => new Date(b.scheduled_start_time || b.created_at).getTime();
  // Upcoming: soonest first (nearest visit is the "Next Scheduled" hero).
  const upcomingBookings = bookings.filter((b) => !isPastBooking(b)).sort((a, b) => when(a) - when(b));
  // Past: most recent first.
  const pastBookings = bookings.filter(isPastBooking).sort((a, b) => when(b) - when(a));
  const list = filter === 'upcoming' ? upcomingBookings : pastBookings;
  const [primary, ...rest] = list;

  return (
    <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, paddingBottom: 96 }}>
      <div style={{ maxWidth: 576, margin: '0 auto' }}>
        <PageHeader initial={initial} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: '0 16px' }}>

          {/* Tabs */}
          <div style={{ position: 'relative', display: 'flex', borderBottom: '1px solid #c0c9c3' }}>
            {(['upcoming', 'past'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  flex: 1, padding: '16px 0', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, letterSpacing: '0.1px', lineHeight: '20px',
                  fontWeight: filter === key ? 700 : 500,
                  color: filter === key ? 'var(--ink-teal)' : 'var(--m3-muted)',
                }}
              >
                {key === 'upcoming' ? 'Upcoming' : 'Past'}
              </button>
            ))}
            <span style={{ position: 'absolute', bottom: -1, left: filter === 'upcoming' ? 0 : '50%', width: '50%', height: 3, background: 'var(--ink-teal)', transition: 'left 0.2s ease' }} />
          </div>

          {error ? (
            <div style={{ textAlign: 'center', padding: '32px 24px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid rgba(196, 85, 67, 0.3)' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--terracotta)' }}>Database Connection Error</h2>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--m3-muted)' }}>{error}</p>
              <Button variant="primary" onClick={() => fetchBookings()}>Retry Connection</Button>
            </div>
          ) : list.length === 0 ? (
            <EmptyBookings label={filter === 'upcoming' ? 'upcoming' : 'past'} showBookLinks={filter === 'upcoming'} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 500, color: 'var(--ink-teal)' }}>
                {filter === 'upcoming' ? 'Next Scheduled' : 'Booking History'}
              </h2>
              <PrimaryBookingCard booking={primary} onDetails={setDetail} />
              {rest.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--ink-teal)' }}>
                    {filter === 'upcoming' ? 'Also Coming Up' : 'Earlier'}
                  </h3>
                  {rest.map((booking) => <BookingRow key={booking.id} booking={booking} onDetails={setDetail} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DetailSheet
        booking={detail}
        onClose={() => setDetail(null)}
        onChanged={() => { setDetail(null); fetchBookings(); }}
      />
    </main>
  );
}
