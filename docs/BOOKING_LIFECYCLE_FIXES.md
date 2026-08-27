# Booking lifecycle fixes — implementation brief

_Source: two audits of the Companion Portal / booking lifecycle (UI-sync audit + deep business-logic audit). This file is the actionable follow-up — read it standalone, it does not assume you saw the audit conversation. No code has been written yet; this is the spec._

**Target repo: `caresy_structured_worktree` (branch `feature/mobile-auth-polish` at time of writing).** The audits underlying this brief were run against a sibling clone of the same GitHub repo; before writing this file, every migration and admin-app file referenced below was re-diffed against `caresy_structured_worktree` and confirmed **byte-identical** — line numbers are accurate as written. The one exception is `apps/companion/src/app/page.tsx`, which has moved on since the audit (trip-status control, care-event form, driving-licence gate added) — Phase 5 below uses the current line numbers from this repo, re-read directly.

Read `CLAUDE.md` and `AGENTS.md` at the repo root before starting — they define the stack, naming, migration, and testing conventions this brief follows. In particular: migrations are `NN_TOPIC.sql`, sequential, idempotent, **never edited after they run** (fix forward with a new file), and end in `ASSERT`/`RAISE`-based self-checks. Money is integer paise. Every `SECURITY DEFINER` function pins `SET search_path = public`. Run the full post-change workflow (`npx tsc --noEmit`, `npm run lint -w @caresy/<app>`, self-checks, `npm run build -w @caresy/<app>`, `graphify update .`) after each phase, not just at the end — each phase should be independently green before starting the next.

Next migration number is **37** in this repo — `34_SECURITY_HARDENING.sql`, `35_TRIP_NOTIFICATIONS.sql`, `36_NOTIFICATIONS_CLAIM.sql` already exist and were checked: none overlap this brief's scope (they harden `is_admin()`/`trips`, add trip-status customer notifications, and fix a send-push double-claim race — all real, all unrelated to `bookings.status` transitions). Do not renumber or touch them.

---

## Why this exists

The booking lifecycle (`bookings.status`: `DRAFT/PENDING/ASSIGNED/ACCEPTED/IN_PROGRESS/COMPLETED/CANCELLED/EXPIRED`) has **no DB-level state-machine enforcement**. Two existing, legitimate write paths can set any status to any other status with zero validation:

1. The admin ops board's plain `UPDATE` (`apps/admin/src/app/ops/page.tsx:182-186`) — the RLS policy `"Users and admins can update bookings"` (`supabase/migrations/SUPABASE_SCHEMA.sql:184-187`) has `USING` but **no `WITH CHECK`**.
2. A companion's own `UPDATE` on their assigned job — `"Assigned companion updates own job"` (`supabase/migrations/13_LIFECYCLE.sql:160-164`) has no status predicate at all.

Concretely, today, either path can: reach `COMPLETED` without ever running `complete_booking()` (leaving `payment_status` stuck at `UNBILLED` forever, `actual_start_time`/`billed_minutes`/`final_amount_paise` all `NULL`), jump `PENDING → COMPLETED` directly, or un-cancel/un-expire a booking by accident. This is the root cause behind most of the "stale/inconsistent booking" symptoms found in both audits — UI freshness fixes alone do not close it.

Everything below is scoped, file-located, and ordered by priority. Work top to bottom; later phases depend on earlier ones existing.

---

## Phase 0 (URGENT — fix before anything else) — `accept()` is currently broken for every companion

**Found while re-verifying this brief against the current repo — not part of the original two audits, but it blocks the entire job-acceptance flow right now, so it comes first.**

`apps/companion/src/app/page.tsx:698-708` (`accept`, added in commit `620e937` "CARESY-7: companion portal full lifecycle — drive guard, trip state machine, broadcast location + care events"):

```ts
const accept = async (job: JobRow) => {
  if (!user) return;
  setActioning(job.id);
  const supabase = createClient();
  const { error: stampErr } = await supabase.rpc('stamp_companion_on_booking', { p_booking: job.id, p_companion: user.id });
  if (stampErr) { setActioning(null); alert(stampErr.message.includes('cannot drive') ? 'You need a verified driving licence before you can accept a driving job.' : stampErr.message); return; }
  const { error } = await supabase.from('bookings').update({ status: 'ACCEPTED' }).eq('id', job.id);
  setActioning(null);
  if (error) { alert(error.message); return; }
  await fetchJobs();
};
```

