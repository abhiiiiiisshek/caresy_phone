'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Check, X, Loader2, BellRing, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Input, Button } from '@/components/ds';

/**
 * LocationBadge — geolocation-driven service-area indicator for the app's
 * greeting bar. Detects the visitor's area once (cached in localStorage),
 * reverse-geocodes it, and shows whether Caresy operates there. Falls back
 * to manual entry when permission is denied or geocoding fails.
 *
 * Privacy: raw GPS coordinates are sent only to the reverse-geocoding
 * endpoint and are never stored — only the resolved area name and the
 * serviceability flag are kept, and the user can clear them anytime.
 */

const LS_KEY = 'caresy_location_v1';

// Service area: Noida & Greater Noida (Gautam Buddha Nagar district).
// String match handles geocoder naming variants; the distance check handles
// boundary cases where the geocoder returns a neighbouring locality name for
// an address that is actually within our operating radius.
const SERVED_PATTERN = /noida|gautam\s*buddh?a?\s*nagar/i;
const SERVICE_ANCHORS: [number, number][] = [
  [28.5355, 77.391], // Noida
  [28.4744, 77.504], // Greater Noida
];
const SERVICE_RADIUS_KM = 25;

const QUICK_PICKS = ['Noida', 'Greater Noida', 'Ghaziabad', 'New Delhi'];

interface StoredLocation {
  area: string;
  served: boolean;
  manual: boolean;
  ts: number;
}

type BadgeState =
  | { kind: 'loading' }
  | { kind: 'unset' }
  | { kind: 'resolved'; loc: StoredLocation };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isServed(areaText: string, lat?: number, lon?: number): boolean {
  if (SERVED_PATTERN.test(areaText)) return true;
  if (lat != null && lon != null) {
    return SERVICE_ANCHORS.some(([aLat, aLon]) => haversineKm(lat, lon, aLat, aLon) <= SERVICE_RADIUS_KM);
  }
  return false;
}

function readStored(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.area === 'string' && typeof parsed?.served === 'boolean') return parsed;
  } catch {
    /* corrupted entry — treat as unset */
  }
  return null;
}

function writeStored(loc: StoredLocation) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(loc));
  } catch {
    /* storage full/blocked — badge still works for this visit */
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  // BigDataCloud's client-side endpoint: no API key, CORS-enabled, free tier
  // designed for exactly this browser use case.
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
  );
  if (!res.ok) throw new Error(`reverse geocode failed: ${res.status}`);
  const data = await res.json();
  // Prefer the most specific human-readable name available.
  const area = data.city || data.locality || data.principalSubdivision;
  if (!area) throw new Error('reverse geocode returned no locality');
  // Keep district context when it adds serviceability signal (e.g. locality
  // inside Gautam Buddha Nagar that isn't literally named "Noida").
  const district = data.localityInfo?.administrative?.find?.(
    (a: { adminLevel?: number; name?: string }) => a.adminLevel === 5
  )?.name;
  return district && district !== area ? `${area}, ${district}` : area;
}

