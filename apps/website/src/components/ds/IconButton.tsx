'use client';

import React from 'react';

export type IconButtonVariant = 'soft' | 'urgent' | 'solid' | 'ghost' | 'glass';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  icon: React.ReactNode;
  ariaLabel: string;
  variant?: IconButtonVariant;
  size?: number;
  style?: React.CSSProperties;
}

const VARIANTS: Record<IconButtonVariant, React.CSSProperties> = {
  soft: { background: 'var(--teal-soft)', color: 'var(--teal)', border: '1px solid transparent' },
  urgent: { background: 'var(--terracotta)', color: '#fff', border: '1px solid transparent' },
  solid: { background: 'var(--teal)', color: '#fff', border: '1px solid transparent' },
  ghost: { background: 'transparent', color: 'var(--ink-teal)', border: '1px solid var(--line)' },
  glass: { background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' },
};

/**
 * IconButton — square, accessible icon-only button. Used for the header call
 * button, SOS, and toolbar affordances. Always pass `ariaLabel`.
 */
export function IconButton({
  icon,
  ariaLabel,
  variant = 'soft',
  size = 44,
  onClick,
  style = {},
  ...rest
}: IconButtonProps) {
  const v = VARIANTS[variant] || VARIANTS.soft;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'transform var(--dur) var(--ease-out), background var(--dur) ease',
        ...v,
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      {...rest}
    >
      {icon}
    </button>
  );
}