This calls `supabase.rpc('stamp_companion_on_booking', { p_booking, p_companion })` unconditionally, for every accept — not just driving jobs. The **only** function by that name is `public.stamp_companion_on_booking()` in `supabase/migrations/30_LAUNCH_FIXES.sql:67` — zero arguments, `RETURNS TRIGGER`, only usable attached to a trigger. PostgREST cannot expose a trigger function as an RPC at all; calling `supabase.rpc('stamp_companion_on_booking', {...})` will fail with a "could not find the function in the schema cache" error every time. **Every companion accept attempt currently fails at this line**, before the actual status update even runs. Confirmed not documented in `docs/CURRENT.md`.

The evident intent (matching the error-message mapping in the same block, and the commit message's "drive guard") was a pre-flight check: verify the companion is allowed to take this job (driving-licence gate for `transport_mode='CUSTOMER_VEHICLE'` jobs) before attempting the accept, so the UI can show a friendly message instead of surfacing the raw RLS/trigger exception from `guard_drive_assignment()` (`27_TRANSPORT.sql:78-96`).

**Fix — new file: `supabase/migrations/37_STAMP_COMPANION_PREFLIGHT.sql`** (this is now first in the sequence; the phases originally numbered 1-3 below shift to 38-40):

```sql
-- A second overload, distinct from the zero-arg trigger function of the same
-- name in 30_LAUNCH_FIXES.sql (Postgres resolves by argument count/types, so
-- both coexist safely). This one is a real RPC: a pre-flight check the
-- companion portal calls before attempting to accept a job, so a driving-
-- licence rejection surfaces as a friendly message instead of the raw
-- guard_drive_assignment() trigger exception.
CREATE OR REPLACE FUNCTION public.stamp_companion_on_booking(p_booking UUID, p_companion UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_booking bookings%ROWTYPE;
BEGIN
    IF p_companion IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
        RAISE EXCEPTION 'Only the companion themselves may run this check';
    END IF;

    SELECT * INTO v_booking FROM bookings WHERE id = p_booking AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.transport_mode = 'CUSTOMER_VEHICLE' AND NOT companion_may_drive(p_companion) THEN
        RAISE EXCEPTION 'cannot drive: licence not verified';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_companion_on_booking(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stamp_companion_on_booking(UUID, UUID) TO authenticated;

DO $check$
BEGIN
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'stamp_companion_on_booking' AND pronargs = 2
    ), 'stamp_companion_on_booking(uuid,uuid) preflight overload must exist';
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'stamp_companion_on_booking' AND pronargs = 0
    ), 'the original zero-arg trigger function must still exist — this migration adds an overload, it does not replace it';
END $check$;
```

No app-code change needed — `page.tsx:702`'s existing call now resolves correctly against this new overload. **Verify**: apply the migration, then have a non-driving-licenced companion attempt to accept a `CUSTOMER_VEHICLE` job (should get the friendly "verified driving licence" alert) and a non-driving job (should accept normally). This alone unblocks manual testing of everything else in this brief.

---

## Phase 1 (Critical) — DB-level state machine

**New file: `supabase/migrations/38_BOOKING_STATE_MACHINE.sql`**

Create a transition-validity function and a `BEFORE UPDATE` trigger that enforces it on every write to `bookings`, no exceptions — including admin. Legal transitions (derived from what the existing RPCs already assume, so this codifies current intent rather than changing behavior for any sanctioned path):

```
DRAFT       -> PENDING, CANCELLED
PENDING     -> ACCEPTED, ASSIGNED, CANCELLED, EXPIRED
ASSIGNED    -> ACCEPTED, CANCELLED
ACCEPTED    -> IN_PROGRESS, CANCELLED
IN_PROGRESS -> COMPLETED                    -- no CANCELLED: matches cancel_booking's existing block on IN_PROGRESS+
COMPLETED   -> (none)
CANCELLED   -> (none)
EXPIRED     -> (none)
same -> same is always legal (no-op writes, e.g. a metadata-only update that leaves status unchanged, must not be rejected)
```

```sql
CREATE OR REPLACE FUNCTION public.is_valid_booking_transition(
    p_old booking_status_enum, p_new booking_status_enum
) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT p_old = p_new OR (p_old, p_new) IN (
        ('DRAFT','PENDING'), ('DRAFT','CANCELLED'),
        ('PENDING','ACCEPTED'), ('PENDING','ASSIGNED'), ('PENDING','CANCELLED'), ('PENDING','EXPIRED'),
        ('ASSIGNED','ACCEPTED'), ('ASSIGNED','CANCELLED'),
        ('ACCEPTED','IN_PROGRESS'), ('ACCEPTED','CANCELLED'),
        ('IN_PROGRESS','COMPLETED')
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_booking_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF current_setting('caresy.admin_override', true) = 'on' THEN
            RETURN NEW;  -- reason is required by admin_override_booking_status(), enforced there
        END IF;

        IF NOT is_valid_booking_transition(OLD.status, NEW.status) THEN
            RAISE EXCEPTION 'Illegal booking status transition: % -> %', OLD.status, NEW.status;
        END IF;

        -- COMPLETED must only be reached through complete_booking(), which computes
        -- the bill. Closes the "COMPLETED with UNBILLED forever" gap.
        IF NEW.status = 'COMPLETED' AND current_setting('caresy.billing', true) IS DISTINCT FROM 'on' THEN
            RAISE EXCEPTION 'Use complete_booking() to complete a visit';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_booking_transition ON bookings;
CREATE TRIGGER trg_enforce_booking_transition
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION enforce_booking_transition();
```

Then add the admin escape hatch — a single audited RPC replacing the raw dropdown `UPDATE` for **status-only** admin corrections (companion reassignment gets its own RPC in Phase 2, do not conflate the two):

```sql
CREATE OR REPLACE FUNCTION public.admin_override_booking_status(
    p_booking UUID, p_status booking_status_enum, p_reason TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Admin only';
    END IF;
    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'A reason is required for a manual status override';
    END IF;

    PERFORM set_config('caresy.admin_override', 'on', true);
    IF p_status = 'COMPLETED' THEN
        PERFORM set_config('caresy.billing', 'on', true);  -- admin override may also reach COMPLETED
    END IF;

    UPDATE bookings SET
        status = p_status,
        service_metadata = COALESCE(service_metadata, '{}'::jsonb)
            || jsonb_build_object('adminOverrideAt', NOW(), 'adminOverrideBy', auth.uid(), 'adminOverrideReason', p_reason)
    WHERE id = p_booking AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_override_booking_status(UUID, booking_status_enum, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_override_booking_status(UUID, booking_status_enum, TEXT) TO authenticated;
```

End the migration with a self-check in the style of `29_FIX_AUDIT_RLS.sql` / `26_BILLING.sql`'s `ASSERT` blocks — verify the function and trigger exist, and that the transition table itself is internally consistent (every enum value appears, no transition to/from a value the enum doesn't have — the `IN (...)` list is static so this is just a legibility check, not a dynamic one):

