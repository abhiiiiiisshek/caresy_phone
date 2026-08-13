// Native design tokens — the single source of visual truth for the mobile app.
// Values come from the Caresy brand tokens in packages/ui/theme.css (the --m3-*
// M3 palette the current product uses). We do NOT import the CSS (RN can't read
// it); we mirror the values here so the native app shares the brand, not the
// web components. Change a brand color in one place: here.

export const color = {
  // Surfaces
  bg: '#F8FAF5', // --m3-bg  warm off-white app background
  surface: '#FFFFFF', // --m3-surface  cards, sheets
  card: '#ECEFEA', // --m3-card  muted card fill
  chip: '#F2F4EF', // --m3-chip  unselected chip

  // Brand green (deep forest — the primary identity)
  green: '#1B4D3E', // --m3-green  primary
  greenDeep: '#003629', // --m3-green-deep  headings / on-light emphasis
  greenSoft: '#8ABDA9', // --m3-green-soft
  greenTint: '#E7F2ED', // derived: green @ ~10% for selected fills

  // Text
  ink: '#191C1A', // --m3-ink  primary text
  muted: '#404945', // --m3-muted  secondary text
  faint: '#6B746F', // derived: tertiary / placeholder-adjacent
  placeholder: '#9AA5A0',

  // Accents
  terracotta: '#C45543', // --terracotta  destructive / accent
  terracottaDeep: '#A64434',
  terracottaSoft: '#FCEAE8', // --terracotta-soft
  success: '#27A875', // --success
  successSoft: '#E1F3EA', // --success-soft
  warning: '#E7A33E', // --warning
  urgent: '#BA1A1A', // --m3-urgent
  urgentBg: '#FFDAD6', // --m3-urgent-bg
  urgentInk: '#93000A', // --m3-urgent-ink

  // Lines
  line: 'rgba(192, 201, 195, 0.5)', // --m3-line
  lineStrong: 'rgba(22, 48, 43, 0.22)',

  onGreen: '#FFFFFF',
} as const;

// 4pt spacing scale.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 18, pill: 999 } as const;

// Type scale — sizes + line heights tuned for mobile reading.
export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  h2: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
} as const;

// Soft elevation for cards (iOS shadow + Android elevation).
export const shadow = {
  card: {
    shadowColor: '#0B2A20',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
