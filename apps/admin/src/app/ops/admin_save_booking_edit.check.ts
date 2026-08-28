import assert from 'node:assert/strict';

// Self-check for migrations 41-42 admin_save_booking_edit transaction property.
// No DB: simulates the function body logic in-memory to verify that a
// failing companion reassignment leaves status unchanged (atomicity).

type Booking = { id: string; status: string; companion_user_id: string | null; transport_mode: string | null };

let bookings = new Map<string, Booking>();
let companions = new Map<string, { can_drive: boolean }>();

function reset() {
  bookings = new Map([
    ['b1', { id: 'b1', status: 'PENDING', companion_user_id: null, transport_mode: 'CUSTOMER_VEHICLE' }],
    ['b2', { id: 'b2', status: 'ACCEPTED', companion_user_id: 'c_old', transport_mode: 'CUSTOMER_VEHICLE' }],
  ]);
  companions = new Map([
    ['c_ok', { can_drive: true }],
    ['c_no_drive', { can_drive: false }],
    ['c_old', { can_drive: true }],
  ]);
}

function guardDriveAssignment(b: Booking, newCompanion: string | null) {
  if (b.transport_mode === 'CUSTOMER_VEHICLE' && newCompanion && !companions.get(newCompanion)?.can_drive) {
    throw new Error('This booking needs a companion with a verified, unexpired driving licence');
  }
}

function isValidTransition(oldS: string, newS: string): boolean {
  const allowed: Record<string, string[]> = {
    PENDING: ['ACCEPTED','ASSIGNED','CANCELLED','EXPIRED'],
    ACCEPTED: ['IN_PROGRESS','CANCELLED'],
    ASSIGNED: ['ACCEPTED','CANCELLED'],
    IN_PROGRESS: ['COMPLETED'],
  };
  if (oldS === newS) return true;
  return allowed[oldS]?.includes(newS) ?? false;
}

