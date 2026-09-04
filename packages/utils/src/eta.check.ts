// node --experimental-strip-types src/eta.check.ts
import assert from 'node:assert/strict';

import { ETA_MAX_SECONDS, etaSentence, formatEta } from './eta.ts';

// ---- the boundaries the wording turns on ----
assert.equal(formatEta(0), 'less than a minute');
assert.equal(formatEta(59), 'less than a minute');
assert.equal(formatEta(60), '1 min');
assert.equal(formatEta(3540), '59 min');
// 3599s ceils to 60 minutes, which is an hour — "60 min" would be arithmetic
// the reader has to do.
assert.equal(formatEta(3599), '1 h');
assert.equal(formatEta(3600), '1 h');
assert.equal(formatEta(4800), '1 h 20 min');

// ---- nothing honest to say ----
for (const bad of [null, undefined, NaN, Infinity, -1, ETA_MAX_SECONDS + 1]) {
  assert.equal(formatEta(bad as number), null, `${bad} should render nothing`);
}
assert.notEqual(formatEta(ETA_MAX_SECONDS), null);

// ---- properties, not just examples ----

// Never rounds DOWN past the real duration. A "1 min" that still has 59s to run
// is the failure this exists to prevent, so the rendered minutes must always be
// at least the true minutes.
for (let s = 60; s <= ETA_MAX_SECONDS; s += 37) {
  const out = formatEta(s)!;
  const h = /(\d+) h/.exec(out);
  const m = /(\d+) min/.exec(out);
  const renderedMins = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  assert.ok(renderedMins * 60 >= s, `${s}s rendered as ${out}, which is early`);
  // ...and never more than a minute pessimistic, or it stops being an estimate.
  assert.ok(renderedMins * 60 - s < 60, `${s}s rendered as ${out}, which is late`);
}

// Monotonic: a longer wait never reads as a shorter one.
let prev = -1;
for (let s = 0; s <= ETA_MAX_SECONDS; s += 53) {
  const out = formatEta(s);
  assert.ok(out !== null);
  const h = /(\d+) h/.exec(out);
  const m = /(\d+) min/.exec(out);
  const mins = out === 'less than a minute' ? 0 : (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  assert.ok(mins >= prev, `${s}s went backwards`);
  prev = mins;
}

// No "0 min" and no bare "0 h" anywhere in the range.
for (let s = 0; s <= ETA_MAX_SECONDS; s += 11) {
  const out = formatEta(s)!;
  assert.ok(!/\b0 (min|h)\b/.test(out), `${s}s rendered as "${out}"`);
}

// ---- the sentence ----
assert.equal(etaSentence(600, 'pickup'), 'About 10 min away');
assert.equal(etaSentence(30, 'pickup'), 'Arriving in less than a minute');
assert.equal(etaSentence(600, 'destination'), 'About 10 min from the hospital');
assert.equal(etaSentence(30, 'destination'), 'Less than a minute from the hospital');
// The bare phrase must never be pasted into a quantity sentence.
for (const t of ['pickup', 'destination', null]) {
  const out = etaSentence(30, t)!;
  assert.ok(!/less than a minute away/.test(out), out);
  assert.ok(!/About less than/.test(out), out);
}
// An unknown or missing target is worded as the approach, which is the only
// stage the client asks about today.
assert.equal(etaSentence(600, null), 'About 10 min away');
// No duration, no sentence — never a bare "About away".
assert.equal(etaSentence(null, 'pickup'), null);
assert.equal(etaSentence(ETA_MAX_SECONDS + 1, 'pickup'), null);

console.log('eta.check: ok');
