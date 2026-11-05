// One icon, two renderers (ADR-0016).
//
// iOS draws SF Symbols, which is what the shipped iOS app does today and what
// it should keep doing — it is the platform's own icon language and it is
// already approved in the App Store. Android has no SF Symbols renderer (it is
// an Apple system font), so it draws the nearest lucide equivalent instead.
//
// What this replaces is the reason it exists: Android used to fall back to
// characters from a *text* font — '▦' for bookings, '●' for profile, '🩺' on
// the sign-in badge. Those are not icons, and next to the iOS build the two
// did not read as the same product.
//
// Call sites never branch on platform. They say what the icon MEANS
// (`<Icon name="bookings" />`) and this file owns how each platform draws it,
// so a new icon is one entry here rather than a ternary in every screen.
import { Platform } from 'react-native';

// Per-icon subpaths, never the `lucide-react-native` barrel: the barrel pulls
// all ~1,600 icons in and cost 2.5MB of Android bundle (3.9MB -> 6.4MB).
import BookOpen from 'lucide-react-native/icons/book-open';
import Calendar from 'lucide-react-native/icons/calendar';
import CalendarPlus from 'lucide-react-native/icons/calendar-plus';
import CircleUser from 'lucide-react-native/icons/circle-user';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import MessageCircleQuestionMark from 'lucide-react-native/icons/message-circle-question-mark';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Stethoscope from 'lucide-react-native/icons/stethoscope';

// Lazy, so web/SSR bundles stay green — expo-symbols has no web renderer.
let SymbolView: any = null;
try { SymbolView = require('expo-symbols').SymbolView; } catch {}

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// The pairing table. Left column is what iOS has always drawn; right column is
// the closest lucide outline. Keep the two columns describing the same thing —
// a mismatch here is how the apps drift apart again.
const ICONS = {
  bookings: { sf: 'calendar', lucide: Calendar },
  care: { sf: 'book.closed', lucide: BookOpen },
  help: { sf: 'questionmark.bubble', lucide: MessageCircleQuestionMark },
  profile: { sf: 'person.crop.circle', lucide: CircleUser },
  urgent: { sf: 'bolt.heart', lucide: HeartPulse },
  schedule: { sf: 'calendar.badge.plus', lucide: CalendarPlus },
  verified: { sf: 'checkmark.shield.fill', lucide: ShieldCheck },
  medical: { sf: 'stethoscope', lucide: Stethoscope },
} satisfies Record<string, { sf: string; lucide: LucideIcon }>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 2.25,
}: {
  name: IconName;
  size?: number;
  color: string;
  /** Android only — SF Symbols carry their own weight. */
  strokeWidth?: number;
}) {
  const entry = ICONS[name];

  if (Platform.OS === 'ios' && SymbolView) {
    // `fallback={null}` rather than a glyph: on an iOS old enough to be
    // missing a symbol, nothing is better than a stray character.
    return <SymbolView name={entry.sf} size={size} tintColor={color} fallback={null} />;
  }

  const Glyph = entry.lucide;
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} />;
}
