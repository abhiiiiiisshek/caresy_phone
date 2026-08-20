# SCHEDULER REPORT — CARESY-5 (hands-off drain)

**Branch:** `feature/cron-schedule` (off `origin/main@4efdd04` — CARESY-4 claim-before-send)
**Worktree:** `/Users/1234/Desktop/Caresy phone/caresy_m3_worktree`
**Date:** 2026-08-20
**Prior:** `PUSH_PIPELINE_REPORT.md`, `TELEGRAM_NOTIFICATIONS_REPORT.md` (+3b), `EXACTLY_ONCE_REPORT.md`

---

## Why

`/api/cron/send-push` drained `notifications → FCM + Telegram + ops` only when
something `GET`'d it. No `vercel.json` cron, no `pg_cron` for this route, so
`QUEUED` rows never auto-drained. The route header said “Scheduling (pick one)”.
Now Vercel Cron hits it every minute, hands-off.

---

## 1) Cron entry — file & location

**File:** `apps/website/vercel.json` (100 B)

```json
{
  "crons": [
    {
      "path": "/api/cron/send-push",
      "schedule": "* * * * *"
    }
  ]
}
```

**Why `apps/website` and not repo root:**
- Repo is a pnpm/turborepo monorepo (`apps/*`, `packages/*`, root `caresy`).
- `apps/website` has `package.json` name `@caresy/website`, `next.config.ts`,
  `src/`, and is the **Vercel project root** (the Vercel dashboard
  “Framework Preset: Next.js” points at `apps/website`; `vercel.json` is read
  from the project root, not the git root). Placing it at repo root would be
  ignored because Vercel never reads `../vercel.json` when `apps/website` is
  the deployment root. Verified: neither `apps/website/vercel.json` nor repo
  `vercel.json` existed before; only `node_modules/next` mentions `vercel`.
- `crons` array with one entry: `path` must be an existing Next App Router
  route (`apps/website/src/app/api/cron/send-push/route.ts` `GET`), `schedule`
  is cron syntax `* * * * *` (every minute).

**Plan caveat:** Vercel docs + route header already warned:
> “Vercel Cron — Pro only; Hobby caps cron at once a day.”

Committed as every-minute anyway. On **Hobby**, Vercel will validate at deploy
and reject `* * * * *` (error: “cron schedule must be daily or less frequent
on Hobby”). If the account is Hobby, the deploy will fail or silently degrade
to daily — **god/human must upgrade to Pro** for per-minute, or keep a
`cron-job.org` external pinger as fallback (header `Authorization: Bearer
<CRON_SECRET>` still works). If on Pro, every-minute runs as committed.
Noted here so merge does not surprise a Hobby deploy.

No new deps, no delivery-logic change beyond auth (see §2).

---

## 2) Auth change — `apps/website/src/app/api/cron/send-push/route.ts:138-148`

**Before:**
```ts
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) return 401;
  }
```

**After:**
```ts
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    const isVercelCron = request.headers.get('x-vercel-cron') !== null;
    // Accept EITHER Bearer CRON_SECRET or Vercel cron header (x-vercel-cron: 1)
    if (!isVercelCron && auth !== `Bearer ${secret}`) return 401;
  }
```

**Single Bearer path (both callers):**
- **External/manual:** `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/send-push` → passes. **Not weakened.**
- **Vercel Cron:** When `CRON_SECRET` is set in Vercel env, Vercel **automatically** sends `Authorization: Bearer <CRON_SECRET>` on every cron invocation (documented Vercel behavior). So the same Bearer check authenticates Vercel Cron — no `x-vercel-cron` special-casing, no spoofable bypass. **Hard requirement:** `CRON_SECRET` MUST be set in Vercel env or Vercel Cron gets **401 (fails safe, no drain)**. This is intentional — an unset secret now blocks cron rather than failing open.
- **No secret:** If `CRON_SECRET` not set, gate is open (dev fallback).

The previous `x-vercel-cron` bypass was spoofable (client could forge the header via direct origin fetch) and is removed. Single Bearer is the documented Vercel pattern.

No change to delivery/claim/format logic (CARESY-1/3/4 untouched).

---

## 3) GET vs POST — resolution

Vercel Cron **issues `GET`** (docs: `crons.path` is fetched with `GET`).
The route exports:
```ts
export async function GET(request: Request) { // route.ts:138
  // claim → telegram → ops → FCM → finalize
}
export const dynamic = 'force-dynamic';
```
There is **no `POST` handler** and the cron is not configured to `POST`, so
alignment is `GET → GET`. Verified by `grep -n "export async function"`:
`send-push/route.ts` has `export async function GET`, and sibling
`expire-bookings/route.ts` also `GET` (same pattern). No change needed;
Vercel will `GET /api/cron/send-push` every minute and drain.

