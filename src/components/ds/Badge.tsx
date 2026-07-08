'use client';

import React from 'react';

export type BadgeTone = 'neutral' | 'teal' | 'urgent' | 'success' | 'solid' | 'onDark';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  children?: React.ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  dot?: boolean;
  live?: boolean;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

const TONES: Record<BadgeTone, React.CSSProperties> = {
  neutral: { background: 'var(--sage)', color: 'var(--ink-teal)' },
  teal: { background: 'var(--teal-soft)', color: 'var(--teal-deep)' },
  urgent: { background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)' },
  success: { background: 'var(--success-soft)', color: '#1B7A54' },
  solid: { background: 'var(--teal)', color: '#fff' },
  onDark: { background: 'rgba(255,255,255,0.16)', color: '#fff' },
};

const SIZES: Record<BadgeSize, React.CSSProperties> = {
  sm: { padding: '4px 9px', fontSize: '0.66rem' },
  md: { padding: '6px 11px', fontSize: '0.72rem' },
};

/**
 * Badge / Chip — pill label for trust markers, statuses, and intent tags
 * ("Today" / "Later"). `dot` adds a leading indicator; use `live` for the
 * pulsing green "active now" state.
 */
export function Badge({ children, tone = 'neutral', size = 'md', dot = false, live = false, icon = null, style = {} }: BadgeProps) {
  const t = TONES[tone] || TONES.neutral;
  const s = SIZES[size] || SIZES.md;
  const dotColor = live ? 'var(--success)' : 'currentColor';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-sans, inherit)',
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
        ...t,
        ...s,
        ...style,
      }}
    >
      {(dot || live) && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dotColor,
            animation: live ? 'caresy-pulse 1.8s infinite' : 'none',
            flexShrink: 0,
          }}
        />
      )}
      {icon}
      {children}
    </span>
  );
}
