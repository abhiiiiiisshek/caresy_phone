// When a chosen slot actually happens.
//
// Slots are Indian wall-clock: a 10:00 booking means a companion at the
// hospital at 10am in Noida, whoever booked it and wherever their phone's
// clock is set. `new Date("2026-11-05T10:00")` parses as DEVICE-local, so a
// family member booking from Dubai or New Jersey silently moved the visit by
// their UTC offset — and the booking list, which formats in Asia/Kolkata,
// then showed them a time they never picked.
//
// India has had one offset since 1945 and no DST, so the fixed +05:30 is a
// fact rather than a simplification.
export const IST_OFFSET = '+05:30';

/** A "YYYY-MM-DD" date and an "HH:MM" slot as the instant they denote in IST. */
export function istSlotToDate(dateIso: string, timeHHMM: string): Date {
  return new Date(`${dateIso}T${timeHHMM}:00${IST_OFFSET}`);
}
