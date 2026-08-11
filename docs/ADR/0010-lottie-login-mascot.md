# ADR-0010 — Lottie for the login mascot animation

- **Status:** Superseded by ADR-0012, 2026-08-10
- **Code:** `apps/website/src/app/login/BearMascot.tsx`, `apps/website/public/mascot/`

## Context

The login/OTP screen carries a mascot that reacts to the auth flow — idle,
typing, covering its eyes while the OTP is entered, success, error. The first
two attempts (Ellie the elephant, then a bear) were both drawn from scratch as
inline SVG primitives and animated with CSS transforms. The motion was fine;
the *art* was the problem — hand-authored ellipses read as amateur ("hands look
unrealistic"), which is the wrong signal for a premium healthcare product.

The bottleneck was never the animation engine. CSS already animates transforms
smoothly. The gap is illustration: none of our tools generate real illustrated
art, and hand-drawing vectors in SVG or Figma's Plugin API lands at the same
primitive look. We need a way to ship a professionally illustrated, professionally
animated mascot without hiring the motion into our own code.

## Decision

Adopt **Lottie** for the mascot. A designer-made animation (sourced from
LottieFiles or exported from After Effects) ships as a `.lottie`/`.json` asset in
`apps/website/public/mascot/` and is played by
**`@lottiefiles/dotlottie-react`**. `BearMascot.tsx` keeps its existing typed
`MascotState` prop and the focus/blur/success/error wiring in `page.tsx`; each
state maps to a marker/segment in the animation, and `prefers-reduced-motion`
holds a static frame. The art lives in the asset, not in our code.

## Alternatives rejected

- **Keep hand-drawn SVG + CSS** — zero deps, but cannot clear the "premium, not
  childish" bar. The art, not the motion, was the complaint.
- **Motion One / GSAP / Framer Motion** — animation libraries change *how* things
  move, not how they *look*. Pointed at the primitive bear they buy nicer easing
  and a new dependency, and fix nothing about the illustration.
- **Rive** — a genuinely good fit for state-machine mascots, but a `.riv` must be
  drawn and rigged by hand in Rive's editor (a GUI we cannot drive), and it adds
  a wasm runtime. Same art bottleneck, plus a tool we cannot operate headless.
- **Figma-generated art** — Figma writes vectors via the Plugin API (us authoring
  shapes in code) or assembles design-system components; raster image generation
  (`createImageAsync`) is blocked. It produces another hand-drawn vector bear.

## Consequences

- **New runtime dependency** (`@lottiefiles/dotlottie-react`, wasm renderer),
  the reason this ADR exists per the CLAUDE.md no-new-dep rule. Justified: it is
  the standard way premium apps (Duolingo-class) ship illustrated character
  animation, and it decouples art quality from our engineering.
- **The mascot is only as good as the sourced asset.** Swapping the look is now
  a file swap, not a code rewrite — but someone must pick/commission the asset
  and its per-state markers.
- **Bundle + first-paint cost** of the wasm runtime + JSON payload. Acceptable on
  a login screen; revisit if it ever lands on a hot, size-sensitive path.
- **Revisit** if the mascot is dropped, if we standardise on Rive elsewhere (then
  unify), or if the wasm renderer becomes a measured performance problem.
