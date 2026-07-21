import React from 'react';

// Bespoke SVG artwork for the install modal, matched to the design mockup.
// Pure presentational vectors — no props beyond an optional className. Palette
// tracks the M3 theme tokens with hard fallbacks so the art survives outside a
// themed tree (e.g. Storybook / tests).
const G = 'var(--m3-green, #08796f)';
const GD = '#0b5f57';        // deeper green for outlines
const MARIGOLD = 'var(--m3-marigold, #e6a417)';
const INK = 'var(--m3-ink, #16302b)';
const MUT = '#8a978f';
const LINE = '#e4e8e2';
const SOFTG = '#d9ecdf';
const PEACH = '#f7e4cf';

/** Hero: phone with a home-plus glyph, orbited by sparkles, a paper plane,
 *  a heart and a dotted flight path over soft colour blobs. */
export function PhoneHero() {
  return (
    <svg viewBox="0 0 150 150" width="118" height="118" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* colour blobs */}
      <ellipse cx="60" cy="98" rx="46" ry="30" fill={SOFTG} opacity="0.7" />
      <ellipse cx="96" cy="70" rx="30" ry="22" fill={PEACH} opacity="0.6" />
      {/* phone body */}
      <rect x="40" y="26" width="60" height="100" rx="14" fill="#ffffff" stroke={GD} strokeWidth="3" />
      <rect x="40" y="26" width="60" height="100" rx="14" fill="url(#screen)" opacity="0.35" />
      <rect x="61" y="32" width="18" height="4" rx="2" fill={LINE} />
      {/* home-plus badge */}
      <circle cx="70" cy="78" r="24" fill="#ffffff" stroke={SOFTG} strokeWidth="2" />
      <path d="M60 80.5 70 71l10 9.5V92a2 2 0 0 1-2 2h-4v-8h-8v8h-4a2 2 0 0 1-2-2z" fill="none" stroke={G} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="83" cy="90" r="8.5" fill={G} />
      <path d="M83 86.5v7M79.5 90h7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      {/* sparkles */}
      <g stroke={MARIGOLD} strokeWidth="2.4" strokeLinecap="round">
        <path d="M104 30v7M100.5 33.5h7" />
        <path d="M112 46l3 3M115 46l-3 3" />
      </g>
      {/* dotted flight path */}
      <path d="M108 62c14-6 20 4 30-2" stroke={MUT} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 5" opacity="0.7" />
      {/* paper plane */}
      <path d="M120 96l18-7-9 17-3-7z" fill="none" stroke={G} strokeWidth="2" strokeLinejoin="round" />
      <path d="M129 99l9-10" stroke={G} strokeWidth="2" strokeLinecap="round" />
      {/* heart */}
      <path d="M96 118c-3-2.6-5-4.3-5-6.8a2.7 2.7 0 0 1 5-1.4 2.7 2.7 0 0 1 5 1.4c0 2.5-2 4.2-5 6.8z" fill="none" stroke={G} strokeWidth="1.8" opacity="0.8" />
      <defs>
        <linearGradient id="screen" x1="40" y1="26" x2="100" y2="126" gradientUnits="userSpaceOnUse">
          <stop stopColor={SOFTG} /><stop offset="1" stopColor={PEACH} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Shared frame for the little step "screenshots".
function Frame({ children, viewBox = '0 0 120 84' }: { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {children}
    </svg>
  );
}

/** Android step 1 — browser chrome with a star and the kebab menu. */
export function BrowserBarArt() {
  return (
    <Frame>
      <rect x="6" y="6" width="108" height="72" rx="8" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <rect x="6" y="6" width="108" height="20" rx="8" fill="#f5f7f4" />
      <rect x="14" y="13" width="58" height="6" rx="3" fill={LINE} />
      <path d="M88 12.5l1.4 3 3.3.4-2.4 2.2.6 3.2-2.9-1.6-2.9 1.6.6-3.2-2.4-2.2 3.3-.4z" fill="none" stroke={MUT} strokeWidth="1.2" />
      <circle cx="103" cy="16" r="1.4" fill={INK} /><circle cx="103" cy="12" r="1.4" fill={INK} /><circle cx="103" cy="20" r="1.4" fill={INK} />
      <rect x="14" y="34" width="70" height="5" rx="2.5" fill={LINE} />
      <rect x="14" y="45" width="90" height="5" rx="2.5" fill="#eef1ee" />
      <rect x="14" y="56" width="52" height="5" rx="2.5" fill="#eef1ee" />
    </Frame>
  );
}

type Item = { label: string; icon: 'plus' | 'star' | 'clock' | 'home' | 'book' | 'heart' | 'ring' };

function RowIcon({ kind, x, y, color }: { kind: Item['icon']; x: number; y: number; color: string }) {
  const s = { stroke: color, strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'plus': return <g {...s}><rect x={x - 4} y={y - 4} width="8" height="8" rx="2" /><path d={`M${x} ${y - 2}v4M${x - 2} ${y}h4`} /></g>;
    case 'star': return <path d={`M${x} ${y - 4.5}l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z`} {...s} />;
    case 'clock': return <g {...s}><circle cx={x} cy={y} r="4.2" /><path d={`M${x} ${y - 2.2}V${y}l1.8 1.2`} /></g>;
    case 'home': return <path d={`M${x - 4.5} ${y + 1} ${x} ${y - 4} ${x + 4.5} ${y + 1}V${y + 4.5}h-9z`} {...s} />;
    case 'book': return <g {...s}><path d={`M${x - 4} ${y - 4}h6a2 2 0 0 1 2 2v6h-6a2 2 0 0 1-2-2z`} /></g>;
    case 'heart': return <path d={`M${x} ${y + 3.5}c-2.4-1.8-4-3-4-5a2 2 0 0 1 4-1 2 2 0 0 1 4 1c0 2-1.6 3.2-4 5z`} {...s} />;
    case 'ring': return <g {...s}><circle cx={x - 2} cy={y} r="3" /><circle cx={x + 2} cy={y} r="3" /></g>;
  }
}

/** Dropdown / share-sheet list with one highlighted row. Reused by both step 2s. */
export function MenuListArt({ items, highlight }: { items: Item[]; highlight: number }) {
  const rowH = 15;
  const top = 8;
  return (
    <Frame viewBox={`0 0 120 ${top * 2 + items.length * rowH}`}>
      <rect x="6" y="4" width="108" height={top + items.length * rowH} rx="8" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      {items.map((it, i) => {
        const y = top + 4 + i * rowH + rowH / 2;
        const on = i === highlight;
        const c = on ? G : MUT;
        return (
          <g key={it.label}>
            {on && <rect x="9" y={y - rowH / 2 + 1} width="102" height={rowH - 2} rx="5" fill="#e7f0ea" />}
            <RowIcon kind={it.icon} x={20} y={y} color={c} />
            <text x="32" y={y + 3} fontFamily="inherit" fontSize="8" fontWeight={on ? 700 : 400} fill={on ? G : INK}>{it.label}</text>
          </g>
        );
      })}
    </Frame>
  );
}

/** Step 3 — the OS "Add to Home screen" confirmation card with the Caresy mark. */
export function ConfirmCardArt({ title = 'Add to Home screen' }: { title?: string }) {
  return (
    <Frame>
      <rect x="10" y="8" width="100" height="68" rx="9" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <text x="20" y="24" fontFamily="inherit" fontSize="7.5" fontWeight="600" fill={INK}>{title}</text>
      <rect x="20" y="32" width="18" height="18" rx="5" fill="#fff" stroke={SOFTG} strokeWidth="1.5" />
      <text x="29" y="45" textAnchor="middle" fontFamily="inherit" fontSize="12" fontWeight="800" fill={G}>C</text>
      <text x="44" y="44" fontFamily="inherit" fontSize="8" fontWeight="600" fill={INK}>Caresy</text>
      <text x="62" y="68" textAnchor="middle" fontFamily="inherit" fontSize="7.5" fill={MUT}>Cancel</text>
      <rect x="80" y="60" width="24" height="12" rx="6" fill={G} />
      <text x="92" y="68.5" textAnchor="middle" fontFamily="inherit" fontSize="7.5" fontWeight="700" fill="#fff">Add</text>
    </Frame>
  );
}

/** iOS step 1 — Safari bottom toolbar with the Share button emphasised. */
export function SafariBarArt() {
  return (
    <Frame>
      <rect x="6" y="8" width="108" height="68" rx="8" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <rect x="6" y="58" width="108" height="18" rx="8" fill="#f5f7f4" />
      <g stroke={MUT} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 71l-4-4M24 71l4-4M24 71V63" opacity="0.6" transform="translate(-2,0)" />
        <path d="M92 71h6M104 71h4" opacity="0.5" />
      </g>
      {/* highlighted share control */}
      <rect x="48" y="59" width="24" height="16" rx="8" fill="#e7f0ea" />
      <g stroke={G} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 71V62M56.5 65.5 60 62l3.5 3.5" />
        <path d="M54 68v4a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 66 72v-4" />
      </g>
      <rect x="18" y="20" width="80" height="5" rx="2.5" fill={LINE} />
      <rect x="18" y="32" width="64" height="5" rx="2.5" fill="#eef1ee" />
    </Frame>
  );
}

/** Small decorative leaf sprig for the sheet's lower corner. */
export function LeafSprig({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 70" width="52" height="60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={style}>
      <path d="M30 68C30 46 34 26 50 10" stroke={G} strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <g fill={SOFTG} stroke={G} strokeWidth="1.2" opacity="0.7">
        <path d="M34 52c-8-2-12-8-12-8s6-2 12 0 8 8 8 8-4 1-8 0z" />
        <path d="M40 38c-8-2-10-9-10-9s7-1 12 2 6 9 6 9-4 0-8-2z" />
        <path d="M46 24c-7-3-8-10-8-10s7 0 11 4 5 9 5 9-4-1-8-3z" />
      </g>
    </svg>
  );
}
