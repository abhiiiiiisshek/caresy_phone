'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Check, X, Loader2, BellRing, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Input, Button } from '@caresy/ui';
import { checkPincodeServed, isValidPincode } from '@/utils/serviceArea';

/**
 * LocationBadge — service-area indicator for the app's greeting bar.
 *
 * Serviceability is decided by PINCODE against the DB-driven `service_areas`
 * allowlist (same list the booking guard enforces) — not by fuzzy city-name
 * matching. This is what fixes cases like "Gaur City" (Greater Noida West,
 * 201009), which a text match on "Noida" would wrongly reject.
 *
 * Detection: browser geolocation -> reverse-geocode to a postcode -> DB check.
 * Manual: the user enters their 6-digit pincode directly. Cached in
 * localStorage; only the area label + pincode + served flag are stored, never
 * raw GPS coordinates.
 */

const LS_KEY = 'caresy_location_v2';

// City quick-picks map to a representative pincode that gets validated against
// the DB — so "Noida"/"Greater Noida" resolve as served and others as not.
const QUICK_PICKS: { label: string; pincode: string }[] = [
  { label: 'Noida', pincode: '201301' },
  { label: 'Greater Noida', pincode: '201310' },
  { label: 'Greater Noida West', pincode: '201009' },
  { label: 'Ghaziabad', pincode: '201001' },
];

interface StoredLocation {
  area: string;
  pincode: string;
  served: boolean;
  manual: boolean;
  ts: number;
}

type BadgeState =
  | { kind: 'loading' }
  | { kind: 'unset' }
  | { kind: 'resolved'; loc: StoredLocation };

function readStored(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.pincode === 'string' && typeof parsed?.served === 'boolean') return parsed;
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

async function reverseGeocode(lat: number, lon: number): Promise<{ area: string; postcode: string }> {
  // BigDataCloud's client-side endpoint: no API key, CORS-enabled, returns a
  // postcode which is exactly what we validate against.
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
  );
  if (!res.ok) throw new Error(`reverse geocode failed: ${res.status}`);
  const data = await res.json();
  const area = data.locality || data.city || data.principalSubdivision || '';
  const postcode = (data.postcode || '').toString();
  return { area, postcode };
}

export default function LocationBadge() {
  const [state, setState] = useState<BadgeState>({ kind: 'loading' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [manualPincode, setManualPincode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [notifyPhone, setNotifyPhone] = useState('');
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [detecting, setDetecting] = useState(false);

  const resolveFromCoords = useCallback((lat: number, lon: number) => {
    reverseGeocode(lat, lon)
      .then(async ({ area, postcode }) => {
        if (!postcode) {
          // Coordinates resolved but no postcode — ask for the pincode instead
          // of guessing serviceability.
          setDetecting(false);
          setState({ kind: 'unset' });
          setSheetOpen(true);
          return;
        }
        const { served, area: match } = await checkPincodeServed(postcode);
        const label = match?.area_name || area || `Pincode ${postcode}`;
        const loc: StoredLocation = { area: label, pincode: postcode, served, manual: false, ts: Date.now() };
        writeStored(loc);
        setState({ kind: 'resolved', loc });
        setDetecting(false);
      })
      .catch(() => {
        setDetecting(false);
        setState({ kind: 'unset' });
        setSheetOpen(true);
      });
  }, []);

  const detect = useCallback(() => {
    setPermissionOpen(false);
    if (!('geolocation' in navigator)) {
      setState({ kind: 'unset' });
      setSheetOpen(true);
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolveFromCoords(pos.coords.latitude, pos.coords.longitude),
      () => {
        setDetecting(false);
        setState({ kind: 'unset' });
        setSheetOpen(true);
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }, [resolveFromCoords]);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setState({ kind: 'resolved', loc: stored });
    } else {
      setState({ kind: 'unset' });
      setPermissionOpen(true);
    }
  }, []);

  const applyPincode = async (pincode: string) => {
    const pin = pincode.trim();
    setManualError(null);
    if (!isValidPincode(pin)) {
      setManualError('Enter a valid 6-digit pincode.');
      return;
    }
    const { served, area } = await checkPincodeServed(pin);
    const loc: StoredLocation = {
      area: area?.area_name || `Pincode ${pin}`,
      pincode: pin,
      served,
      manual: true,
      ts: Date.now(),
    };
    writeStored(loc);
    setState({ kind: 'resolved', loc });
    setSheetOpen(false);
    setManualPincode('');
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
        message: `Notify me when Caresy launches in: ${state.loc.area} (pincode ${state.loc.pincode})`,
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
          <button onClick={() => setPermissionOpen(true)} style={linkStyle}>Share your location</button>
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

      {/* First-visit permission popup */}
      {permissionOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(22,48,43,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 380, background: 'var(--paper)', borderRadius: 26, padding: '28px 22px 22px', textAlign: 'center', animation: 'caresy-sheet-up 0.28s var(--ease-out)', boxShadow: 'var(--shadow-pop, 0 24px 60px rgba(22,48,43,0.28))' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-soft)', color: 'var(--teal)', margin: '0 auto 16px' }}>
              <MapPin style={{ width: 30, height: 30 }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink-teal)' }}>
              Share your location
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Let us detect your area so we can confirm whether Caresy companions are available near you. We currently serve <strong style={{ color: 'var(--ink-teal)' }}>Noida &amp; Greater Noida</strong>.
            </p>
            <Button variant="primary" full onClick={detect} disabled={detecting}
              iconLeft={detecting ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <MapPin style={{ width: 16, height: 16 }} />}>
              {detecting ? 'Detecting…' : 'Allow location access'}
            </Button>
            <button
              onClick={() => { setPermissionOpen(false); setSheetOpen(true); }}
              style={{ ...linkStyle, color: 'var(--muted)', display: 'block', margin: '14px auto 0' }}>
              Enter my pincode instead
            </button>
            <p style={{ margin: '14px 0 0', fontSize: '0.72rem', color: 'var(--muted)' }}>
              Your location stays on this device. We never store your exact coordinates.
            </p>
          </div>
        </div>
      )}

      {sheetOpen && (
        <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(22,48,43,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', background: 'var(--paper)', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '10px 20px 28px', animation: 'caresy-sheet-up 0.28s var(--ease-out)' }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line-strong)', margin: '8px auto 14px' }} />
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink-teal)' }}>Your location</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--muted)' }}>
              We currently operate in Noida &amp; Greater Noida. Enter your pincode to check availability — it&apos;s stored only on this device.
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
              {QUICK_PICKS.map((c) => (
                <button key={c.label} onClick={() => applyPincode(c.pincode)} style={{
                  padding: '8px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)',
                  color: 'var(--ink-teal)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                }}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Manual pincode entry */}
            <form onSubmit={(e) => { e.preventDefault(); applyPincode(manualPincode); }} style={{ display: 'flex', gap: 8, marginBottom: manualError ? 6 : 14 }}>
              <Input inputMode="numeric" maxLength={6} placeholder="Enter 6-digit pincode" value={manualPincode}
                onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, ''))} style={{ flex: 1 }} />
              <Button type="submit" variant="secondary" size="sm" disabled={!manualPincode.trim()}>Check</Button>
            </form>
            {manualError && <p style={{ margin: '0 0 14px', fontSize: '0.76rem', color: 'var(--terracotta)', fontWeight: 600 }}>{manualError}</p>}

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
