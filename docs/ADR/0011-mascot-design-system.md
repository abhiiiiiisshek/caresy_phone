# ADR-0011 — Mascot as a design-system primitive, requested by pose

- **Status:** Superseded by ADR-0012, 2026-08-11
- **Code:** `packages/ui/src/mascot/`, `packages/ui/src/states/`
- **Relates to:** [ADR-0010](0010-lottie-login-mascot.md) (Lottie is one way to register final pose art)

## Context

Illustration on the site had drifted into emoji — care guides keyed on `🩹`/`💊`,
empty states built from a `3rem` `🫂`/`📅`/`👋`. Emoji read as a quick AI-made
app, not a premium healthcare product: they render differently per platform,
carry no brand, and can't animate. Earlier one-off mascot attempts (an inline
SVG elephant, then a bear) failed for the opposite reason — each was hardcoded
into one screen, so there was no system, no consistency, and no path to real art.

The products this should feel like — Duolingo, Headspace, Discord, GitHub — get
their warmth from *one* character that recurs everywhere: login, empty states,
success, error, loading, onboarding. The character is part of the identity, and
every screen reuses it rather than sourcing a different picture.

## Decision

Treat the mascot as a **design-system primitive in `@caresy/ui`**, not decoration.

- **One character, requested by pose.** A typed `MascotPose` vocabulary (idle,
  waving, walking, thinking, reading, holding-calendar, holding-clipboard,
  looking-around, waiting, covering-eyes, celebrating, success, confusion,
  sleeping, greeting) is the whole API. Screens call `<Mascot pose="…" />`; they
  never reference an image file.
- **A single swap point.** `Mascot` resolves a pose to artwork through the
  `POSE_ART` registry, falling back to `PlaceholderMascot` until final art is
  registered. Shipping real art for a pose — a static SVG, a sprite sheet, or a
  Lottie (ADR-0010) — is one line in `POSE_ART`; no consumer changes.
- **State slots wrap the mascot.** `EmptyState`, `LoadingState`, `ErrorState`,
  `SuccessState` own the layout (art + title + description + action) and each
  defaults a pose. They also take a `mascot` escape-hatch prop, so a bespoke
  illustration can override a pose without changing layout or business logic.
- **Placeholder is deliberately one figure.** It differentiates poses by
  transforms on shared parts (arms, head tilt, eyes, an optional held object),
  never by a new drawing — the same way the final art will behave.
- **Animation is calm and transform-only.** Idle breathing and a gentle blink,
  no cartoon bounce, all `translate`/`rotate`/`scale`, disabled under
  `prefers-reduced-motion`.

## Alternatives rejected

- **Emoji** — the status quo; off-brand, unstyleable, inconsistent across
  platforms, can't animate.
- **A generic line-icon set (lucide) for empty states** — clean and consistent,
  but it is not a brand. It builds no character recognition, which is the point.
- **Sourcing a different illustration per screen** — no consistency, licensing
  drift, and it fights the "one character builds trust" idea outright.
- **Hardcoding the mascot per screen (the elephant/bear attempts)** — no reuse,
  no swap path, every art change is a code change in every screen.

## Consequences

- **Art is now a data change, not a code change.** Screens are already wired to
  poses; upgrading from placeholder to owned illustration touches only `POSE_ART`.
  The flip side: the product currently ships the placeholder character, so it is
  only as premium as that placeholder until real art lands.
- **New poses are cheap** — extend the union; the placeholder covers it until art
  exists. `MascotPose`-typed maps make an unhandled pose a compile error.
- **Consistency is enforced by construction** — there is one mascot entry point,
  so drift back to emoji or ad-hoc images is easy to catch in review.
- **Web-only for now.** This lives in `@caresy/ui`, which the web app uses;
  mobile (ADR-0009, Expo) does not share web components and would need its own
  renderer against the same pose vocabulary if the mascot goes native.
- **Revisit** when final art is commissioned (decide static SVG vs Lottie per
  pose), or if the mascot is taken cross-platform.
