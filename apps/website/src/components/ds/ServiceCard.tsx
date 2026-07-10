'use client';

import React from 'react';

export interface ServiceCardProps {
  icon?: React.ReactNode;
  title: string;
  price: string;
  priceNote?: string;
  description: string;
  tone?: 'light' | 'dark';
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * ServiceCard — a bookable service with upfront price. `tone="dark"` for the
 * ink-teal service band, `light` for the paper surface.
 */
export function ServiceCard({
  icon = null,
  title,
  price,
  priceNote = '',
  description,
  tone = 'light',
  onClick,
  style = {},
}: ServiceCardProps) {
  const dark = tone === 'dark';
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        alignContent: 'start',
        gap: 10,
        padding: 24,
        minHeight: 200,
        borderRadius: 'var(--radius-xl)',
        cursor: onClick ? 'pointer' : 'default',
        background: dark
          ? 'linear-gradient(180deg, rgba(255,253,248,0.10), rgba(255,253,248,0.03)), #1d4741'
          : 'var(--surface)',
        color: dark ? 'var(--paper)' : 'var(--text, var(--ink))',
        border: dark ? '1px solid rgba(255,253,248,0.14)' : '1px solid var(--line)',
        boxShadow: dark ? '0 20px 50px rgba(0,0,0,0.18)' : 'var(--shadow-1)',
        transition: 'transform var(--dur) var(--ease-out), box-shadow var(--dur) ease, border-color var(--dur) ease',
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = dark ? '0 20px 50px rgba(0,0,0,0.18)' : 'var(--shadow-1)'; }}
    >
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'start',
        padding: '8px 12px', marginBottom: 'auto', borderRadius: 'var(--radius-pill)',
        background: dark ? 'rgba(228,240,236,0.14)' : 'var(--teal-soft)',
        color: dark ? '#CFE7DF' : 'var(--teal-deep)',
        fontWeight: 800, fontSize: '0.9rem',
      }}>
        {icon}
        <span>{price}{priceNote && <span style={{ opacity: 0.7, fontWeight: 600, fontSize: '0.78rem' }}> {priceNote}</span>}</span>
      </div>
      <strong style={{ fontSize: '1.22rem', fontWeight: 700, marginTop: 8 }}>{title}</strong>
      <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5, color: dark ? 'rgba(255,253,248,0.78)' : 'var(--text-muted, var(--muted))' }}>{description}</p>
    </div>
  );
}
