import type { TextStyle, ViewStyle } from 'react-native';

// Design tokens for the dispatch desk.
//
// This app used to be dark ("read at 3am"). In practice it is read standing in
// daylight, one-handed, next to a phone call — and a dark deck made every card
// look the same weight. The ground is now a soft neutral, cards are white and
// lifted, and colour is spent only on state: the one card that needs action is
// the only saturated thing on the screen.
//
// Hues come from the Caresy Admin icon — amber on near-black — not from a
// generic accent. Primary actions are ink, not amber: amber on white cannot
// carry white text at an accessible contrast, and a black pill reads as the
// single committed action on the screen.

export const color = {
  // Ground and layers
  bg: '#F4F4F7',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAFB',
  surfacePress: '#EFEFF3',

  line: '#EAEAF0',
  lineStrong: '#D9D9E2',

  // Text
  ink: '#111318',
  inkSoft: '#3B3F48',
  muted: '#6E727B',
  faint: '#A3A7B0',
  onInk: '#FFFFFF',

  // Brand (icon amber). Used for highlights and the avatar, never for body text.
  brand: '#F5B60C',
  brandTint: '#FEF3D6',
  onBrand: '#1A1405',

  // State. Each pairs an ink that passes on white with a tint that carries it.
  critical: '#C93E20',
  criticalTint: '#FBE9E4',
  warn: '#A97406',
  warnTint: '#FAF0D8',
  good: '#0F7A57',
  goodTint: '#E3F2EB',
  info: '#2A5FC7',
  infoTint: '#E8EEFB',
  neutralTint: '#EFEFF4',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 32 } as const;

// Generous corners are the whole character of this design language; a 14pt
// radius on a 20pt card reads as a web panel, not an app surface.
export const radius = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;

// `fontVariant` has to stay a mutable FontVariant[] for React Native's types,
// so these are declared outside the `as const` object below.
const mono: TextStyle = {
  fontSize: 13, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'],
};
const stat: TextStyle = {
  fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'],
};

export const type = {
  // One screen, one 30pt heading. Everything else steps down hard — the size
  // jump is what makes a dense board scannable without borders everywhere.
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.7 },
  h1: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.4 },
  h2: { fontSize: 16, lineHeight: 21, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  overline: {
    fontSize: 11, lineHeight: 14, fontWeight: '700' as const,
    letterSpacing: 0.9, textTransform: 'uppercase' as const,
  },
  // Reference codes and countdowns: tabular so digits do not jitter as they tick.
  mono,
  stat,
} as const;

// Two elevations only. A card lifts; a bar that floats over content lifts more.
export const shadow: Record<'card' | 'float', ViewStyle> = {
  card: {
    shadowColor: '#0B1020',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  float: {
    shadowColor: '#0B1020',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
};

/**
 * How much room a scrolling tab screen must leave under its content so the
 * floating tab bar never covers the last row. Bar height + its bottom offset;
 * screens add the safe-area inset on top of this.
 */
export const TAB_BAR_SPACE = 96;