export default function LocationBadge() {
  const [state, setState] = useState<BadgeState>({ kind: 'loading' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [notifyPhone, setNotifyPhone] = useState('');
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [detecting, setDetecting] = useState(false);

  const resolveFromCoords = useCallback((lat: number, lon: number) => {
    reverseGeocode(lat, lon)
      .then((area) => {
        const loc: StoredLocation = { area, served: isServed(area, lat, lon), manual: false, ts: Date.now() };
        writeStored(loc);
        setState({ kind: 'resolved', loc });
      })
      .catch(() => {
        // Geocoding failed (network/service) — still know whether coords are
        // in range, so degrade to a generic area name rather than giving up.
        const served = isServed('', lat, lon);
        const loc: StoredLocation = { area: served ? 'your area' : 'your current area', served, manual: false, ts: Date.now() };
        setState({ kind: 'resolved', loc });
      })
      .finally(() => setDetecting(false));
  }, []);

  const detect = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ kind: 'unset' });
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolveFromCoords(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Denied or unavailable — fall back to manual entry.
        setDetecting(false);
        setState({ kind: 'unset' });
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }, [resolveFromCoords]);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setState({ kind: 'resolved', loc: stored });
    } else {
      detect();
    }
  }, [detect]);

  const applyManual = (text: string) => {
    const area = text.trim();
    if (!area) return;
    const loc: StoredLocation = { area, served: isServed(area), manual: true, ts: Date.now() };
    writeStored(loc);
    setState({ kind: 'resolved', loc });
    setSheetOpen(false);
    setManualValue('');
    setNotifyStatus('idle');
  };

  const clearLocation = () => {
    try {
      localStorage.removeItem(LS_KEY);
    } catch { /* ignore */ }
    setState({ kind: 'unset' });
    setSheetOpen(false);
    setNotifyStatus('idle');
  };

  const submitNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind !== 'resolved') return;
    setNotifyStatus('sending');
    try {
      const supabase = createClient();
      const { error } = await supabase.from('contact_messages').insert({
        name: 'Service area waitlist',
        phone: notifyPhone,
        message: `Notify me when Caresy launches in: ${state.loc.area}`,
      });
      if (error) throw error;
      setNotifyStatus('done');
      setNotifyPhone('');
    } catch {
      setNotifyStatus('error');
    }
  };

  const linkStyle: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontSize: '0.74rem', fontWeight: 700, color: 'var(--teal)', textDecoration: 'underline', flexShrink: 0,
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--muted)', minWidth: 0, flexWrap: 'wrap' }}>
        <MapPin style={{ width: 13, height: 13, flexShrink: 0 }} />
        {state.kind === 'loading' || detecting ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} /> Detecting your area…
          </span>
        ) : state.kind === 'unset' ? (
          <button onClick={() => setSheetOpen(true)} style={linkStyle}>Set your location</button>
        ) : (
          <>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999,
              background: state.loc.served ? 'var(--success-soft)' : 'rgba(92,107,100,0.14)',
              color: state.loc.served ? '#1B7A54' : 'var(--muted)',
              fontWeight: 700, maxWidth: '100%',
            }}>
              {state.loc.served
                ? <Check style={{ width: 11, height: 11, flexShrink: 0 }} />
                : <X style={{ width: 11, height: 11, flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {state.loc.served ? `We serve ${state.loc.area}` : `Not yet in ${state.loc.area}`}
              </span>
            </span>
            {!state.loc.served && (
              <button onClick={() => { setSheetOpen(true); setNotifyStatus('idle'); }} style={linkStyle}>Get notified</button>
            )}
            <button onClick={() => setSheetOpen(true)} style={{ ...linkStyle, color: 'var(--muted)' }}>Change</button>
          </>
        )}
      </div>

      {sheetOpen && (
        <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(22,48,43,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', background: 'var(--paper)', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '10px 20px 28px', animation: 'caresy-sheet-up 0.28s var(--ease-out)' }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line-strong)', margin: '8px auto 14px' }} />
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink-teal)' }}>Your location</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--muted)' }}>
              We currently operate in Noida &amp; Greater Noida. Your location is stored only on this device.
            </p>

            {/* Not-served waitlist */}
            {state.kind === 'resolved' && !state.loc.served && (
              <div style={{ padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <BellRing style={{ width: 16, height: 16, color: 'var(--teal)' }} />
                  <strong style={{ fontSize: '0.88rem', color: 'var(--ink-teal)' }}>Get notified when we reach {state.loc.area}</strong>
                </div>
                {notifyStatus === 'done' ? (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--teal-deep)', fontWeight: 700 }}>
                    You&apos;re on the list — we&apos;ll message you when we launch in your area.
                  </p>
                ) : (
                  <form onSubmit={submitNotify} style={{ display: 'flex', gap: 8 }}>
                    <Input type="tel" placeholder="Your phone number" value={notifyPhone} required
                      onChange={(e) => setNotifyPhone(e.target.value)} style={{ flex: 1 }} />
                    <Button type="submit" variant="primary" size="sm" disabled={notifyStatus === 'sending'}>
                      {notifyStatus === 'sending' ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : 'Notify me'}
                    </Button>
                  </form>
                )}
                {notifyStatus === 'error' && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: 'var(--terracotta)', fontWeight: 600 }}>
                    Couldn&apos;t save that — please try again, or message us on WhatsApp.
                  </p>
                )}
              </div>
            )}

            {/* Quick picks */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {QUICK_PICKS.map((city) => (
                <button key={city} onClick={() => applyManual(city)} style={{
                  padding: '8px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)',
                  color: 'var(--ink-teal)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                }}>
                  {city}
                </button>
              ))}
            </div>

            {/* Manual entry */}
            <form onSubmit={(e) => { e.preventDefault(); applyManual(manualValue); }} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Input placeholder="Or type your city / area" value={manualValue}
                onChange={(e) => setManualValue(e.target.value)} style={{ flex: 1 }} />
              <Button type="submit" variant="secondary" size="sm" disabled={!manualValue.trim()}>Set</Button>
            </form>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" full onClick={() => { setSheetOpen(false); detect(); }}
                iconLeft={<MapPin style={{ width: 15, height: 15 }} />} disabled={detecting}>
                Use my current location
              </Button>
              <Button variant="ghost" onClick={clearLocation} style={{ color: 'var(--terracotta)' }}
                iconLeft={<Trash2 style={{ width: 15, height: 15 }} />}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
