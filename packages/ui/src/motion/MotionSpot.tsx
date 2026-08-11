'use client';

import React, { useEffect, useRef } from 'react';
import { animate } from 'motion';
import {
  HandWaving, CalendarBlank, ClipboardText, LockKey,
  HeartHalf, Question, CheckCircle,
  type Icon,
} from '@phosphor-icons/react';

/**
 * MotionSpot — the single illustrated slot across the product. Replaces the old
 * mascot: one Phosphor duotone icon on a soft tinted disc, animated with Motion
 * One (entrance on mount + a gentle idle loop). Screens request a `variant`
 * (never an icon), so the artwork can change in one place.
 *
 * Motion is transform/opacity only and is skipped under prefers-reduced-motion.
 */
export type SpotVariant =
  | 'welcome'    // sign-in / greeting slots
  | 'calendar'   // empty bookings
  | 'clipboard'  // empty records / generic empty
  | 'private'    // OTP step — code stays private
  | 'waiting'    // loading
  | 'oops'       // gentle error
  | 'success';   // confirmation

type Loop = 'wave' | 'float' | 'pulse' | 'pop' | 'none';

const SPOT: Record<SpotVariant, { Icon: Icon; label: string; loop: Loop }> = {
  welcome:   { Icon: HandWaving,    label: 'Welcome',                 loop: 'wave' },
  calendar:  { Icon: CalendarBlank, label: 'Nothing booked yet',      loop: 'float' },
  clipboard: { Icon: ClipboardText, label: 'Nothing here yet',        loop: 'float' },
  private:   { Icon: LockKey,       label: 'Your code stays private', loop: 'pulse' },
  waiting:   { Icon: HeartHalf,     label: 'Just a moment',           loop: 'pulse' },
  oops:      { Icon: Question,      label: 'Something went wrong',     loop: 'none' },
  success:   { Icon: CheckCircle,   label: 'Done',                    loop: 'pop' },
};

// Idle-loop keyframes per motion style. Entrance is shared (scale/opacity in).
const LOOPS: Record<Exclude<Loop, 'none'>, [Record<string, number[]>, object]> = {
  wave:  [{ rotate: [0, 14, -8, 12, 0] }, { duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }],
  float: [{ y: [0, -6, 0] },              { duration: 3.0, repeat: Infinity, ease: 'easeInOut' }],
  pulse: [{ scale: [1, 1.06, 1] },        { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }],
  pop:   [{ scale: [0.6, 1.12, 1] },      { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }],
};

export function MotionSpot({
  variant = 'welcome',
  size = 132,
}: {
  variant?: SpotVariant;
  size?: number;
}) {
  const discRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const { Icon, label, loop } = SPOT[variant];

  useEffect(() => {
    const disc = discRef.current;
    const icon = iconRef.current;
    if (!disc || !icon) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    animate(disc, { opacity: [0, 1], scale: [0.9, 1] }, { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] });
    if (reduce || loop === 'none') return;

    const [keyframes, options] = LOOPS[loop];
    const controls = animate(icon, keyframes, options);
    return () => controls.stop();
  }, [loop]);

  return (
    <span
      ref={discRef}
      role="img"
      aria-label={label}
      style={{
        display: 'inline-grid', placeItems: 'center', width: size, height: size,
        borderRadius: '50%', background: 'var(--m3-chip, #e6efe9)', opacity: 0,
      }}
    >
      <span ref={iconRef} style={{ display: 'inline-flex', transformOrigin: '70% 90%' }}>
        <Icon size={Math.round(size * 0.5)} weight="duotone" color="var(--m3-green-deep, #006971)" aria-hidden />
      </span>
    </span>
  );
}
