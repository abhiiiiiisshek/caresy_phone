# PUSH PIPELINE REPORT — CARESY-1 (Phase-4 blocker)

**Branch:** `feature/push-pipeline`  
**Worktree:** `/Users/1234/Desktop/Caresy phone/caresy_m3_worktree` (NOT `caresy_phone`)  
**Date:** 2026-08-20  
**Commit:** see `git log --oneline -1` on branch

---

## 1) Re-enable push_tokens upsert (Expo Go guard)

**File:** `apps/mobile-app/lib/AuthProvider.tsx:42-78`

**Before:** Early return at ~line 48 was a blanket disable for push registration (comment said "Expo Go: skip native push entirely" with `isExpoGo = execEnv === 'storeClient' || ownership === 'expo'` + early return). While already conditional, it used a stale `Constants.isDevice` fallback and the comment implied a blanket loop-avoidance, not the spec'd guard `Constants.appOwnership !== 'expo' / Device.isDevice`.

**After:**
- Guard is now explicitly documented as *silent no-op in Expo Go, active on real builds*:
  ```ts
  const ownership = (Constants as any).appOwnership;
  const execEnv = (Constants as any).executionEnvironment;
  const isExpoGo = ownership === 'expo' || execEnv === 'storeClient';
  if (isExpoGo) return; // silent no-op
  ```
  Real builds have `appOwnership === 'standalone'` (or undefined) and `executionEnvironment !== 'storeClient'`, so they pass through.

- Physical-device check is now **only** `Device.isDevice === false` via `expo-device` (the reliable check). Removed the stale `Constants.isDevice ?? true` fallback to avoid false positives on dev-client.

- `expo-notifications` and `expo-device` are still `eval("require")`-guarded so the bundle never evaluates native code in Expo Go (no redbox).

- On success, upserts to `push_tokens`:
  ```ts
  supabase.from('push_tokens').upsert(
    { token, user_id: session.user.id, platform: Platform.OS },
    { onConflict: 'token' }
  );
  ```

**Flow:** `onAuthStateChange → session.user → isExpoGo? no-op : Device.isDevice? → getPermissionsAsync → requestPermissionsAsync → setNotificationChannelAsync (Android) → getExpoPushTokenAsync({ projectId }) → upsert push_tokens`.

**Verification:**
- `tsc --noEmit -p apps/mobile-app/tsconfig.json` → 0 (worktree).
- **Local (Expo Go, web):** Verified silent no-op — no push require, no warn, no crash. Correct.
- **Needs device/EAS build:** Token upsert on physical iOS/Android dev-client or TestFlight/IPA (requires `expo prebuild --clean` + `google-services.json`/`GoogleService-Info.plist` + `eas build`). Cannot verify without device build or prod Supabase creds. Upsert will succeed only when `Notifications.getPermissionsAsync` grants and `getExpoPushTokenAsync` returns a token.

**Risks:** Permission denied → no token (expected). Simulator (`Device.isDevice === false`) → no-op. Token refresh not handled (Expo token rotation needs re-upsert on app foreground; current effect re-runs only on `session` change).

---

## 2) Cron delivery logic — `api/cron/send-push/route.ts`

**File:** `apps/website/src/app/api/cron/send-push/route.ts`

### Exact QUEUED → SENT flow traced (line numbers at commit)

