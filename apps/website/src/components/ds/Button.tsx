'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'urgent' | 'secondary' | 'outline' | 'ghost' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonShape = 'rounded' | 'pill';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  full?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: React.CSSProperties;
}

const SIZES: Record<ButtonSize, React.CSSProperties & { gap: number }> = {
  sm: { padding: '8px 16px', fontSize: '0.84rem', minHeight: 38, gap: 6 },
  md: { padding: '12px 22px', fontSize: '0.95rem', minHeight: 48, gap: 8 },
  lg: { padding: '16px 28px', fontSize: '1.05rem', minHeight: 56, gap: 10 },
};

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: 'var(--teal)', color: '#fff', border: '1px solid transparent', boxShadow: 'var(--shadow-pop)' },
  urgent: { background: 'var(--terracotta)', color: '#fff', border: '1px solid transparent', boxShadow: 'var(--shadow-pop-urgent)' },
  secondary: { background: 'var(--sage)', color: 'var(--ink-teal)', border: '1px solid var(--line)', boxShadow: 'none' },
  outline: { background: 'transparent', color: 'var(--teal)', border: '2px solid var(--teal)', boxShadow: 'none' },
  ghost: { background: 'transparent', color: 'var(--teal)', border: '1px solid transparent', boxShadow: 'none' },
  glass: { background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.42)', backdropFilter: 'blur(12px)', boxShadow: 'none' },
};

/**
 * Caresy Button — the core call-to-action.
 * Variant carries meaning: `primary` (teal) for the main path, `urgent`
 * (terracotta) reserved for same-day/emergency, `secondary` (sage) and
 * `outline`/`glass` for lower-emphasis or dark-background contexts.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  full = false,
  iconLeft = null,
  iconRight = null,
  disabled = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}: ButtonProps) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        padding: s.padding,
        minHeight: s.minHeight,
        width: full ? '100%' : 'auto',
        fontFamily: 'var(--font-sans, inherit)',
        fontSize: s.fontSize,
        fontWeight: 700,
        lineHeight: 1,
        borderRadius: shape === 'pill' ? 'var(--radius-pill)' : 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform var(--dur) var(--ease-out), box-shadow var(--dur) ease, background var(--dur) ease',
        ...v,
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
