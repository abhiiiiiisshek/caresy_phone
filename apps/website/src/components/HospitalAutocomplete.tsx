'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { HOSPITALS, type Hospital } from '@/data/hospitals';

// Free-text hospital input with a filtered suggestion dropdown backed by the
// curated HOSPITALS list. Typing is never blocked — suggestions are a shortcut,
// so a hospital not on the list still submits fine.

export default function HospitalAutocomplete({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Search hospital or clinic...',
}: {
  value: string;
  // Second argument is present only when the value came from the list, so the
  // caller can use the matched entry (e.g. to fill in the pincode).
  onChange: (v: string, picked?: Hospital) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return HOSPITALS.slice(0, 8);
    return HOSPITALS.filter((h) => `${h.name} ${h.area}`.toLowerCase().includes(q)).slice(0, 8);
  }, [value]);

  const pick = (h: Hospital) => { onChange(h.name, h); setOpen(false); setActive(-1); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(matches[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  // Mirror the @caresy/ui Input field style so this sits cleanly beside sibling
  // Inputs (label above, rounded rectangle, teal focus ring) instead of a pill.
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 14px 13px 42px',
    fontFamily: 'var(--font-sans, inherit)',
    fontSize: '0.95rem',
    color: 'var(--text, var(--ink))',
    background: 'var(--surface)',
    border: `1px solid ${focused ? 'var(--teal)' : 'var(--line)'}`,
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    boxShadow: focused ? '0 0 0 3px rgba(13,122,102,0.15)' : 'none',
    transition: 'border-color var(--dur) ease, box-shadow var(--dur) ease',
    boxSizing: 'border-box',
  };

  return (
    <label style={{ display: 'block' }}>
      {label && (
        <span style={{ display: 'block', marginBottom: 6, fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-teal)' }}>
          {label}{required && <span style={{ color: 'var(--terracotta)' }}> *</span>}
        </span>
      )}
      <span style={{ position: 'relative', display: 'block' }}>
      <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--text-muted, var(--muted))', pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => { setOpen(true); setFocused(true); }}
        // Delay close so a suggestion click (which blurs the input first) still registers.
        onBlur={() => { setFocused(false); blurTimer.current = setTimeout(() => setOpen(false), 120); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        style={fieldStyle}
      />

      {open && matches.length > 0 && (
        <ul
          role="listbox"
          onMouseDown={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20, margin: 0, padding: 6, listStyle: 'none', background: '#fff', border: '1px solid var(--m3-line, #e1e3de)', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', maxHeight: 300, overflowY: 'auto' }}
        >
          {matches.map((h, i) => (
            <li
              key={`${h.name}-${h.area}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(h)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, cursor: 'pointer', background: i === active ? '#e7f0ea' : 'transparent' }}
            >
              <MapPin style={{ width: 16, height: 16, color: 'var(--m3-green, #08796f)', flexShrink: 0 }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--m3-ink, #16302b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--m3-muted, #5b6b64)' }}>{h.area}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      </span>
    </label>
  );
}