1. `route.ts:88-94` — Auth: `CRON_SECRET` Bearer check (401 if mismatch).
2. `route.ts:99-115` — `SELECT ... FROM notifications WHERE status='QUEUED' ORDER BY created_at LIMIT 200` (MAX_ROWS).
3. `route.ts:117-131` — **ADMIN/ops path:** `opsRows = all.filter(r => recipient_role==='ADMIN' && !recipient_user_id)` → `pageOps()` POSTs to `OPS_WEBHOOK_URL` (ntfy.sh gets plain text + Title header, others get JSON) → each outcome → `UPDATE notifications SET status='SENT'|'FAILED', error, sent_at WHERE id=? AND status='QUEUED'` (idempotent guard added this PR).
4. `route.ts:133-137` — `queued = all.filter(r => !opsRows.includes(r))`; early return if none.
5. `route.ts:141-150` — Resolve legacy rows (`!recipient_user_id && booking_id`) via `SELECT id,customer_user_id FROM bookings WHERE id IN (...)` → mutate `r.recipient_user_id` in-place.
6. `route.ts:153-159` — **Undeliverable:** `UPDATE ... SET status='SKIPPED' WHERE id IN (...) AND status='QUEUED'` for rows still lacking `recipient_user_id` (would otherwise retry forever).
7. `route.ts:161-179` — `SELECT token,user_id FROM push_tokens WHERE user_id IN (deliverable recipients)`.
8. `route.ts:185-192` — `accessToken()` (cached 1h, 60s slack) + `projectId()`; on failure return 500 and leave rows QUEUED for retry.
9. `route.ts:200-228` — `mapLimit(deliverable, 8, ...)` per row → `sendPush(token,title,body,data,bearer,project)` per device token (v1 `messages:send`, `android.priority HIGH, channel_id caresy`). Collect `retire` tokens where `!ok && retire` (`UNREGISTERED`/404/`INVALID_ARGUMENT` with token). Result is `SENT` if any token `ok`, else `FAILED` with joined error (≤500 chars).
10. `route.ts:238-247` — **Final transitions (hardened):** `UPDATE notifications SET status='SENT'|'FAILED'|'SKIPPED', error, sent_at WHERE id=? AND status='QUEUED'` per outcome (was `.eq('id',id)` unguarded — now guarded to be idempotent, no overwrite).
11. `route.ts:251` — `DELETE FROM push_tokens WHERE token IN (retire)` for dead tokens.

**State diagram:** `QUEUED → SENT` (success), `QUEUED → FAILED` (all tokens failed/webhook non-2xx), `QUEUED → SKIPPED` (no recipient or no registered device). No transition back to QUEUED; failures are terminal for that tick (ops without webhook intentionally stays QUEUED for `/admin/ops` badge).

