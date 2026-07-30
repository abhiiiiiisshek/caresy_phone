# ADR-0003: Scheduling and push dispatch run in Postgres (pg_cron + pg_net)

- **Status:** Accepted
- **Date:** 2026-07-27
- **Code:** `supabase/migrations/14_SCHEDULER.sql`, `20_NOTIFICATION_DELIVERY.sql`,
  `24_PUSH_DELIVERY.sql`, `apps/website/src/app/api/cron/`

## Context

Bookings stuck in `PENDING` forever was the owner's first complaint, so the
expiry sweep had to run reliably every few minutes. The first attempt used a
`vercel.json` cron at `*/5 * * * *` — Vercel Hobby rejects sub-daily crons and
**failed the entire deployment silently**, leaving the old build serving.

## Decision

`pg_cron` runs `expire_stale_bookings()` every 5 minutes inside Postgres. The
notification queue lives in the `notifications` table; delivery is an HTTP drain
(`/api/cron/send-push`) reached from the database side, with `sent_at` and
`error` recorded so a failed push is visible instead of silent. The Next cron
routes remain callable, guarded by `CRON_SECRET`, as a manual/backup trigger.

## Alternatives rejected

- **Vercel Cron** — Pro-only for sub-daily, and a bad entry breaks the deploy,
  not just the job.
- **External uptime cron (cron-job.org)** — another account and secret to manage
  for a job the database can run itself; still viable as a fallback.
- **A long-running worker** — a whole always-on process for a 5-minute sweep.

## Consequences

- The scheduler is invisible in the repo: it lives in `cron.job` in the database.
  Check it there, not in `vercel.json`.
- Push delivery needs `SUPABASE_SERVICE_ROLE_KEY` set on the website server. If
  it is unset, notifications queue up and nothing sends — check
  `/admin/notifications` first when push seems broken.
- ⚠️ Never add a sub-daily cron to `vercel.json` while on Hobby.
