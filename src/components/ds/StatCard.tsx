'use client';

import React from 'react';

export interface StatCardProps {
  icon?: React.ReactNode;
  headline: React.ReactNode;
  detail?: React.ReactNode;
  tone?: 'light' | 'dark';
  style?: React.CSSProperties;
}

/**
 * StatCard — a trust / proof point: an icon tile, a bold headline stat, and a
 * supporting line. Used in the homepage proof bar and hero metrics.
 */
export function StatCard({ icon = null, headline, detail, tone = 'light', style = {} }: StatCardProps) {
  const dark = tone === 'dark';
  return (
    <div style={{
      minHeight: 150,
      padding: 24,
      borderRadius: 'var(--radius-xl)',
      background: dark ? 'rgba(255,253,248,0.11)' : 'linear-gradient(135deg, rgba(255,253,248,0.98), rgba(239,249,244,0.94))',
      border: dark ? '1px solid rgba(255,253,248,0.2)' : '1px solid rgba(255,255,255,0.82)',
      boxShadow: dark ? 'none' : 'var(--shadow-2)',
      backdropFilter: dark ? 'blur(10px)' : 'none',
      color: dark ? 'var(--paper)' : 'var(--text, var(--ink))',
      ...style,
    }}>
      {icon && (
        <div style={{
          display: 'grid', placeItems: 'center', width: 42, height: 42, marginBottom: 16,
          borderRadius: 'var(--radius-lg)', background: '#153f39', color: '#fff7e9',
        }}>{icon}</div>
      )}
      <strong style={{ display: 'block', fontSize: '1.05rem', fontWeight: 700, color: dark ? '#fff7e9' : 'var(--ink-teal)' }}>{headline}</strong>
      {detail && <span style={{ display: 'block', marginTop: 8, fontSize: '0.92rem', lineHeight: 1.5, color: dark ? 'rgba(255,253,248,0.74)' : 'var(--text-muted, var(--muted))' }}>{detail}</span>}
    </div>
  );
}
