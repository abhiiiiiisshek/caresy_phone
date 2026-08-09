<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Where to look

The repo is the source of truth, not the chat. Read the smallest thing that
answers the question (budget rules in `CLAUDE.md`).

| Question | File |
|---|---|
| New here — what is this whole thing? | `docs/ENGINEER_ONBOARDING.md` |
| How do I write code here? | `CLAUDE.md` |
| What is in flight / known broken right now? | `docs/CURRENT.md` — **read first after `/clear`** |
| What owns this concern? How does a booking flow? | `docs/ARCHITECTURE.md` |
| Why is it built this way? | `docs/ADR/` |
| Where is mobile going? | `docs/MOBILE_PLAN.md` (ADR-0009) |
| What is in the database? Which migrations are live? | `docs/DATABASE.md` |
| Who can read/write what? | `docs/SECURITY.md` |
| It's broken / how do I deploy? | `docs/TROUBLESHOOTING.md` |
| Where is the code for X? | `graphify query "X"`, then `rg` |

`docs/DEVELOPER_HANDOFF.md` is history — it predates the monorepo. Do not follow
its layout.

# Finding code

1. `graphify query "<question>"` — scoped subgraph, cheapest.
2. **`rg` whenever graphify comes up empty, stale, or `graphify-out/graph.json`
   is missing.** Do not fall back to reading directories.
3. `graphify-out/GRAPH_REPORT.md` only for broad architecture review.

# After changing code

`tsc --noEmit` → `lint` → self-checks → `build` → `graphify update .` → update the
doc the change invalidated, in the same commit. Full commands in `CLAUDE.md`.
