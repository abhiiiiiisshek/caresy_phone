'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Scroll-reveal primitives — the site's one entrance vocabulary. A section
 * fades and rises the first time it scrolls into view; a grid staggers its
 * children. Transform/opacity only, fires once, and collapses to a plain,
 * static `<div>` under prefers-reduced-motion (no layout or logic change).
 *
 * These wrap existing markup — they never replace it — so adding motion to a
 * page is purely additive and changes no behaviour.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

interface BaseProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  /** Rise distance in px before settling. */
  y?: number;
  /** Element to render (default 'div'). Use 'section' to keep semantics. */
  as?: 'div' | 'section' | 'ul' | 'li' | 'article';
}

export interface RevealProps extends BaseProps {
  /** Seconds to wait before animating in. */
  delay?: number;
  /** Keep revealed after leaving the viewport (default true). */
  once?: boolean;
  /** Fraction visible before it triggers (0–1). */
  amount?: number;
  duration?: number;
}

export function Reveal({
  children,
  style,
  className,
  as = 'div',
  y = 16,
  delay = 0,
  once = true,
  amount = 0.2,
  duration = 0.5,
}: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return React.createElement(as, { style, className }, children);
  const M = motion[as];
  return (
    <M
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </M>
  );
}

export interface StaggerProps extends BaseProps {
  /** Seconds between each child's entrance. */
  gap?: number;
  once?: boolean;
  amount?: number;
}

/**
 * Stagger — wrap a grid/row so its direct `StaggerItem` children animate in one
 * after another. The wrapper is a neutral block; give it the same layout style
 * (display:grid/flex, gap) the original container had.
 */
export function Stagger({
  children,
  style,
  className,
  as = 'div',
  gap = 0.08,
  once = true,
  amount = 0.2,
}: StaggerProps) {
  const reduce = useReducedMotion();
  if (reduce) return React.createElement(as, { style, className }, children);
  const M = motion[as];
  return (
    <M
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </M>
  );
}

export function StaggerItem({ children, style, className, as = 'div', y = 16 }: BaseProps) {
  const reduce = useReducedMotion();
  if (reduce) return React.createElement(as, { style, className }, children);
  const M = motion[as];
  return (
    <M
      className={className}
      style={style}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
    >
      {children}
    </M>
  );
}
