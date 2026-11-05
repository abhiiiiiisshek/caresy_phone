# ADR-0016 — Keep SF Symbols on iOS; draw the same meanings with lucide on Android

Date: 2026-11-05
Status: Accepted
Scope: `apps/mobile-app`

## Context

The customer app drew its icons two different ways depending on the platform.
iOS rendered SF Symbols through `expo-symbols`; Android, which cannot render
them, fell back to a table of typographic characters in `app/index.tsx`:

```ts
const FallbackGlyph = { bookings: '▦', care: '✦', help: '◐',
                        profile: '●', urgent: '♥', schedule: '◑' };
```

Those are glyphs from a text font, not icons — a quadrant block standing in for
a calendar, a filled circle for a person — plus `🩺` as a colour emoji on the
sign-in badge. Side by side the two builds did not read as the same product,
which is what prompted this: "the android app is somewhere different, it has to
be exact as iOS."

SF Symbols is an Apple system font. It is not redistributable and has no
Android renderer, so there is no configuration in which both platforms draw the
same glyphs while iOS keeps SF. Matching the two requires picking one set that
runs on both, and that set cannot be SF.

Three candidates:

- **`@expo/vector-icons`** — no new native module, but it is Material Symbols,
  whose heavier fill and squarer terminals read as Android-native. That is the
  opposite of the goal.
- **`react-native-vector-icons`** — the same shapes with more setup.
- **`lucide-react-native`** — the React Native binding of `lucide-react`, which
  `CLAUDE.md` already mandates for the website. Outline-first, 2px stroke,
  visually the closest of the three to SF Symbols' outline weights.

## Decision

iOS keeps SF Symbols. Android draws the nearest lucide equivalent.

The first version of this ADR moved **both** platforms to lucide, on the
reasoning that identical is the only real parity. That was reverted the same
day: the iOS app is shipped, approved and considered finished, and changing its
icon language to chase Android was spending a known-good surface to fix a
broken one. The brief was "the iOS app is perfect, configure the Android one" —
iOS is the reference, not a participant in the negotiation.

So parity here means *Android stops looking broken*, not *both platforms become
the same*. The gap being closed is '▦' versus a calendar, not an SF calendar
versus a lucide calendar.

`components/Icon.tsx` owns the split. Call sites name the icon's meaning and
never branch on platform:

```tsx
<Icon name="bookings" size={20} color={color.green} />
```

The pairing table in that file is the contract — one row per icon, the SF name
and the lucide component side by side. A new icon is one row there.

`lucide-react-native` is still a new runtime dependency, which `CLAUDE.md` says
needs an ADR; this is it. It brings `react-native-svg`, a native module, so it
costs a new EAS build and a new fingerprint runtime version. That build was
already required for the Android app icon, so it is not an extra one.

Icons are imported **per subpath**, never from the package root:

```ts
import Calendar from 'lucide-react-native/icons/calendar';   // yes
import { Calendar } from 'lucide-react-native';              // no
```

The barrel pulls all ~1,600 icons in and took the Android export from 3.9MB to
6.4MB. Per-icon imports land it at 4.1MB — roughly 200KB for the whole icon
system, `react-native-svg` included. On Indian mobile data a 2.5MB regression
in an OTA payload is not a rounding error, so the subpath form is a rule, not a
preference.

## Consequences

- **iOS is unchanged.** All eight SF names (`calendar`, `book.closed`,
  `questionmark.bubble`, `person.crop.circle`, `bolt.heart`,
  `calendar.badge.plus`, `checkmark.shield.fill`, `stethoscope`) render exactly
  as before, at the same sizes. `expo-symbols` stays.
- The two apps are therefore **not pixel-identical**, and will not be. lucide's
  outlines are close to SF's but not the same strokes. Held side by side a
  designer will see it. That is the accepted cost of not touching iOS.
- The website is on `lucide-react` and Android is now on `lucide-react-native`,
  so those two share an icon language. iOS is the odd one out, deliberately.
- `react-native-svg` must stay aligned with the SDK patch set — install with
  `npx expo install`, never bare `npm install`.
- Anything genuinely platform-specific stays so. Sign in with Apple is iOS-only
  because Apple requires it; date pickers keep each platform's native
  presentation. Parity is about brand surface, not overriding OS affordances.
- `expo-glass-effect` and `@expo/ui` are still in `package.json` and imported
  nowhere. Dead weight in every build; they should go on the next pass.
