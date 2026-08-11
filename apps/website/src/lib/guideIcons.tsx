'use client';

// The single swap point for care-guide category icons. Guides are keyed by
// slug, so the icon follows the slug — screens never hardcode an icon. Phosphor
// duotone reads as a deliberate "category" tier above the small lucide UI icons
// used elsewhere.
import type { ComponentType } from 'react';
import {
  Bandaids, Pill, PersonSimpleWalk, Drop, Footprints, Moon,
  ClipboardText, Thermometer, BowlFood, Stethoscope, Bed, Brain,
  type IconProps,
} from '@phosphor-icons/react';

const ICONS: Record<string, ComponentType<IconProps>> = {
  'post-surgery': Bandaids,
  'medicines': Pill,
  'preventing-falls': PersonSimpleWalk,
  'hydration': Drop,
  'diabetes-feet': Footprints,
  'sleep-and-breathing': Moon,
  'leaving-hospital': ClipboardText,
  'fever-at-home': Thermometer,
  'eating-to-recover': BowlFood,
  'blood-pressure-at-home': Stethoscope,
  'bed-rest-skin': Bed,
  'dementia-day': Brain,
};

export function GuideIcon({
  slug,
  size = 28,
  color = 'var(--m3-green-deep)',
}: {
  slug: string;
  size?: number;
  color?: string;
}) {
  const Icon = ICONS[slug] ?? ClipboardText;
  return <Icon size={size} weight="duotone" color={color} aria-hidden />;
}
