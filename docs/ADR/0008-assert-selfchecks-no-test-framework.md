# ADR-0008: `assert`-based self-checks instead of a test framework

- **Status:** Accepted
- **Date:** 2026-07-29
- **Code:** `packages/utils/src/pricing.check.ts`, `packages/utils/src/phone.check.ts`

## Context

The repo had zero tests. The money path arrived (ADR-0005) and needed a guard —
a wrong rate means wrong bills. Installing Jest or Vitest means config, a
transform pipeline, mocks and a CI story before the first assertion runs.

## Decision

Logic worth checking gets a sibling `<module>.check.ts` using `node:assert`,
runnable with no dependencies:

```
node --experimental-strip-types src/pricing.check.ts   # silence means pass
```

Checks assert **properties**, not just examples — price monotonicity and
no-underbooking-arbitrage are what stop a customer paying less by gaming the
slab. UI and glue code get no test; they get the smoke loops in
`docs/ARCHITECTURE.md`.

## Alternatives rejected

- **Jest / Vitest** — config and fixtures for a repo whose testable surface is
  three pure modules.
- **Playwright end-to-end** — the highest-value coverage eventually, but it needs
  seeded data and a running stack; not while the schema moves weekly.
- **No tests at all** — acceptable until money was in the code. It no longer is.

## Consequences

- No coverage reporting, no watch mode, no CI gate — running the checks is part
  of the workflow in `CLAUDE.md`, by hand.
- RLS policies are untested; a policy mistake is still found in production.
- **Revisit when** a regression escapes to production, or the checks start
  wanting fixtures and setup — that is the signal a real runner is now cheaper.
