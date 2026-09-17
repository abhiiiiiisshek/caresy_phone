import type { TextStyle } from 'react-native';

// Command-deck tokens — the dark counterpart to apps/mobile-app/lib/theme.ts.
//
// Why not reuse the customer app's warm off-white palette: this app is read in
// a dark room at 3am, one-handed, between other things. A dark ground with a
// tiny number of saturated signal colours means the one card that needs action
// is the only bright thing on the screen. The brand greens (#1B4D3E deep
// forest) go muddy on a dark ground, so the signal green here is the brand hue
// lifted in lightness/chroma until it reads at a glance — same family, not the
// same hex.

export const color = {
  // Ground and layers. Each step up is lighter, never a border-only change.
  bg: '#070F0C',
  surface: '#0E1A15',
  surfaceHi: '#152520',
  surfacePress: '#1B2E28',

  line: 'rgba(143, 201, 176, 0.13)',
  lineStrong: 'rgba(143, 201, 176, 0.26)',

  // Text
  ink: '#E8F0EB',
  muted: '#93A79E',
  faint: '#61736C',

  // Signal — used ONLY to mean something, never as decoration.
  green: '#2FBE8F', // healthy / assigned / confirmed
  greenDim: 'rgba(47, 190, 143, 0.14)',
  amber: '#F5B944', // waiting, getting old
  amberDim: 'rgba(245, 185, 68, 0.14)',
  terracotta: '#FF6B4F', // needs action now (brand terracotta, lifted)
  terracottaDim: 'rgba(255, 107, 79, 0.15)',
  blue: '#63B3F5', // in progress / live
  blueDim: 'rgba(99, 179, 245, 0.14)',

  onSignal: '#06120E',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

// Declared outside the `as const` below: `fontVariant` has to stay a mutable
// FontVariant[] for React Native's style types.
const mono: TextStyle = {
  fontSize: 13, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'],
};

export const type = {
  // 34pt large title, the iOS standard — it is the only thing on screen that
  // is allowed to be this big.
  large: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.6 },
  h1: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  // Reference codes and timers: tabular so digits do not jitter as they tick.
  mono,
  overline: {
    fontSize: 11, lineHeight: 14, fontWeight: '700' as const,
    letterSpacing: 1.1, textTransform: 'uppercase' as const,
  },
} as const;

// One shadow, used on cards that need to lift off the ground. On a dark UI a
// shadow does almost nothing, so an urgent card gets a coloured border instead.
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
