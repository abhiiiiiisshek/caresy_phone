'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { Star, Phone, Share2, Loader2, HelpCircle } from 'lucide-react';

const EPILOGUE = 'var(--font-epilogue), sans-serif';
const SUPPORT_WA = '919717500225';

interface TrackedBooking {
  id: string;
  reference_code: string;
  status: string;
  scheduled_start_time: string | null;
  created_at: string;
  service_metadata: any;
  pickup_location?: { title?: string } | null;
}

interface TripPosition { last_lat: number | null; last_lng: number | null; last_location_at: string | null }

// OpenStreetMap embed centred on a point with a marker. No SDK / key / deps.
function osmEmbed(lat: number, lng: number): string {
  const d = 0.006;
  const bbox = [lng - d, lat - d, lng + d, lat + d].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function stepsFor(status: string, companionName: string) {
  const s = status.toLowerCase();
  const all = [
    { title: 'Booking Confirmed', desc: `${companionName} has been assigned to your visit` },
    { title: 'Companion En Route', desc: `${companionName} is currently on the way to your location.` },
    { title: 'Visit In Progress', desc: `${companionName} is with the patient at the hospital.` },
    { title: 'Visit Completed', desc: 'Medicines collected and patient safely returned.' },
  ];
  let activeIdx = 1;
  if (s.includes('assigned')) activeIdx = 1;
  else if (s.includes('progress') || s === 'active') activeIdx = 2;
  else if (s === 'completed') activeIdx = 3;
  return { all: all.slice(0, Math.max(activeIdx + 1, 2)), activeIdx };
}

function headline(status: string) {
  const s = status.toLowerCase();
  if (s.includes('assigned')) return 'Your companion is on the way';
  if (s.includes('progress') || s === 'active') return 'Your companion is with the patient';
  if (s === 'completed') return 'Visit completed';
  return 'Finding your companion';
}

function TrackingInner() {
  const params = useSearchParams();
  const ref = params.get('ref');
  const { user, isLoading: authLoading } = useAuth();
  const [booking, setBooking] = useState<TrackedBooking | null>(null);
  const [pos, setPos] = useState<TripPosition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !ref) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from('bookings')
      .select('id, reference_code, status, scheduled_start_time, created_at, service_metadata, pickup_location:locations!pickup_location_id (title)')
      .eq('reference_code', ref)
      .limit(1)
      .then(({ data }) => {
        setBooking((data?.[0] as unknown as TrackedBooking) || null);
        setLoading(false);
      });
  }, [user, authLoading, ref]);

  // Poll the trip's last-known position (companion shares it from their portal).
  // Trips aren't on a realtime publication, so a light 10s poll is enough.
  useEffect(() => {
    if (!booking?.id) return;
    const supabase = createClient();
    let alive = true;
    const tick = () => {
      supabase.from('trips').select('last_lat, last_lng, last_location_at')
        .eq('booking_id', booking.id).not('status', 'in', '(completed,cancelled)')
        .limit(1).maybeSingle()
        .then(({ data }) => { if (alive) setPos((data as TripPosition) ?? null); });
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, [booking?.id]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: 'Caresy live status', url }); } catch { /* cancelled */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent('Track our Caresy companion visit: ' + url)}`, '_blank');
    }
  };

  if (loading || authLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', padding: '120px 24px' }}>
        <Loader2 className="animate-spin" style={{ width: 40, height: 40, color: 'var(--m3-green)' }} />
      </div>
    );
  }

  const companion = booking?.service_metadata?.companion;
  const companionName = companion?.name || 'Your companion';

  if (!booking) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--m3-ink)', margin: '0 0 8px' }}>Nothing to track</h2>
        <p style={{ fontSize: 14, color: 'var(--m3-muted)', margin: '0 0 20px' }}>
          {user ? 'This booking could not be found.' : 'Sign in to track your booking.'}
        </p>
        <Link href="/my-bookings" style={{ padding: '12px 24px', borderRadius: 999, background: 'var(--m3-green)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Go to My Bookings</Link>
      </div>
    );
  }

  const { all: steps, activeIdx } = stepsFor(booking.status, companionName);
  const confirmedAt = booking.scheduled_start_time || booking.created_at;
  const confirmedTime = new Date(confirmedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Live companion location once they start sharing from the companion portal;
          stylized placeholder until the first GPS ping arrives. */}
      {pos?.last_lat != null && pos?.last_lng != null ? (
        <div style={{ position: 'relative', flex: 1, minHeight: 320, overflow: 'hidden' }}>
          <iframe title="Companion live location" width="100%" height="100%" loading="lazy" style={{ border: 0, minHeight: 320, display: 'block' }} src={osmEmbed(pos.last_lat, pos.last_lng)} />
          <span style={{ position: 'absolute', top: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 12, fontWeight: 700, color: 'var(--m3-green)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#006971', animation: 'caresy-pulse 1.8s infinite' }} />
            Live location
          </span>
        </div>
      ) : (
        <div style={{ position: 'relative', flex: 1, minHeight: 320, background: 'linear-gradient(180deg, #cfe5da 0%, #f1f3f0 40%, #e7ece7 100%)', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(27,77,62,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(27,77,62,0.06) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        {/* Companion marker */}
        <div style={{ position: 'absolute', left: '38%', top: '42%', filter: 'drop-shadow(0 4px 3px rgba(0,0,0,0.15))' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '4px solid #fff', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
            {companion?.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companion.photo} alt={companionName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <span style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--m3-green)', color: '#fff', fontWeight: 800, fontSize: 18 }}>{companionName.charAt(0)}</span>
            )}
          </div>
          <div style={{ width: 16, height: 16, background: '#fff', transform: 'rotate(45deg)', margin: '-8px auto 0' }} />
        </div>
        {/* Destination marker */}
        <div style={{ position: 'absolute', right: '40%', bottom: '28%' }}>
          <span style={{ display: 'block', width: 16, height: 16, borderRadius: 8, background: '#006971', border: '2px solid #fff', boxShadow: '0 0 5px rgba(0,105,113,0.3)' }} />
          <span style={{ position: 'absolute', inset: -12, borderRadius: 18, border: '2px solid #006971', animation: 'caresy-pulse 1.8s infinite' }} />
        </div>
      </div>
      )}

      {/* Status panel */}
      <div style={{ margin: '-32px 16px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <span style={{ width: 48, height: 6, borderRadius: 999, background: '#c0c9c3', opacity: 0.5 }} />
          </div>
          <div style={{ padding: '16px 24px 17px', borderBottom: '1px solid #e1e3de' }}>
            <h2 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 500, color: 'var(--m3-ink)' }}>{headline(booking.status)}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>
              Booking {booking.reference_code}
              {booking.pickup_location?.title ? ` · ${booking.pickup_location.title}` : ''}
            </p>
          </div>

          {/* Companion row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e7e9e4', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                {companion?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={companion.photo} alt={companionName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--m3-green)' }}>{companionName.charAt(0)}</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--m3-ink)' }}>{companionName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                  {companion?.rating && (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star style={{ width: 13, height: 13, fill: 'var(--warning)', color: 'var(--warning)' }} />
                        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-ink)' }}>{companion.rating}</span>
                      </span>
                      <span style={{ color: '#c0c9c3' }}>•</span>
                    </>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>{companion?.verification || companion?.specialty || 'Verified'}</span>
                </div>
              </div>
            </div>
            <a href={`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(`Hi, connect me with ${companionName} for booking ${booking.reference_code}`)}`} target="_blank" rel="noopener" aria-label={`Call ${companionName}`} style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', background: 'var(--m3-cyan)', color: 'var(--m3-cyan-ink)' }}>
              <Phone style={{ width: 18, height: 18 }} />
            </a>
          </div>

          {/* Progress timeline */}
          <div style={{ background: 'rgba(242,244,239,0.5)', padding: '16px 24px' }}>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 24, paddingLeft: 24 }}>
              <span style={{ position: 'absolute', left: 10, top: 8, bottom: 8, width: 1, background: '#c0c9c3' }} />
              {steps.map((step, i) => {
                const isActive = i === activeIdx;
                const done = i < activeIdx;
                return (
                  <div key={step.title} style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%', background: isActive ? '#006971' : done || i <= activeIdx ? 'var(--m3-green)' : '#c0c9c3', boxShadow: isActive ? '0 0 0 4px rgba(151,237,247,0.3)' : '0 0 0 4px rgba(27,77,62,0.2)' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, lineHeight: '20px', fontWeight: 500, letterSpacing: '0.15px', color: isActive ? '#006971' : 'var(--m3-ink)' }}>{step.title}</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: 'var(--m3-muted)', opacity: isActive ? 1 : 0.7 }}>{step.desc}</p>
                      </div>
                      {i === 0 && <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)', flexShrink: 0 }}>{confirmedTime}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions footer */}
          <div style={{ background: 'var(--m3-bg)', borderTop: '1px solid #e1e3de', padding: 24 }}>
            <button onClick={share} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 24px', borderRadius: 999, border: 'none', background: 'var(--m3-green)', color: '#fff', fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <Share2 style={{ width: 16, height: 16 }} />
              Share Live Status
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LiveTracking() {
  return (
    <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, display: 'flex', flexDirection: 'column', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <Link href="/" style={{ fontSize: 28, lineHeight: '36px', fontWeight: 700, color: 'var(--m3-green)', textDecoration: 'none' }}>Caresy</Link>
        <Link href="/support" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, color: 'var(--m3-muted)', fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', textDecoration: 'none' }}>
          <HelpCircle style={{ width: 20, height: 20 }} />
          Help
        </Link>
      </div>
      <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', padding: '120px 24px' }}><Loader2 className="animate-spin" style={{ width: 40, height: 40, color: 'var(--m3-green)' }} /></div>}>
        <TrackingInner />
      </Suspense>
    </main>
  );
}
