'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Mail, ShieldCheck, Check, User, MapPin, Activity, ShoppingBag, Loader2, Hash, Calendar, Clock, CalendarHeart, X, CalendarClock, XCircle } from 'lucide-react';
import { Button } from '@caresy/ui';

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
  assigned: { bg: 'var(--teal-soft)', fg: 'var(--teal-deep)', dot: 'var(--teal)', live: true },
  active: { bg: 'var(--success-soft)', fg: '#1B7A54', dot: 'var(--success)', live: true },
  completed: { bg: 'rgba(92,107,100,0.14)', fg: 'var(--muted)', dot: 'var(--muted)' },
};

function getStatusInfo(status: string) {
  const s = status.toLowerCase();
  if (s === 'pending' || s === 'draft') return { label: 'Pending Assignment', cls: 'pending' };
  if (s.includes('review')) return { label: 'Under Review', cls: 'review' };
  if (s.includes('assigned')) return { label: 'Companion Assigned', cls: 'assigned' };
  if (s.includes('progress') || s === 'active') return { label: 'Active Visit', cls: 'active' };
  if (s === 'completed') return { label: 'Completed', cls: 'completed' };
  if (s === 'cancelled') return { label: 'Cancelled', cls: 'completed' };
  return { label: status, cls: 'pending' };
}

function isPastStatus(status: string) {
  const s = status.toLowerCase();
  return s === 'completed' || s === 'cancelled';
}