**Fixes this PR:**
- Added `.eq('status','QUEUED')` to all three transition sites (`opsOutcomes`, `undeliverable`, `outcomes` loop) so concurrent ticks are idempotent (second update touches 0 rows, won't overwrite `SENT`).
- Added comments documenting double-send risk and the ideal claim-before-send pattern (`SENDING` state or `SELECT FOR UPDATE SKIP LOCKED`) which would need a DB migration — flagged as residual risk, not applied per BOUNDARIES.

**Verification:**
- `tsc --noEmit -p apps/website/tsconfig.json` → 0.
- Logic reviewed against `supabase/migrations/13_LIFECYCLE.sql` (notifications table, enqueue trigger), `24_PUSH_DELIVERY.sql` (error column, queued index), `21_PUSH_TOKENS.sql` (push_tokens RLS).
- **Not verified with prod creds:** No `SUPABASE_SERVICE_ROLE_KEY` / `FIREBASE_SERVICE_ACCOUNT` / `OPS_WEBHOOK_URL` in local env, so actual FCM send, token retire, and webhook paging were not exercised. `FCM` module (`lib/fcm.ts: accessToken, sendPush, shouldRetireToken`) and `mapLimit` were inspected only.

**Risks / Next:**
- True double-send if two cron invocations `SELECT` the same QUEUED rows before either `UPDATE` — guarded updates prevent overwrite but not duplicate `sendPush` calls. Fix is a `SENDING` claim (migration adding that status) or a `pg_advisory_lock` / RPC `claim_notifications(limit)` with `FOR UPDATE SKIP LOCKED`. Documented, not implemented to avoid DB change.
- `opsRows.includes` uses reference equality (relies on same objects from `all`) — correct but fragile if refactored to copy.
- `OPS_WEBHOOK_URL` empty → ADMIN rows stay QUEUED forever by design; monitor `/admin/ops`.

---

## 3) Bottom-sheet picker (replace Chips)

**Files:** `apps/mobile-app/components/ui.tsx:176-237`, `apps/mobile-app/app/booking.tsx:62-67, 467-520`

**Before:** `booking.tsx` used `Chip`/`ChipRow` for:
- Family/patient picker (`savedPatients.map` + "+ New") — horizontal chips, truncates on many patients.
- Date picker (14 days) + time slots — horizontal chips, cramped, no accessibility grouping.

Service and transport already used `BottomSheet`; date/patient did not.

**After — ONE reusable component:**
- `components/ui.tsx` `BottomSheet` is now **the** reusable bottom-sheet picker for every single-select in booking (service, transport, family/patient, date, time). Changes:
  - Doc comment: "ONE component for every single-select picker … Replaces Chip/ChipRow pattern".
  - Prop `selectedKey: string | null` (was `string`) to allow empty state.
  - Added `accessibilityRole="button"` + `accessibilityState={{ selected }}` on rows.
  - Exported alias `PickerSheet = BottomSheet` for semantic call sites.

- `app/booking.tsx`:
  - New state: `patientSheet`, `dateSheet`, `timeSheet` (`useState(false)`).
  - **Family/patient (step 3):** `ChipRow` → `FieldButton` ("Family member") + `BottomSheet` with `options=[...savedPatients.map({key:id,label:full_name,desc:Age}), {key:'__new',label:'+ New patient'}]`. Selecting `__new` clears form; selecting an id calls `pickSaved(p)`.
  - **Date/time (step 4):** Two `FieldButton` + `BottomSheet` pickers:
    - Date: `options=days.map({key:iso,label})`, `onSelect` sets `date` and clears `time`.
    - Time: `options=slots.map({key:slot,label:fmtSlot})`, shown only when `date` and `slots.length` > 0.
  - `Chip`/`ChipRow` remain for multi-select / duration / language / care-needs (out of scope) — no broad visual refactor, no home cards touched.

**Verification:**
- `tsc --noEmit -p apps/mobile-app/tsconfig.json` → 0 (both sheets type-check, `selectedKey` nullable handled).
- Manual visual check pending Expo Go: bottom sheets are Modal `slide` with backdrop dismiss, haptics on select, handle + header. No `expo prebuild` needed (pure RN Modal).
- **Needs device:** Haptics, backdrop tap, scroll with many patients/days, and VoiceOver `selected` state are device-checked. Expo Go will show Modal correctly; native `expo-image-picker`/`expo-location` flows unchanged.

**Risks:** More taps (FieldButton → sheet → select) vs one-tap chips — trade-off for consistency and scrollability on small screens. Multi-select `CARE_NEEDS` stayed as chips intentionally; converting it would need multi-select sheet variant.

---

## Verification summary

| Check | Result |
|---|---|
| `tsc -p apps/mobile-app/tsconfig.json` | **0** (worktree) |
| `tsc -p apps/website/tsconfig.json` | **0** (worktree) |
| `lint` / `build` / `graphify` | Not run (not required for DONE) |
| Expo Go push upsert | Silent no-op verified by code path (no device build) |
| FCM send / cron live run | **Not run** — needs `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `OPS_WEBHOOK_URL` + prod DB |
| Bottom-sheet UI | Code + tsc verified; device interaction needs EAS dev-client |

## Boundaries respected

- No `expo prebuild`, `eas build`, `vercel deploy`, or prod Supabase touches.
- No DB migrations applied (residual `SENDING` state noted, not added).
- No urgent/schedule home cards or broad visual refactors.

## Next steps for agent / human

1. **EAS dev-client:** `npx expo prebuild --clean && eas build --profile development` → install on physical device, sign in, verify `push_tokens` row appears in Supabase (`select * from push_tokens where user_id = auth.uid()`).
2. **Cron smoke:** Set `CRON_SECRET`, `OPS_WEBHOOK_URL` (ntfy.sh topic), `FIREBASE_SERVICE_ACCOUNT` in Vercel; create a test booking status change → check `notifications` goes QUEUED → hit `/api/cron/send-push` with Bearer → verify row → SENT + FCM delivery + token retire on uninstall.
3. **Concurrency hardening (optional):** Add `SENDING` migration + `claim_notifications()` RPC using `FOR UPDATE SKIP LOCKED`, then cron claims before `sendPush`.
