'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { MessageSquare, Mail, ShieldCheck, Check, User, MapPin, Activity, ShoppingBag, Loader2, Hash, Calendar, Clock, CalendarHeart, X, CalendarClock, XCircle, ArrowLeft, ChevronRight, MoreHorizontal, Briefcase, CalendarDays } from 'lucide-react';
import { Button } from '@caresy/ui';

const EPILOGUE = 'var(--font-epilogue), sans-serif';

interface CompanionDetails {
  name: string;
  avatar: string;
  rating: string;
  verification: string;
  lang: string;
  specialty: string;
  color?: string;
  photo?: string;
}

interface BookingRecord {
  id: string;
  reference_code: string;
  status: string;
  created_at: string;
  scheduled_start_time: string | null;
  special_instructions: string | null;
  estimated_duration_minutes: number | null;
  service_type: string;
  booking_type: string;
  service_metadata: any;
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
  if (s.includes('assigned')) return { label: 'Confirmed', cls: 'assigned' };
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
  const trackable = ['assigned', 'in_progress', 'active'].some((k) => booking.status.toLowerCase().includes(k));

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

      <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
        {trackable ? (
          <Link href={`/tracking?ref=${booking.reference_code}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', borderRadius: 999, background: 'var(--m3-green-deep)', color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '0.1px', textDecoration: 'none' }}>
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
      <ChevronRight style={{ width: 14, height: 14, color: 'var(--m3-muted)', flexShrink: 0 }} />
    </button>
  );
}

function DetailSheet({ booking, onClose }: { booking: BookingRecord | null; onClose: () => void }) {
  if (!booking) return null;
  const customMeta = booking.service_metadata || {};
  const companion: CompanionDetails | null = customMeta.companion || null;
  const careNeeds: string[] = customMeta.careNeeds || [];
  const scheduleDate = booking.scheduled_start_time ? formatDate(booking.scheduled_start_time) : formatDate(booking.created_at, false);
  const upcoming = !isPastBooking(booking);

  const rows: [React.ElementType, string, React.ReactNode][] = [
    [Hash, 'Booking reference', booking.reference_code],
    [Activity, 'Service', serviceLabel(booking)],
    ...(companion ? [[User, 'Companion', companion.name] as [React.ElementType, string, React.ReactNode]] : []),
    [Calendar, 'Date', scheduleDate],
    [MapPin, 'Address', booking.pickup_location?.title || '—'],
    [ShieldCheck, 'Status', getStatusInfo(booking.status).label],
    ...(booking.patient?.full_name ? [[User, 'Patient', `${booking.patient.full_name}${booking.patient.age ? ` (${booking.patient.age} yrs)` : ''}`] as [React.ElementType, string, React.ReactNode]] : []),
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(22,48,43,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end', fontFamily: EPILOGUE }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '86vh', overflowY: 'auto', background: 'var(--m3-bg)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '10px 0 24px', animation: 'caresy-sheet-up 0.28s var(--ease-out)' }}>
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
          {upcoming && (
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <Button variant="outline" full onClick={onClose} iconLeft={<CalendarClock style={{ width: 16, height: 16 }} />}>Reschedule</Button>
              <Button variant="ghost" full onClick={onClose} style={{ color: 'var(--terracotta)' }} iconLeft={<XCircle style={{ width: 16, height: 16 }} />}>Cancel</Button>
            </div>
          )}
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--muted)', margin: '6px 0 0' }}>Reschedule &amp; cancellation are handled by our support team for now.</p>
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
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [detail, setDetail] = useState<BookingRecord | null>(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          reference_code,
          status,
          created_at,
          scheduled_start_time,
          special_instructions,
          estimated_duration_minutes,
          service_type,
          booking_type,
          service_metadata,
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
      setIsLoading(false);
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
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔐</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--m3-ink)' }}>Authentication Required</h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--m3-muted)' }}>Please sign in to access your booking dashboard and track companion matches.</p>
            <Button variant="primary" onClick={() => openLogin()}>Sign In / Register</Button>
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

      <DetailSheet booking={detail} onClose={() => setDetail(null)} />
    </main>
  );
}
