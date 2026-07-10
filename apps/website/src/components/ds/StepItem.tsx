'use client';

import React from 'react';

export interface StepItemProps {
  number: React.ReactNode;
  title: string;
  description: string;
  style?: React.CSSProperties;
}

/**
 * StepItem — a numbered "how it works" step: a rounded chip with the step
 * number over a sage→cream gradient, then a title and description.
 */
export function StepItem({ number, title, description, style = {} }: StepItemProps) {
  return (
    <article style={{
      padding: 24,
      borderRadius: 'var(--radius)',
      background: 'rgba(255,253,248,0.94)',
      border: '1px solid var(--line)',
      boxShadow: 'var(--shadow-1)',
      ...style,
    }}>
      <div style={{
        display: 'grid', placeItems: 'center', width: 42, height: 42, marginBottom: 16,
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(191,231,210,0.92), rgba(220,230,217,0.96))',
        color: '#114d45', fontWeight: 800, fontSize: '1.05rem',
      }}>{number}</div>
      <h3 style={{ margin: '0 0 6px', fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5, color: 'var(--text-muted, var(--muted))' }}>{description}</p>
    </article>
  );
}