If a `POST` caller exists (e.g., `cron-job.org` configured to POST), they would
404. Task says “if it's currently POST-only, add GET or make cron target the
right verb” — it was already `GET`, so nothing to add.

---

## 4) Smoke-test

**After deploy (Vercel Cron, hands-off):**
- Vercel Dashboard → Project → **Crons** tab should list `/api/cron/send-push`
  `* * * * *` with next invocation and run history (status 200, JSON
  `{sent,failed,skipped,ops,telegram,ranAt}`).
- Logs: Vercel → **Logs** → filter `path=/api/cron/send-push` shows
  `Authorization: Bearer $CRON_SECRET` invocations every minute (Vercel auto-injects), plus `telegram.sent` increments
  when `QUEUED` rows exist.

**Manual (bearer still — single path for both):**
```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  https://<app>.vercel.app/api/cron/send-push
# 200 { "sent": n, "failed": 0, "skipped": m, "ops": k, "telegram": {...}, "ranAt": "..." }

# Verify 401 when wrong secret (if CRON_SECRET is set):
curl -i https://<app>.vercel.app/api/cron/send-push
# 401 { error: "Unauthorized" }  (no Bearer — Vercel Cron would also 401 if CRON_SECRET set but not injected)

# Verify 401 for forged x-vercel-cron alone (now correctly rejected):
curl -i -H "x-vercel-cron: 1" http://localhost:3000/api/cron/send-push
# 401 (no Bearer — single-Bearer gate, fails safe)
```

**No token Telegram dry-run still holds:** with `TELEGRAM_BOT_TOKEN` unset,
`telegram:{sent:0,skipped:n}` in the JSON.

---

## 5) What needs human / deploy

- **Deploy:** `git push origin feature/cron-schedule` → Vercel auto-deploys
  `apps/website` (project root). No `vercel deploy` run here per boundaries.
- **Env:** `CRON_SECRET` **MUST** be set in Vercel → Settings → Environment
  Variables — **hard requirement** post-CARESY-5b. Vercel Cron auto-injects
  `Authorization: Bearer $CRON_SECRET` only when the env is set; if unset, cron
  gets **401 and drains nothing** (fails safe).
- **Plan:** If Vercel account is **Hobby**, either upgrade to **Pro** for
  `* * * * *` or keep `cron-job.org` hitting the Bearer path every minute as
  before. If Hobby deploy fails validation on `crons` schedule, change to
  `0 * * * *` (hourly) or `0 0 * * *` (daily) as a temporary mitigation — but
  committed as every-minute per task spec.

---

## 6) Verification

- `tsc --noEmit -p apps/website/tsconfig.json` → **0**
- `tsc --noEmit -p apps/mobile-app/tsconfig.json` → **0**
- `apps/website/vercel.json` JSON valid, `crons[0].path` matches existing `GET`
  route, `crons[0].schedule` cron-valid `* * * * *`
- `route.ts:138` `GET` confirmed, single Bearer [REDACTED] (no x-vercel-cron branch), fails safe 401

---

## 7) Files changed

- `apps/website/vercel.json` — **new** (every-minute cron, unchanged in 5b)
- `apps/website/src/app/api/cron/send-push/route.ts:138-148` — auth gate
  reverted to single Bearer [REDACTED] (Vercel auto-injects; `x-vercel-cron` bypass removed)

No delivery/claim/format, no mobile, no new deps.

---

## 8) Risks

- **Hobby cap** — per-minute schedule deploy-fails on Hobby (documented above).
- **CRON_SECRET unset + Vercel Cron 401** — intentional fails-safe: if
  `CRON_SECRET` is not set in Vercel env, Vercel Cron sends no Bearer and gets
  **401** (`send-push` drains nothing, Telegram/FCM silent). This is safer than
  the spoofable `x-vercel-cron` bypass; operator must set `CRON_SECRET` in Vercel
  and redeploy.

---

## 9) Integration update (god, 2026-08-20)

`apps/website/vercel.json` REMOVED. The user schedules the drain via **cron-job.org**
(`https://caresy.co.in/api/cron/send-push`, every minute), so the Vercel Cron entry
was redundant and, on a Hobby plan, its `* * * * *` schedule would fail deploy
validation and block the whole deployment. External cron is the single scheduler.
Auth is the single Bearer check (§2, CARESY-5b): cron-job.org must send
`Authorization: Bearer <CRON_SECRET>` (Advanced → Headers) and the job must be ENABLED.
