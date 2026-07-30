@AGENTS.md

# Caresy — coding standards

Single source of truth for how code is written here. `AGENTS.md` covers the AI
workflow; this file covers the code. Architecture lives in `docs/ARCHITECTURE.md`,
the *why* behind big choices in `docs/ADR/`, in-flight work in `docs/CURRENT.md`.

## Prompt budget

Read the minimum that answers the question. In rough order of cost:

1. `graphify query "<question>"` — scoped subgraph, cheapest.
2. `rg` / Grep with a tight pattern — **the fallback whenever graphify returns
   nothing, is stale, or `graphify-out/graph.json` is missing**. Do not fall back
   to reading whole directories.
3. Read the specific file range you need (`offset`/`limit`), not the whole file.
4. `graphify-out/GRAPH_REPORT.md` — only for broad architecture review.

Never paste a whole migration, whole page component, or a full report into
context to answer a narrow question. `/clear` freely — the repo, not the chat,
is the source of truth. If something must survive a `/clear`, it belongs in
`docs/CURRENT.md` or an ADR, not in the conversation.

## Stack (do not substitute)

Next.js 16 App Router · React 19 · TypeScript · Supabase (Postgres + Auth +
Storage + RLS) · Tailwind v4 + CSS custom-property tokens · `lucide-react` icons ·
Capacitor 7 for the Android shell · Vercel deploy.

**Use:** the workspace packages (`@caresy/ui`, `@caresy/auth`, `@caresy/types`,
`@caresy/utils`), `lucide-react`, `@supabase/ssr`.

**Avoid without an ADR:** any new runtime dependency, a UI kit or component
library, a state manager (React state + Supabase queries cover it today), an ORM
(SQL migrations are hand-written), a date library (`Intl` covers formatting), a
test framework (see Testing).

## TypeScript

- Strict. No `any` in committed code — model the type or use `unknown` + a narrow.
- Shared domain types live in `packages/types`. If two apps need a type, it moves
  there rather than being redeclared.
- Supabase FK joins are typed as arrays by the client even for many-to-one; cast
  with `as unknown as T[]` at the query boundary, not deeper.
- Money is integer **paise**, never floats, and column/variable names say so
  (`final_amount_paise`). Format only at the render edge with `formatINR`.

## Naming

- Components/types `PascalCase`; functions/vars `camelCase`; DB columns and SQL
  functions `snake_case`; enum values `SCREAMING_SNAKE` (`PENDING`, `IN_PROGRESS`).
- Migrations `NN_TOPIC.sql`, sequential, idempotent, never edited after they run —
  fix forward with a new file.
- Route folders match the URL. Self-checks are `<module>.check.ts` next to the
  module.

## Architecture rules

- **Server-authoritative money.** Prices and payment state are computed in
  Postgres (`26_BILLING.sql`) and written only through SECURITY DEFINER RPCs.
  The client copy in `packages/utils/src/pricing.ts` draws the quote; it never
  decides what is owed. Changing a rate means changing both, in one commit.
- **RLS is the security boundary**, not the UI. Every new table gets policies in
  the same migration that creates it. See `docs/SECURITY.md`.
- Shared logic goes in `packages/`; app folders hold routes and app-specific UI.
  Copy-pasting a helper between two apps is a bug — move it to `packages/utils`.
- Reuse `@caresy/ui` primitives (Button, Card, Badge, Input, …). Do not invent a
  parallel design system; style with the tokens in `@caresy/ui/theme.css`.
- Never put a service-role key in an app that ships to a browser. Server routes
  only (`SUPABASE_SERVICE_ROLE_KEY`).

## Testing

No framework, and that is deliberate. Non-trivial logic — money, phone/pincode
validation, any parser or branchy helper — leaves one runnable `assert`-based
self-check beside it:

```
packages/utils/src/pricing.check.ts     node --experimental-strip-types src/pricing.check.ts
```

Silence means pass. Check **properties** (monotonic price, no arbitrage), not
just examples. UI and glue code get no test; smoke them per `docs/ARCHITECTURE.md`.

## Post-change workflow (run before saying "done")

```
npx tsc --noEmit                  # in each touched app/package
npm run lint -w @caresy/<app>     # pre-existing errors are fine; new ones are not
node --experimental-strip-types src/<module>.check.ts   # if logic changed
npm run build -w @caresy/<app>    # the real gate — Vercel runs this
graphify update .                 # keep the knowledge graph current
```

Then update docs in the same commit: `docs/ARCHITECTURE.md` if a module boundary
moved, `docs/DATABASE.md` if a migration was added, a new `docs/ADR/` entry if a
choice was made that a future reader would question, `docs/CURRENT.md` if the
state of in-flight work changed.

⚠️ Do not run `npm run dev` in a sandbox — Turbopack has spawned runaway
processes here. Verify with `build` plus a Vercel preview.