```sql
DO $check$
BEGIN
    ASSERT is_valid_booking_transition('PENDING','ACCEPTED'), 'PENDING->ACCEPTED must stay legal';
    ASSERT is_valid_booking_transition('IN_PROGRESS','COMPLETED'), 'IN_PROGRESS->COMPLETED must stay legal';
    ASSERT NOT is_valid_booking_transition('PENDING','COMPLETED'), 'PENDING->COMPLETED must be rejected';
    ASSERT NOT is_valid_booking_transition('COMPLETED','PENDING'), 'terminal states must not be reversible';
    ASSERT NOT is_valid_booking_transition('CANCELLED','ACCEPTED'), 'CANCELLED must be terminal';
    ASSERT is_valid_booking_transition('ACCEPTED','ACCEPTED'), 'same-status no-op writes must stay legal';
END $check$;
```

**App-code change required in the same phase** (the trigger above will otherwise break the existing admin dispatch board the moment it ships): `apps/admin/src/app/ops/page.tsx`

- The `save()` function (currently ~line 155-193) sends `status`, `companion_user_id`, and `service_metadata` in one raw `.update(...)`. Split it:
  - If `edit.status !== booking.status` (a real status change): call `supabase.rpc('admin_override_booking_status', { p_booking: bookingId, p_status: edit.status, p_reason: <new required reason field> })`. Add a `<textarea>`/`<input>` for the reason next to the status dropdown — the RPC will reject an empty reason, so the UI must collect one before allowing Save when status changed.
  - `companion_user_id` changes go through `reassign_booking()` from Phase 2 instead — do not send it in a plain update anymore.
  - If only `service_metadata` or other non-guarded fields changed, the existing plain `.update()` remains fine (the new trigger only fires extra logic when `status` changes).
