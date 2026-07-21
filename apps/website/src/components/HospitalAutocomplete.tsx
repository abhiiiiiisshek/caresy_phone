'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { HOSPITALS } from '@/data/hospitals';

// Free-text hospital input with a filtered suggestion dropdown backed by the
// curated HOSPITALS list. Typing is never blocked — suggestions are a shortcut,
// so a hospital not on the list still submits fine.

export default function HospitalAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return HOSPITALS.slice(0, 8);
    return HOSPITALS.filter((h) => `${h.name} ${h.area}`.toLowerCase().includes(q)).slice(0, 8);
  }, [value]);

  const pick = (name: string) => { onChange(name); setOpen(false); setActive(-1); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(matches[active].name); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div style={{ position: 'relative' }}>
      <Search style={{ position: 'absolute', left: 16, top: 27, transform: 'translateY(-50%)', width: 18, height: 18, color: '#707974', pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        // Delay close so a suggestion click (which blurs the input first) still registers.
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
        onKeyDown={onKeyDown}
        placeholder="Search hospital or clinic..."
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        style={{ width: '100%', padding: '15px 16px 15px 46px', borderRadius: 999, border: 'none', background: '#e1e3de', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: 16, color: 'var(--m3-ink)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
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
              onClick={() => pick(h.name)}
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
    </div>
  );
}