function StatusPill({ status }: { status: string }) {
  const info = getStatusInfo(status);
  const s = STATUS_STYLE[info.cls] || STATUS_STYLE.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: s.bg, color: s.fg, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1, flexShrink: 0 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, animation: s.live ? 'caresy-pulse 1.8s infinite' : 'none' }} />
      {info.label}
    </span>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <Icon style={{ width: 15, height: 15, color: 'var(--muted)', flexShrink: 0 }} />
      <span style={{ fontSize: '0.76rem', color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', marginLeft: 'auto', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
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

function BookingCard({ booking, onDetails }: { booking: BookingRecord; onDetails: (b: BookingRecord) => void }) {
  const customMeta = booking.service_metadata || {};
  const companion: CompanionDetails | null = customMeta.companion || null;
  const scheduleDate = booking.scheduled_start_time ? formatDate(booking.scheduled_start_time) : formatDate(booking.created_at, false);

  return (
    <article className="booking-card material-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{customMeta.originalService || booking.service_type}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{companion ? `with ${companion.name}` : booking.reference_code}</div>
        </div>
        <StatusPill status={booking.status} />
      </div>

      <div style={{ display: 'grid', gap: 9, padding: '0 18px 16px' }}>
        <MetaRow icon={Hash} label="Reference" value={booking.reference_code} />
        <MetaRow icon={Calendar} label="Date" value={scheduleDate} />
        <MetaRow icon={MapPin} label="Where" value={booking.pickup_location?.title || '—'} />
        {booking.estimated_duration_minutes && (
          <MetaRow icon={Clock} label="Duration" value={`${Math.round(booking.estimated_duration_minutes / 60)}h`} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--line)', background: 'rgba(244,236,230,0.5)' }}>
        <a href={waLink(booking.reference_code, companion?.name)} target="_blank" rel="noopener" style={{ flex: 1, textDecoration: 'none' }}>
          <Button variant="primary" size="sm" full iconLeft={<MessageSquare style={{ width: 16, height: 16 }} />}>Chat Support</Button>
        </a>
        <Button variant="secondary" size="sm" onClick={() => onDetails(booking)} iconLeft={<Hash style={{ width: 16, height: 16 }} />}>Details</Button>
      </div>
    </article>
  );
}

function DetailSheet({ booking, onClose }: { booking: BookingRecord | null; onClose: () => void }) {
  if (!booking) return null;
  const customMeta = booking.service_metadata || {};
  const companion: CompanionDetails | null = customMeta.companion || null;
  const careNeeds: string[] = customMeta.careNeeds || [];
  const scheduleDate = booking.scheduled_start_time ? formatDate(booking.scheduled_start_time) : formatDate(booking.created_at, false);
  const upcoming = !isPastStatus(booking.status);

  const rows: [React.ElementType, string, React.ReactNode][] = [
    [Hash, 'Booking reference', booking.reference_code],
    [Activity, 'Service', customMeta.originalService || booking.service_type],
    ...(companion ? [[User, 'Companion', companion.name] as [React.ElementType, string, React.ReactNode]] : []),
    [Calendar, 'Date', scheduleDate],
    [MapPin, 'Address', booking.pickup_location?.title || '—'],
    [ShieldCheck, 'Status', getStatusInfo(booking.status).label],
    ...(booking.patient?.full_name ? [[User, 'Patient', `${booking.patient.full_name}${booking.patient.age ? ` (${booking.patient.age} yrs)` : ''}`] as [React.ElementType, string, React.ReactNode]] : []),
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(22,48,43,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '86vh', overflowY: 'auto', background: 'var(--paper)', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '10px 0 24px', animation: 'caresy-sheet-up 0.28s var(--ease-out)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line-strong)', margin: '8px auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink-teal)' }}>{customMeta.originalService || booking.service_type}</div>
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
    <div className="empty-state material-card">
      <div style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', background: 'var(--sage)', margin: '0 auto 16px' }}>
        <CalendarHeart style={{ width: 28, height: 28, color: 'var(--teal-deep)' }} />
      </div>
      <h3>No {label} bookings</h3>
      <p>When you book a companion, it will show up here with live status and support.</p>
      {showBookLinks && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" href="/booking">Schedule a Visit</Link>
          <Link className="btn btn-urgent" href="/quick-help">Get Urgent Help</Link>
        </div>
      )}
    </div>
  );
}

export default function MyBookings() {
  const { user, isLoading: authIsLoading, openLogin } = useAuth();
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

  if (isLoading || authIsLoading) {
    return (
      <main className="app-shell-page" id="main-content">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '80px 24px' }}>
          <Loader2 style={{ width: '40px', height: '40px', color: 'var(--primary)' }} className="animate-spin" />
          <p style={{ color: 'var(--muted)', fontWeight: 600 }}>Loading your bookings...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell-page my-bookings-page" id="main-content">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ padding: '20px 2px 6px' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink-teal)', letterSpacing: '-0.01em' }}>Your bookings</h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>Track every visit, status, and payment in one place.</p>
          </div>
          <div className="unauth-card material-card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
            <h2>Authentication Required</h2>
            <p>Please sign in to access your booking dashboard and track companion matches.</p>
            <Button variant="primary" onClick={() => openLogin()}>Sign In / Register</Button>
          </div>
        </div>
      </main>
    );
  }

  const upcomingBookings = bookings.filter((b) => !isPastStatus(b.status));
  const pastBookings = bookings.filter((b) => isPastStatus(b.status));
  const list = filter === 'upcoming' ? upcomingBookings : pastBookings;

  return (
    <main className="app-shell-page my-bookings-page" id="main-content">
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ padding: '20px 2px 10px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink-teal)', letterSpacing: '-0.01em' }}>Your bookings</h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>Track every visit, status, and payment in one place.</p>
        </div>
        {error ? (
          <div className="unauth-card material-card" style={{ borderColor: 'rgba(196, 85, 67, 0.3)' }}>
            <h2 style={{ color: 'var(--terracotta)' }}>Database Connection Error</h2>
            <p>{error}</p>
            <Button variant="primary" onClick={() => fetchBookings()}>Retry Connection</Button>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyBookings label="any" showBookLinks />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
              {([['upcoming', 'Upcoming', upcomingBookings.length], ['past', 'History', pastBookings.length]] as const).map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '10px 12px', borderRadius: 999, border: '1px solid ' + (filter === key ? 'transparent' : 'var(--line)'),
                    background: filter === key ? 'var(--ink-teal)' : 'var(--surface)', color: filter === key ? '#fff' : 'var(--muted)',
                    fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', transition: 'all var(--dur) var(--ease-out)',
                  }}
                >
                  {label}
                  <span style={{ display: 'grid', placeItems: 'center', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: filter === key ? 'rgba(255,255,255,0.18)' : 'var(--sage)', color: filter === key ? '#fff' : 'var(--ink-teal)', fontSize: '0.7rem', fontWeight: 800 }}>{count}</span>
                </button>
              ))}
            </div>

            <div className="booking-list-container">
              {list.length === 0
                ? <EmptyBookings label={filter} showBookLinks={filter === 'upcoming'} />
                : list.map((booking) => <BookingCard key={booking.id} booking={booking} onDetails={setDetail} />)}
            </div>
          </>
        )}
      </div>

      <DetailSheet booking={detail} onClose={() => setDetail(null)} />
    </main>
  );
}
