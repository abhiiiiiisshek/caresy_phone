'use client';

import React from 'react';
import { Badge } from './Badge';

export interface CompanionCardProps {
  name: string;
  photo?: string;
  initials?: string;
  rating?: number;
  visits?: number;
  verification?: string;
  languages?: string;
  specialty?: string;
  quote?: string;
  live?: boolean;
  layout?: 'vertical' | 'horizontal';
  style?: React.CSSProperties;
}

/**
 * CompanionCard — the signature trust component. Shows who will accompany the
 * patient: photo, name, rating, verification, specialty and languages.
 * Anxious families need to see a real, verified person.
 */
export function CompanionCard({
  name,
  photo,
  initials = '',
  rating,
  visits,
  verification = 'Police Verified',
  languages,
  specialty,
  quote = '',
  live = false,
  layout = 'vertical',
  style = {},
}: CompanionCardProps) {
  const horizontal = layout === 'horizontal';
  return (
    <div style={{
      display: 'flex',
      flexDirection: horizontal ? 'row' : 'column',
      gap: 16,
      padding: 20,
      width: horizontal ? 'auto' : 260,
      borderRadius: 'var(--radius-xl)',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      boxShadow: 'var(--shadow-1)',
      ...style,
    }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={`Photo of companion ${name}`}
            style={{ width: horizontal ? 64 : 56, height: horizontal ? 64 : 56, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{initials}</div>
        )}
        {live && <span style={{ position: 'absolute', right: 0, bottom: 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--success)', border: '2px solid #fff' }} />}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{name}</strong>
          {typeof rating === 'number' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-teal)' }}>
              <span style={{ color: '#E7A33E' }}>★</span>{rating.toFixed(1)}
              {visits != null && <span style={{ color: 'var(--text-muted, var(--muted))', fontWeight: 500 }}>({visits})</span>}
            </span>
          )}
        </div>

        {specialty && <div style={{ marginTop: 4, fontSize: '0.86rem', color: 'var(--text-muted, var(--muted))' }}>{specialty}</div>}
        {languages && <div style={{ marginTop: 2, fontSize: '0.8rem', color: 'var(--text-muted, var(--muted))' }}>{languages}</div>}

        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge tone="success" size="sm" dot>{verification}</Badge>
          {live && <Badge tone="teal" size="sm" live>Active now</Badge>}
        </div>

        {quote && <p style={{ margin: '12px 0 0', fontSize: '0.86rem', lineHeight: 1.5, fontStyle: 'italic', color: 'var(--charcoal)' }}>{quote}</p>}
      </div>
    </div>
  );
}
