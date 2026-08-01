'use client';

import React, { useState } from 'react';
import { Input } from '@caresy/ui';
import { Crosshair, Check, Loader2, MapPin } from 'lucide-react';

// Where the companion should actually meet the family, and optionally the exact
// point on a map.
//
// Both booking flows previously stored `title` and `address_line_1` as the same
// hospital name, so a companion arrived knowing only "Max Hospital" — no gate,
// no ward, no floor. locations.latitude/longitude have existed since
// SUPABASE_SCHEMA.sql and were never written by either form, which also left the
// ETA lookups in migrations 16-18 with no destination to read.
//
// Typed address and shared coordinates are independent on purpose. Typing costs
// nothing and works on any device; the GPS tap is one button and needs a
// permission prompt. Either alone is useful, so neither is required.
//
// ponytail: no map picker and no autocomplete. A textarea plus "use my current
// location" answers "where do I meet you" for a hospital visit. Add a draggable
// pin only if families actually report being met in the wrong place.

export interface Coords { lat: number; lng: number; accuracy: number | null }

/** Rounded to ~11 m. Precision beyond that is false confidence from a phone GPS. */
function round(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

export default function MeetingPoint({
  address, coords, onAddressChange, onCoordsChange,
}: {
  address: string;
  coords: Coords | null;
  onAddressChange: (v: string) => void;
  onCoordsChange: (c: Coords | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = () => {
    setError(null);
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('This device can’t share a location. Typing the address works just as well.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        onCoordsChange({
          lat: round(pos.coords.latitude),
          lng: round(pos.coords.longitude),
          accuracy: pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null,
        });
      },
      (err) => {
        setBusy(false);
        // A denied prompt is a choice, not a failure — say so without alarm.
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was declined. Type the address instead and we’ll manage.'
            : 'Couldn’t get a location just now. Type the address instead.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Input
        label="Where should the companion meet you?"
        name="meeting_point"
        placeholder="Gate 2 reception, OPD block, 3rd floor"
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        hint="Optional, and worth ten minutes on the day — a gate number or ward beats a hospital name."
      />

      {coords ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--success-soft, #e7f0ea)', border: '1px solid var(--m3-line)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Check style={{ width: 16, height: 16, color: 'var(--m3-green)', flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, color: 'var(--m3-ink)' }}>
              Exact location shared
              {coords.accuracy != null && <span style={{ color: 'var(--m3-muted)' }}> · accurate to about {coords.accuracy} m</span>}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onCoordsChange(null)}
            style={{ flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--m3-green-deep)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={share}
          disabled={busy}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--m3-line)', background: 'var(--m3-chip)', color: 'var(--m3-green-deep)', fontSize: 13.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}
        >
          {busy
            ? <><Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Getting your location…</>
            : <><Crosshair style={{ width: 15, height: 15 }} /> Share my exact location</>}
        </button>
      )}

      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11.5, lineHeight: '16px', color: 'var(--m3-muted)' }}>
        <MapPin style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }} />
        {error
          ? <span style={{ color: 'var(--m3-urgent, #b3261e)' }}>{error}</span>
          : <span>Shared only with the companion assigned to this visit, so they can open it in their maps app. Never shown to anyone else.</span>}
      </span>
    </div>
  );
}