function adminOverrideStatus(p_booking: string, p_status: string, p_reason: string) {
  const b = bookings.get(p_booking)!;
  if (!p_reason || p_reason.trim() === '') throw new Error('A reason is required');
  if (!isValidTransition(b.status, p_status)) throw new Error(`Illegal transition ${b.status} -> ${p_status}`);
  b.status = p_status;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function reassignBooking(p_booking: string, p_new_companion: string | null, _p_reason: string | null) {
  const b = bookings.get(p_booking)!;
  if (b.companion_user_id === p_new_companion) return;
  guardDriveAssignment(b, p_new_companion);
  b.companion_user_id = p_new_companion;
}

// Simulates the transactional wrapper per migration 42 — explicit intent flags
// and FOR UPDATE lock (modeled as snapshot isolation here). Delegates to existing RPCs.
function adminSaveBookingEdit(
  p_booking: string,
  p_status: string | null,
  p_new_companion: string | null,
  p_reason: string | null,
  p_change_status: boolean,
  p_change_companion: boolean,
  isAdmin = true,
) {
  if (!isAdmin) throw new Error('Only admin may save booking edits');
  const snap = { ...bookings.get(p_booking)! };
  // FOR UPDATE would lock the row here — simulated by holding snap before any mutation
  try {
    if (p_change_status) {
      adminOverrideStatus(p_booking, p_status!, p_reason ?? '');
    }
    if (p_change_companion) {
      reassignBooking(p_booking, p_new_companion, p_reason);
    }
  } catch (e) {
    // Rollback whole transaction
    bookings.set(p_booking, snap);
    throw e;
  }
}

// Also simulate the old two-RPC non-transactional path for contrast
function oldTwoRpc(p_booking: string, p_status: string | null, p_new_companion: string | null, p_reason: string | null) {
  const cur = bookings.get(p_booking)!;
  const statusChanged = p_status != null && p_status !== cur.status;
  const companionChanged = p_new_companion !== cur.companion_user_id;
  if (statusChanged) {
    adminOverrideStatus(p_booking, p_status!, p_reason ?? '');
  }
  if (companionChanged) {
    reassignBooking(p_booking, p_new_companion, p_reason);
  }
}

// ---- Tests ----

reset();
// 1. status only — succeeds (explicit intent)
adminSaveBookingEdit('b1', 'ACCEPTED', null, 'ops override', true, false);
assert.equal(bookings.get('b1')!.status, 'ACCEPTED');
assert.equal(bookings.get('b1')!.companion_user_id, null);

reset();
// 2. companion only — succeeds
adminSaveBookingEdit('b1', null, 'c_ok', null, false, true);
assert.equal(bookings.get('b1')!.companion_user_id, 'c_ok');
assert.equal(bookings.get('b1')!.status, 'PENDING');

reset();
// 3. both succeed — both applied
adminSaveBookingEdit('b1', 'ACCEPTED', 'c_ok', 'assign + accept', true, true);
assert.equal(bookings.get('b1')!.status, 'ACCEPTED');
assert.equal(bookings.get('b1')!.companion_user_id, 'c_ok');

reset();
// 4. THE KEY PROPERTY (original direction): companion fails (no licence) must leave status unchanged
let threw = false;
try {
  adminSaveBookingEdit('b1', 'ACCEPTED', 'c_no_drive', 'try drive', true, true);
} catch (e) {
  threw = true;
  assert.match((e as Error).message, /licence/);
}
assert.equal(threw, true, 'should throw on unlicensed drive assignment');
assert.equal(bookings.get('b1')!.status, 'PENDING', 'status must be rolled back when companion fails');
assert.equal(bookings.get('b1')!.companion_user_id, null, 'companion must not be applied');

reset();
// 5. Old path demonstrably leaves half-save (status moved even though companion failed)
threw = false;
try {
  oldTwoRpc('b1', 'ACCEPTED', 'c_no_drive', 'try drive');
} catch {
  threw = true;
}
assert.equal(threw, true);
assert.equal(bookings.get('b1')!.status, 'ACCEPTED', 'old path leaks half-save — status moved');
assert.equal(bookings.get('b1')!.companion_user_id, null);

reset();
// 6. idempotent no-op — same companion, no throw (flag true but value equal -> reassign no-ops)
adminSaveBookingEdit('b2', null, 'c_old', null, false, true);
assert.equal(bookings.get('b2')!.companion_user_id, 'c_old');

reset();
// 7. non-admin blocked
threw = false;
try {
  adminSaveBookingEdit('b1', 'ACCEPTED', null, 'x', true, false, false);
} catch (e) {
  threw = true;
  assert.match((e as Error).message, /admin/);
}
assert.equal(threw, true);

reset();
// 8. NEW PROPERTY — would have caught the NULL-meaning bug: status-only save leaves companion untouched
// Simulates the real bug path: booking loaded as PENDING (no companion), companion self-accepts to c_old
// after load, operator changes only status. Old wrapper sent p_new_companion = edit.companionId || null = NULL
// which was distinct from c_old and unassigned them. New wrapper sends p_change_companion=false so reassign never runs.
bookings.set('b1', { id: 'b1', status: 'PENDING', companion_user_id: 'c_old', transport_mode: null });
adminSaveBookingEdit('b1', 'ACCEPTED', null, 'status only, companion should stay', true, false);
assert.equal(bookings.get('b1')!.status, 'ACCEPTED', 'status should advance');
assert.equal(bookings.get('b1')!.companion_user_id, 'c_old', 'status-only save must not touch companion — this is the bug that shipped in 41');

reset();
// 9. Explicit unassign — NULL only when p_change_companion=true means unassign
bookings.set('b1', { id: 'b1', status: 'ACCEPTED', companion_user_id: 'c_old', transport_mode: null });
adminSaveBookingEdit('b1', null, null, null, false, true);
assert.equal(bookings.get('b1')!.companion_user_id, null, 'explicit unassign (flag true + NULL) must clear companion');
assert.equal(bookings.get('b1')!.status, 'ACCEPTED', 'unassign must not touch status');

reset();
// 10. No-op when neither flag set — even if p_new_companion would otherwise look like a change, nothing happens
bookings.set('b1', { id: 'b1', status: 'PENDING', companion_user_id: 'c_old', transport_mode: null });
adminSaveBookingEdit('b1', 'ACCEPTED', null, 'ignored', false, false);
assert.equal(bookings.get('b1')!.status, 'PENDING', 'without p_change_status, status must stay');
assert.equal(bookings.get('b1')!.companion_user_id, 'c_old', 'without p_change_companion, companion must stay');

console.log('all checks passed');
