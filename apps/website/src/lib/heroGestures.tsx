'use client';

import React, { useEffect, useRef } from 'react';
import { animate } from 'motion';
import {
  HandWaving, Smiley, Heart, Barbell, HandHeart, HandsClapping, HandsPraying,
  type Icon,
} from '@phosphor-icons/react';

// The rotating home-greeting gesture, as a Phosphor duotone icon animated with
// Motion One (idle loop, transform-only, skipped under prefers-reduced-motion).
// Replaces the self-hosted 3D emoji so the hero shares one icon system with the
// rest of the product. Keys match the greeting pools in page.tsx.
export type GestureKey = 'wave' | 'smile' | 'heart' | 'flex' | 'hug' | 'clap' | 'namaste';

type Loop = 'wave' | 'pulse' | 'float' | 'clap';

const GESTURE: Record<GestureKey, { Icon: Icon; label: string; loop: Loop }> = {
  wave:    { Icon: HandWaving,    label: 'Waving hello', loop: 'wave' },
  smile:   { Icon: Smiley,        label: 'Warm smile',   loop: 'pulse' },
  heart:   { Icon: Heart,         label: 'Take care',    loop: 'pulse' },
  flex:    { Icon: Barbell,       label: 'Strength',     loop: 'float' },
  hug:     { Icon: HandHeart,     label: 'Here for you', loop: 'float' },
  clap:    { Icon: HandsClapping, label: 'Well done',    loop: 'clap' },
  namaste: { Icon: HandsPraying,  label: 'Namaste',      loop: 'float' },
};

const LOOPS: Record<Loop, [Record<string, number[]>, object]> = {
  wave:  [{ rotate: [0, 14, -8, 12, 0] }, { duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.4 }],
  pulse: [{ scale: [1, 1.08, 1] },        { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }],
  float: [{ y: [0, -5, 0] },              { duration: 3.0, repeat: Infinity, ease: 'easeInOut' }],
  clap:  [{ scale: [1, 1.12, 0.98, 1] },  { duration: 1.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.0 }],
};

export function HeroGesture({ gesture, size = 56 }: { gesture: GestureKey; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { Icon, label, loop } = GESTURE[gesture];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const [keyframes, options] = LOOPS[loop];
    const controls = animate(el, keyframes, options);
    return () => controls.stop();
  }, [loop]);

  return (
    <span ref={ref} role="img" aria-label={label} style={{ display: 'inline-flex', transformOrigin: '70% 90%' }}>
      <Icon size={size} weight="duotone" color="var(--m3-green-deep, #006971)" aria-hidden />
    </span>
  );
}
