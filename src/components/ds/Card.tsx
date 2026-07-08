'use client';

import React from 'react';

export type CardVariant = 'surface' | 'sunken' | 'dark' | 'elevated';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  variant?: CardVariant;
  radius?: string;
  padding?: number | string;
  interactive?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const VARIANTS: Record<CardVariant, React.CSSProperties> = {
  surface: { background: 'var(--surface)', color: 'var(--text, var(--ink))', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' },
  sunken: { background: 'var(--paper)', color: 'var(--text, var(--ink))', border: '1px solid var(--line)', boxShadow: 'none' },
  dark: { background: 'var(--ink-teal)', color: 'var(--paper)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'var(--shadow-2)' },
  elevated: { background: 'var(--surface)', color: 'var(--text, var(--ink))', border: '1px solid var(--line)', boxShadow: 'var(--shadow-2)' },
};

/**
 * Card — the base surface. `variant` sets the tone: `surface` (white on
 * paper, hairline border), `dark` (ink-teal panel), `sunken` (paper),
 * `elevated` (stronger shadow). Hover lift is opt-in via `interactive`.
 */
export function Card({
  children,
  variant = 'surface',
  radius = 'var(--radius-xl)',
  padding = 24,
  interactive = false,
  style = {},
  ...rest
}: CardProps) {
  const v = VARIANTS[variant] || VARIANTS.surface;
  const borderIsRgba = typeof v.border === 'string' && v.border.includes('rgba');
  return (
    <div
      style={{
        borderRadius: radius,
        padding,
        transition: 'transform var(--dur) var(--ease-out), box-shadow var(--dur) ease, border-color var(--dur) ease',
        ...v,
        ...style,
      }}
      onMouseEnter={interactive ? (e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-2)';
        e.currentTarget.style.borderColor = 'var(--border-hover, rgba(13,122,102,0.32))';
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = (v.boxShadow as string) || 'none';
        e.currentTarget.style.borderColor = borderIsRgba ? 'rgba(255,255,255,0.08)' : 'var(--line)';
      } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