- Read the existing `STATUS_OPTIONS` array (`ops/page.tsx:14-23`) — no change needed there, but note the UI can now legitimately show a "transition not allowed" error surfaced from the RPC; make sure the existing error-toast path (`show(err.message,'err')` pattern used elsewhere in this file, see `payments/page.tsx` for the established pattern) displays `err.message` from a failed RPC call, not a generic "save failed."

**Verify**: `npx tsc --noEmit` and `npm run build -w @caresy/admin` after the ops board change. Manually walk: accept a job as a companion (should still work, unaffected), try (via direct `supabase.rpc` in a scratch script, or the psql console) `UPDATE bookings SET status='COMPLETED' WHERE id=<any PENDING booking>` as a non-admin/non-billing session — must now raise. Try the admin override RPC with an empty reason — must raise. Try it with a reason on a real booking — must succeed and the `service_metadata.adminOverrideReason` must be visible on the row afterward.

---

## Phase 2 (Critical) — Reassignment as a first-class RPC

**New file: `supabase/migrations/39_BOOKING_REASSIGNMENT.sql`**

Today, reassigning a companion is a bare `companion_user_id` column swap with two consequences nothing currently handles: (a) the *old* companion is never notified they lost the job, and (b) if the booking is already `IN_PROGRESS`, the *new* companion inherits the old companion's `actual_start_time`, so `complete_booking()` later bills/credits them for time they didn't work.

```sql
CREATE OR REPLACE FUNCTION public.reassign_booking(
    p_booking UUID, p_new_companion UUID, p_reason TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_booking bookings%ROWTYPE;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admin may reassign a booking';
    END IF;

    SELECT * INTO v_booking FROM bookings WHERE id = p_booking AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.status NOT IN ('PENDING','ASSIGNED','ACCEPTED','IN_PROGRESS') THEN
        RAISE EXCEPTION 'Cannot reassign a % booking', v_booking.status;
    END IF;

    IF v_booking.companion_user_id IS NOT DISTINCT FROM p_new_companion THEN
        RETURN;  -- idempotent no-op
    END IF;

    PERFORM set_config('caresy.admin_override', 'on', true);
    UPDATE bookings SET
        companion_user_id = p_new_companion,
        -- The new companion's clock starts now — do not bill/credit them for the
        -- outgoing companion's time. Product decision: reset, not split-bill.
        actual_start_time = CASE WHEN v_booking.status = 'IN_PROGRESS' THEN NOW() ELSE actual_start_time END,
        service_metadata = COALESCE(service_metadata, '{}'::jsonb) || jsonb_build_object(
            'reassignedAt', NOW(), 'reassignedFrom', v_booking.companion_user_id, 'reassignReason', p_reason
        )
    WHERE id = p_booking;

    IF v_booking.companion_user_id IS NOT NULL THEN
        INSERT INTO notifications (booking_id, recipient_role, recipient_user_id, event, title, body)
        VALUES (p_booking, 'COMPANION', v_booking.companion_user_id, 'BOOKING_REASSIGNED',
                'Visit reassigned',
                'This visit has been reassigned to another companion.' ||
                CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END);
    END IF;

    IF p_new_companion IS NOT NULL THEN
        INSERT INTO notifications (booking_id, recipient_role, recipient_user_id, event, title, body)
        VALUES (p_booking, 'COMPANION', p_new_companion, 'BOOKING_ASSIGNED_TO_YOU',
                'New visit assigned', 'A visit has been assigned to you.');
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reassign_booking(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reassign_booking(UUID, UUID, TEXT) TO authenticated;

DO $check$
BEGIN
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'reassign_booking' AND pronargs = 3
    ), 'reassign_booking must exist';
END $check$;
```

