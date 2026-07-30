# ADR-0002: npm workspaces monorepo, three Next apps, no build orchestrator

- **Status:** Accepted
- **Date:** 2026-07-04
- **Code:** `package.json` (`workspaces`), `apps/*`, `packages/*`

## Context

Customer, companion and admin surfaces started as one Next app with `/companion`
and `/admin*` routes. They have different audiences, different deploy risk (a
marketing tweak should not be able to break dispatch) and different domains, but
share auth, design tokens, domain types and pricing rules.

## Decision

One repo, npm workspaces. Three deployable Next apps under `apps/` plus the
Capacitor shell; shared code as four source-only packages under `packages/`
(`ui`, `auth`, `types`, `utils`). No Turborepo/Nx, no build step for packages —
each app compiles the package sources through its own `next build`.

## Alternatives rejected

- **Separate repos** — shared auth and pricing would drift, and a cross-cutting
  change would need coordinated PRs across three repos.
- **Stay one app** — a single deploy for three audiences; admin and customer
  bundles and failure modes coupled forever.
- **Turborepo / Nx** — caching and task graphs solve a build-time problem this
  repo does not have (three independent `next build`s, no shared compile step).

## Consequences

- Shared code changes are atomic across all apps, and break all of them at once —
  so `tsc --noEmit` and `build` must be run per touched app (see `CLAUDE.md`).
- Packages ship as TypeScript source, so each app transpiles them; fine at this
  size, and it removes a whole publish/version dance.
- **Revisit when** the workspace grows enough that full builds get slow, or a
  package needs to be consumed outside this repo.
