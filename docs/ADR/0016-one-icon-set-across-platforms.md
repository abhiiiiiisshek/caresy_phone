# ADR-0016 — One icon set on both platforms: `lucide-react-native`, not SF Symbols

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

`lucide-react-native` on both platforms. `expo-symbols` is removed.

This is the one option that makes the phone apps identical *and* collapses a
third icon language: the website was already on `lucide-react`, so caresy.co.in,
iOS and Android now draw the same shapes from the same names.

It is a new runtime dependency, which `CLAUDE.md` says needs an ADR — this one.
It brings `react-native-svg` with it, a native module, so adopting it costs a
new EAS build and a new fingerprint runtime version. That cost was already
being paid in the same change for the Android app icon (a native asset), so it
is not an additional build.

Icons are imported **per subpath**, never from the package root:

```ts
import Calendar from 'lucide-react-native/icons/calendar';   // yes
import { Calendar } from 'lucide-react-native';              // no
```

The barrel import pulls all ~1,600 icons into the bundle and took the Android
export from 3.9MB to 6.4MB. Per-icon imports land it at 4.1MB — about 200KB for
the whole icon system, `react-native-svg` included. On Indian mobile data a
2.5MB regression in an OTA payload is not a rounding error, so the subpath form
is a rule here, not a preference.

## Consequences

- iOS visibly changes: SF Symbols become lucide outlines. This is the intended
  trade — parity was chosen over platform nativeness, deliberately.
- Icons can no longer be addressed by an SF name string. `app/index.tsx` holds
  an `Icon` map from a semantic key (`bookings`, `urgent`) to a component, and
  `IconKey` is the type passed to `ActionCard` / `QuickAction`. Adding an icon
  means adding a subpath import and a map entry.
- `react-native-svg` must stay aligned with the SDK patch set; install it with
  `npx expo install`, never bare `npm install`.
- Anything that genuinely *is* platform-specific stays platform-specific. Sign
  in with Apple is still iOS-only (Apple requires it); the date picker still
  uses each platform's native presentation. Parity is about brand surface, not
  about overriding OS affordances.
- `expo-glass-effect` and `@expo/ui` remain in `package.json` and are imported
  nowhere. They were not removed here to keep this change reviewable, but they
  are dead weight in the build and should go.
