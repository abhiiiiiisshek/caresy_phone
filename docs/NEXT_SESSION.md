# NEXT_SESSION.md — "where we are & what's next"

Fast-moving. **Read this first on restart. Update it before every `/clear` or
when context is about to fill.** Durable facts live in
[PROJECT_MEMORY.md](./PROJECT_MEMORY.md).

_Last updated: 2026-08-20 — branch `main`._

## In progress

Nothing uncommitted right now (`git status` clean on `main`). `feature/structured-data`
is fully merged (zero diff vs `main`) — safe to delete once confirmed unneeded
elsewhere. `chore/web-update-20260819` still needs a PR to resolve the
`src/app` → `apps/website/src/app` path move (see repo layout note below).

## Next tasks (do these)

1. **iOS App Store blockers:** signing done; **Sign in with Apple config still
   pending** on the app side. `xcodebuild` unavailable in sandbox (only CLI
   tools) — needs a real Xcode/mac to archive + upload.
2. **Companion docs, later (optional):** no self-serve re-upload UI post-signup;
   companions send police/licence to ops via WhatsApp. Add an upload widget if
   self-serve is wanted.
3. **Open the `chore/web-update-20260819` PR** and resolve the path conflict
   (`apps/website/src/app` moved in the monorepo restructure).

## Done since last update (move to PROJECT_MEMORY milestones)

- Privacy/terms pages: all `FILL` blanks filled in, live on `main`.
- Login bundle shipped: MSG91 phone-OTP (`c92fa20`, `6f3e746`) + Apple sign-in
  (`7d31fc0`), all on `main`.
- Migrations `27_TRANSPORT`, `29_FIX_AUDIT_RLS`, `32_MERGE_DUPLICATE_PATIENTS`
  committed on `main`.
- Companion optional-docs (`6dc9600`) — already noted shipped, still clean.

## Open decisions / unknowns

- Whether to gate driving *jobs* on licence in the UI too (DB already refuses
  via `can_drive` — admin sets it after verifying).

## Known broken / blocked

| Thing | Effect | Fix |
|---|---|---|
| `NEXT_PUBLIC_UPI_VPA` unset | UPI buttons hidden, cash-only | set in Vercel env (website + companion) |
| `SUPABASE_SERVICE_ROLE_KEY` unset | push delivery dead; `notifications` queue grows unread | set on website server env |
| A `FAILED` notification is never retried | one bad run strands the row; requeue by hand with `update notifications set status='QUEUED', error=null where …` | add a retry counter if it happens twice |
| Duplicate patient rows | old ones from before `/quick-help` reused patients | run `32_MERGE_DUPLICATE_PATIENTS.sql`; it skips any duplicate that owns documents, so re-run the query at its foot afterwards |
| `patient-docs` bucket | must be created by hand in the dashboard | migration 25 only adds policies |

## Also pending

- Play Store: personal-account registration needs 12 testers × 14 continuous
  days before production. Keystore + tester list not started.
- Billing pipeline (migration 26) is shipped but still never exercised end to
  end by a human — walk book → accept → start → complete & bill → collect →
  confirm at `/admin/payments`.

## On restart / low-context ritual

1. `git status` + `git log --oneline -5` — reconcile against "In progress" above.
2. When you finish or change state: edit this file, move done items into
   `PROJECT_MEMORY.md`'s milestones, then `graphify update .`.
