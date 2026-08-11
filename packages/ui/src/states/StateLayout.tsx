'use client';

import React from 'react';
import { MotionSpot, type SpotVariant } from '../motion/MotionSpot';

export interface StateSlotProps {
  /** Override the default spot for this state. */
  variant?: SpotVariant;
  /** Escape hatch: render custom artwork instead of the spot. */
  art?: React.ReactNode;
  /** Spot width in px. */
  spotSize?: number;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Primary action(s) — e.g. a Button. Rendered under the copy. */
  action?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

interface StateLayoutProps extends StateSlotProps {
  defaultVariant: SpotVariant;
  defaultSize: number;
}

/**
 * StateLayout — the shared vertical layout behind every state slot: artwork,
 * title, description, action. States differ only in their default spot and
 * copy; the arrangement is one place so empty/loading/error/success stay
 * visually consistent. The `art` prop swaps the artwork without touching this.
 */
export function StateLayout({
  defaultVariant, defaultSize,
  variant, art, spotSize,
  title, description, action, children, style,
}: StateLayoutProps) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        gap: 14, padding: '28px 20px', width: '100%', maxWidth: 420, margin: '0 auto', ...style,
      }}
    >
      <div aria-hidden={art ? undefined : false} style={{ marginBottom: 2 }}>
        {art ?? <MotionSpot variant={variant ?? defaultVariant} size={spotSize ?? defaultSize} />}
      </div>
      {title != null && (
        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink-teal, var(--ink, #14201d))' }}>{title}</h3>
      )}
      {description != null && (
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.55, color: 'var(--text-muted, var(--muted, #5c6b64))' }}>{description}</p>
      )}
      {children}
      {action != null && <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>{action}</div>}
    </div>
  );
}