**App-code**: `apps/admin/src/app/ops/page.tsx` — the companion-assignment dropdown's write path (currently folded into the same `save()` as status, `:182-186`) must call `supabase.rpc('reassign_booking', { p_booking: bookingId, p_new_companion: edit.companionId || null, p_reason: <optional reason input, reuse or separate from the status-override reason field> })` instead of sending `companion_user_id` in the plain update from Phase 1.

**Verify**: reassign an `IN_PROGRESS` test booking from companion A to companion B, confirm `actual_start_time` moved to the reassignment time (not A's original start), confirm a `COMPANION`-role notification row exists for A with event `BOOKING_REASSIGNED`, confirm `complete_booking()` afterward bills only B's post-reassignment time.

---

## Phase 3 (High) — Close the two concurrency races

**New file: `supabase/migrations/40_BOOKING_RACE_FIXES.sql`**

Two independent fixes, both `CREATE OR REPLACE FUNCTION` redefinitions (never edit the original migration files):

**3a. `complete_booking()` — add row lock, close the double-tap overwrite race.**
Current code (`26_BILLING.sql:134`) does `SELECT * INTO v_booking FROM bookings WHERE id = p_booking AND deleted_at IS NULL;` with no lock, then updates later — two near-simultaneous calls can both pass the "already COMPLETED" idempotency check before either commits, and the second silently overwrites the first's `billed_minutes`/`final_amount_paise` with its own (later) numbers. Redefine with `FOR UPDATE` added to the read:

```sql
CREATE OR REPLACE FUNCTION public.complete_booking(p_booking UUID)
RETURNS TABLE (final_amount_paise INTEGER, billed_minutes INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_booking  bookings%ROWTYPE;
    v_minutes  INTEGER;
    v_evening  INTEGER;
    v_total    INTEGER;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.companion_user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
        RAISE EXCEPTION 'Only the assigned companion may complete this booking';
    END IF;

    IF v_booking.status = 'COMPLETED' THEN
        RETURN QUERY SELECT v_booking.final_amount_paise, v_booking.billed_minutes;
        RETURN;
    END IF;

    IF v_booking.actual_start_time IS NULL THEN
        RAISE EXCEPTION 'Start the job before completing it';
    END IF;

    v_minutes := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - v_booking.actual_start_time)) / 60.0))::INTEGER;
    v_evening := COALESCE((v_booking.service_metadata ->> 'eveningSurchargePaise')::INTEGER, 0);
    IF v_evening NOT IN (0, 9900) THEN
        v_evening := 0;
    END IF;
    v_total := price_for_minutes(v_minutes) + v_evening;

    PERFORM set_config('caresy.billing', 'on', true);
    UPDATE bookings SET
        status = 'COMPLETED', actual_end_time = NOW(), billed_minutes = v_minutes,
        final_amount_paise = v_total, payment_status = 'PENDING'
    WHERE id = p_booking;

    RETURN QUERY SELECT v_total, v_minutes;
END;
$$;
```
(`FOR UPDATE` at the read means the second concurrent call now blocks *before* computing anything, then re-reads the row post-commit and correctly hits the idempotent early-return — closing the race properly instead of racing to overwrite.)

**3b. `reschedule_booking()` — stop the race against the 5-minute expiry sweep.**
Current code (`31_CUSTOMER_ACTIONS.sql:81-142`) reads `status` once with no lock, then writes `scheduled_start_time`/`expires_at` unconditionally by `id` alone with no re-check — `expire_stale_bookings()` (cron, every 5 min) can flip the row to `EXPIRED` in between, producing a booking that says `EXPIRED` but has a freshly-future `expires_at`, invisible to both the companion feed and admin's status-filtered board forever after. Read the full current function body from `31_CUSTOMER_ACTIONS.sql:81-142` first (needed for the surrounding validation you must preserve — lead-time check, 90-day window, the `service_metadata.rescheduledFrom` stamp), then redefine it with:
- `FOR UPDATE` added to the initial `SELECT ... INTO v FROM bookings WHERE id = p_booking ...`.
- The final `UPDATE` gets `AND status IN ('PENDING','ACCEPTED','ASSIGNED')` appended to its `WHERE id = p_booking` clause (matching the function's own precondition check).
- After the `UPDATE`, `GET DIAGNOSTICS` the row count; if zero, `RAISE EXCEPTION 'This visit changed status and can no longer be rescheduled — refresh and try again'` instead of silently returning success.

End the migration with the standard self-check block confirming both functions still exist and are `SECURITY DEFINER`.

**Verify**: for 3a, no easy automated concurrency test in SQL — note in the migration comment that this was validated by code review of the lock semantics (standard Postgres `FOR UPDATE` blocking behavior), not a runtime test. For 3b, manually reproduce is impractical (needs a 5-min cron race); instead write a `packages/utils`-side note or just verify by reading the redefined function that the `WHERE` clause and row-count check are present exactly as specified.

---

## Phase 4 (High) — Payment and suspension guards (app-code only, no migration needed for the first two)

**4a. Waive can currently overwrite an already-COLLECTED payment.** `apps/admin/src/app/payments/page.tsx:146-149` — the `waive()` callback issues `supabase.from('bookings').update({payment_status:'WAIVED'}).eq('id', id)` with no state guard; only the UI conditionally shows the button when `payment_status==='PENDING'` (`:259`), which a second stale tab or a race doesn't protect. Add `.eq('payment_status', 'PENDING')` to the query:
```ts
const { error: err, count } = await supabase
  .from('bookings')
  .update({ payment_status: 'WAIVED' })
  .eq('id', id)
  .eq('payment_status', 'PENDING');
```
If you want a harder guarantee than "0 rows affected, no error" (Supabase's default `.update()` doesn't surface a 0-row match as an error), switch to a small `waive_payment(p_booking uuid)` RPC mirroring `record_payment()`'s own-state check (`26_BILLING.sql:184-219` is the pattern to copy) so a race gets an explicit exception instead of a silent no-op. Prefer the RPC — it's a small addition and it closes the gap properly rather than relying on the client checking `count`.

**4b. Suspending/rejecting a companion never checks for their live assignments.** `apps/admin/src/app/companions/page.tsx:108-134` (`applyStatus`). Before calling `applyStatus` with `status IN ('SUSPENDED','REJECTED')`, query `bookings` for `companion_user_id = companion.id AND status IN ('ACCEPTED','IN_PROGRESS')`. If any exist, show a confirm dialog listing them (reference codes are enough) and require an explicit second confirmation before proceeding — do not silently block, since a legitimate suspension might still need to go through (e.g. safety issue) while ops decides what to do with the live job separately. This is UI-only; no RLS/DB change required for this phase (RLS tightening to also revoke live-job access on suspension is a separate, larger decision — see "Deferred" below, do not do it in this pass without checking with the user first, since it changes what an already-suspended companion can do mid-visit and could strand a customer).

**Verify**: `npx tsc --noEmit` + `npm run build -w @caresy/admin`. Manually: waive a `PENDING` payment (should work), attempt to waive an already-`COLLECTED` row via a direct `supabase.rpc`/API call bypassing the UI (should now fail). Suspend a companion with zero active jobs (should proceed silently as today); suspend one with an active job (should show the warning).

---

## Phase 5 (Medium) — Companion Portal sync (from the first audit, still open)

These were already scoped and approved in the prior UI-sync audit; listed here for completeness so this file is the single source of truth for "what's left". **Line numbers below are re-verified against the current `caresy_structured_worktree` copy of `page.tsx` (939 lines; it gained `TripStatusControl`/`CareEventForm`/driving-gate code since the audit) — do not reuse line numbers from anywhere else in this doc's earlier drafts.**

- **Shared `BookingStatus` type.** Add to `packages/types/src/index.ts` (confirmed unchanged from the audited copy):
  ```ts
  export type BookingStatus = 'DRAFT'|'PENDING'|'ASSIGNED'|'ACCEPTED'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'|'EXPIRED';
  ```
  Type `status` against it in `apps/companion/src/app/page.tsx` (the `STATUS_LABEL` map at `:405-407` and the bucket arrays `activeMine`/`pastMine` at `:732-735`), `apps/admin/src/app/ops/page.tsx:14-23`, `apps/admin/src/app/analytics/page.tsx:16`, `apps/admin/src/app/page.tsx:43` (all four admin/companion files confirmed byte-identical to the audited copy, only their line numbers relative to `packages/types` changed because `page.tsx` itself grew — the admin files' own internal line numbers are unchanged). Make the companion portal's active/history split exhaustive (e.g. a `switch` with a `never`-typed default, or explicitly listing all 8 values across both buckets) instead of an allow-list that silently drops any unmatched status from the UI.
- **Freshness poll.** `apps/companion/src/app/page.tsx` has no interval refetch at all — `fetchJobs` (`:654-664`) only runs on mount (`:666`) and after this companion's own mutation. Mirror `apps/mobile-app/app/my-bookings.tsx:83-88`'s pattern: `setInterval` re-running `fetchJobs()` every 60s, gated to only run while the companion has a live (`ACCEPTED`/`IN_PROGRESS`) job, matching the established codebase convention (also used in `apps/admin/src/app/live/page.tsx` at 10s). This closes staleness for cancellation, reschedule, and reassignment all at once, since it's a full-row refetch, not a status-diff.
- **In-app notification list.** `apps/companion` has zero notification UI and zero push-token registration — `COMPANION`-role rows from `cancel_booking`/`reschedule_booking`/the new `reassign_booking` (Phase 2) currently have no delivery path to a portal user at all. Add a small panel reading `notifications WHERE recipient_role='COMPANION' AND recipient_user_id = auth.uid() ORDER BY created_at DESC LIMIT 20` — cheaper than building full web-push, and it doubles as a freshness signal.
- **0-row accept/status-change race handling — now confirmed as a real gap, not just suspected.** `setJobStatus` (`apps/companion/src/app/page.tsx:688-696`) does `const { error } = await supabase.from('bookings').update({ status, ...extra }).eq('id', job.id); if (error) { alert(error.message); return; }` — a lost race (job already taken/expired/reassigned) makes the `UPDATE` match 0 rows, which Supabase reports as **no error**, so the code falls through to `await fetchJobs()` with no message shown at all; the user only learns something happened when the job silently disappears/changes on the next render. `accept()` (`:698-708`, see Phase 0 above) has the same shape for its own final `UPDATE` at `:704`. Fix both: check `data`/`count` from the update response and show an explicit "this job is no longer available — refreshing" message when 0 rows come back, instead of silently falling through to a refetch.

---

## Deferred — needs a product decision, do not implement without checking in first

- **B6 — billing rate isn't snapshotted per booking** (`price_for_minutes()` in `26_BILLING.sql` reads the current function definition, not a rate stored on the row at booking/start time — the evening surcharge IS snapshotted, by contrast, so this is an intentional-looking asymmetry worth confirming with the team before "fixing"). Only matters the day a rate migration actually ships; low urgency.
- **B8 — payments page hard-excludes `UNBILLED` bookings** (`apps/admin/src/app/payments/page.tsx:102`). Downstream of Phase 1 — once the state machine ships, a `COMPLETED`+`UNBILLED` zombie can no longer be created, so this may not need its own fix. Re-check after Phase 1 lands before touching it.
- **Suspended-companion RLS tightening.** Phase 4b only adds an admin-facing warning; it does not revoke a suspended companion's DB-level access to a job already in their hands. Whether that access *should* be revoked (and what happens to the customer if it is, mid-visit) is a business-rule decision, not a code-correctness one — raise it explicitly before changing RLS.
- **Rate-limit / stuck-`IN_PROGRESS` sweep**, **`payment_status` ↔ `status` CHECK/trigger invariant**, **public tracking `share_token` behavior across reassignment** (not independently verified in the audit — check `supabase/migrations/22_PUBLIC_TRACKING.sql` and `18_BOOKING_TRIP_LINK.sql`'s `trips` linkage before assuming this is fine) — architectural follow-ups, not scoped in detail here.

---

## Order of work

Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5. Phase 0 is a standalone urgent fix — do it first regardless of anything else, since without it no accept-flow testing for the later phases is even possible. Each phase's migration file must be applied (via the Supabase SQL editor, per this repo's manual-migration convention — there is no migration runner) and smoke-tested before the next phase's app code is written against it, since later phases call RPCs the earlier phases create. Do not skip the self-check `ASSERT` blocks — this repo's own convention (`docs/CURRENT.md`) is that they exist so a broken migration fails loudly in the SQL editor rather than half-applying.

After all phases: update `docs/CURRENT.md` (move this from "in flight" once shipped) and `docs/DATABASE.md` (new functions/triggers) in the same pass, per `CLAUDE.md`'s post-change workflow.
