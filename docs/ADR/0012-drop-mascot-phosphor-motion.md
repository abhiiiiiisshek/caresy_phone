# ADR-0012: Drop the mascot; Phosphor duotone icons + Motion One spots

- **Status:** Accepted
- **Date:** 2026-08-11
- **Code:** `packages/ui/src/motion/MotionSpot.tsx`, `apps/website/src/lib/guideIcons.tsx`, `apps/website/src/lib/heroGestures.tsx`
- **Supersedes:** ADR-0010, ADR-0011

## Context

The product used an owned character (the mascot, ADR-0011) as the illustrated
slot on login, profile, empty-bookings and care screens, plus a plan to animate
it (ADR-0010). It never shipped past a placeholder, and the direction was
dropped. Separately, care-guide categories were labelled with raw emoji, which
read as unprofessional and render inconsistently across platforms.

## Decision

Remove the mascot design system entirely. Two replacements:

- **Category icons** — `@phosphor-icons/react`, `weight="duotone"`, tinted to the
  brand green. A deliberate "category" tier above the small `lucide-react` UI
  icons used everywhere else. Keyed by guide slug in `guideIcons.tsx`.
- **Illustrated slots** — one `MotionSpot` component: a Phosphor duotone icon on
  a soft disc, animated with **Motion One** (`motion`). Screens request a
  `SpotVariant` (`welcome`, `calendar`, `private`, …), never an icon. Entrance +
  gentle idle loop, transform/opacity only, skipped under reduced motion.
- **Home hero gesture** — the rotating greeting avatar was 7 self-hosted animated
  Noto emoji (`.webp`). Replaced with `HeroGesture` (`heroGestures.tsx`): the same
  7 gestures as Phosphor duotone icons on the existing disc, Motion One idle loop.
  The `.webp` assets were deleted.

Both are new runtime deps, hence this ADR (the stack in `CLAUDE.md` names only
`lucide-react`).

## Alternatives rejected

- **Keep lucide for the 12 category icons** — no duotone; category tier would not
  read distinctly from functional UI icons.
- **Source 12 individual SVGs** — mismatched stroke weights; still looks assembled
  by hand. One library = one visual system.
- **Lottie / dotLottie for the slots** — heavier, needs authored `.riv`/`.json`
  assets per state; Motion One animates the icon we already have, zero assets.

## Consequences

Two new deps to keep current. Icon coverage is bounded by Phosphor's set (all 12
categories + 7 spot variants are covered today). The `@caresy/ui` state wrappers
(`EmptyState`/`LoadingState`/`ErrorState`/`SuccessState`) now default to
`MotionSpot` variants instead of mascot poses. Revisit if the brand later wants a
bespoke character — that would supersede this.
