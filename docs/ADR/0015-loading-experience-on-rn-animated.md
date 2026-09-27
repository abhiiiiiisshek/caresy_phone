# ADR-0015 — The loading experience runs on RN `Animated`, not Reanimated

Date: 2026-09-27
Status: Accepted
Scope: `apps/mobile-app`

## Context

Every wait in the customer app was either a blank screen, a centred
`ActivityIndicator`, or a grey block: the cold launch flashed white between the
native splash and the first React frame, seven screens gated on one generic
`LoadingState`, remote images popped in from nothing, buttons swapped their
label for a platform spinner, and there was no offline, slow-connection or
retry state at all.

The obvious way to fix this is the stack everyone reaches for:
`react-native-reanimated` + `moti` + `lottie-react-native` + `expo-blur` +
`react-native-gesture-handler`. None of the five is installed. All five are
native modules, so adopting them means a new EAS build, a new fingerprint
runtime version (so every OTA channel splits), and five more packages to keep
aligned with the SDK 57 patch set — the alignment work `eeb0e1c` already had to
do once.

## Decision

Build the whole loading system on React Native's own `Animated` API with
`useNativeDriver: true`, plus the Expo packages already in
`apps/mobile-app/package.json` (`expo-linear-gradient`, `expo-haptics`,
`expo-splash-screen`). No new runtime dependency.

`useNativeDriver: true` serialises the animation to the native side once and
produces every subsequent frame on the UI thread. For `transform` and `opacity`
— which is all this system animates — that is the same 60 FPS guarantee
Reanimated gives, from the same place: frames keep coming while the JS thread is
blocked on a Supabase round-trip, which is exactly when a loading animation is
on screen.

Motion primitives live in `apps/mobile-app/lib/motion.ts`; the pure arithmetic
(stagger cadence, retry backoff, skeleton floor) lives in `lib/motionMath.ts`
with a self-check beside it.

## What this costs

Three things Reanimated would have given us, deliberately not built:

- **Gesture-driven pull-to-refresh.** Android reports no overscroll offset to
  JS without gesture-handler, so a finger-tracking rubber band is not possible.
  `components/Refresh.tsx` keeps the platform `RefreshControl` (which also keeps
  its VoiceOver "refresh" action and nested-scroll behaviour) and brand-tints
  it, with a custom indicator overlaid. The ceiling is marked `ponytail:` in
  that file.
- **Real backdrop blur.** `expo-blur` is a native module. The bottom sheet and
  modal scrims use a layered wash plus a gradient instead.
- **Lottie.** Success marks, confetti and the empty/offline glyphs are drawn
  with views and transforms. A Lottie file is a native dependency plus a JSON
  asset per state.

## Revisit when

A shared-element transition between screens, or a genuinely gesture-driven
sheet, becomes a product requirement. Both need Reanimated 3 +
gesture-handler and neither has a credible `Animated` version. At that point
swap `lib/motion.ts` for Reanimated hooks — every call site imports from that
one module, so the blast radius is one file plus a rebuild.

## Addendum (2026-09-27) — the Capacitor shell

`apps/mobile` wraps the live site at `caresy.co.in`, so it has the same white
flash for a different reason: the native splash auto-hid on a 1200ms timer
while the webview was still fetching a remote page over mobile data.

Same inversion, same rule (no new dependency — CSS keyframes, compositor-only):

- `apps/mobile/capacitor.config.ts` raises `launchShowDuration` to 3000 and
  keeps `launchAutoHide: true`. The duration is now a **ceiling, not a cue**.
- `apps/website/src/components/NativeSplash.tsx` paints an overlay
  pixel-matched to the native splash, and only then calls
  `SplashScreen.hide()` — normally well under a second.
- `launchAutoHide` stays `true` deliberately. With it `false` the splash would
  hang forever if that `hide()` call never arrived (JS blocked, plugin
  missing). The 3s ceiling is the failsafe.

The overlay renders **nothing** on a plain browser: the page paints in
milliseconds there, so a splash would be an invented delay rather than a
covered one.

Styles live in `apps/website/src/app/globals.css` under a
`/* Native splash */` banner, and honour `prefers-reduced-motion`.

## Addendum (2026-09-27) — splash asset sizing

The three splashes must show the mark at the same size or the handoff reveals
a jump, which is the exact artefact the pixel-match exists to hide. The shared
target is a mark ~136pt tall:

| Surface | How it gets there |
|---|---|
| Capacitor native (Android ×11, iOS ×3) | generated at 35% of the short edge |
| Expo native | `app.json` `imageWidth: 220`, `resizeMode: contain` |
| `SplashGate` (React) | logo box `220×220` — must equal `imageWidth` |
| `NativeSplash` (web) | `splash-mark.png` at `114×136` |

Two traps worth writing down:

- **`assets/splash-icon.png` is 1024² but the mark only occupies a 534×635
  alpha bbox.** Scaling the canvas understates the mark by ~40%. Crop to
  `img.split()[3].getbbox()` before sizing.
- **`apps/website/public/icon-512.png` has no alpha channel.** On the cream
  splash it paints a white square. The web overlay uses the cropped,
  transparent `public/splash-mark.png` instead.

Regenerating after a brand change: crop the source to its alpha bbox, compose
onto `#f8faf5` at the sizes above. The Capacitor native images are tracked in
git (`apps/mobile/android`, `apps/mobile/ios`); the Expo `ios/` folder is
gitignored and is rebuilt by `expo prebuild`.
