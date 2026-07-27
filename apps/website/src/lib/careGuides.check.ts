// Self-check for the rotation maths. No framework: run it with
//   node --experimental-strip-types src/lib/careGuides.check.ts
// from apps/website. Silence means pass.

import { strict as assert } from 'node:assert';
import { CARE_GUIDES, rotatedGuides, daysSinceEpoch, guideBySlug } from './careGuides.ts';

const slugs = (gs: { slug: string }[]) => gs.map((g) => g.slug).join(',');

// Every guide is present exactly once, whatever the day.
for (let day = 0; day < 40; day++) {
  const r = rotatedGuides(day);
  assert.equal(r.length, CARE_GUIDES.length, `day ${day} changed the count`);
  assert.equal(new Set(r.map((g) => g.slug)).size, r.length, `day ${day} produced a duplicate`);
}

// Rotation actually advances, and wraps back around after a full cycle.
assert.equal(slugs(rotatedGuides(0)), slugs(CARE_GUIDES));
assert.notEqual(slugs(rotatedGuides(1)), slugs(rotatedGuides(0)));
assert.equal(slugs(rotatedGuides(CARE_GUIDES.length)), slugs(rotatedGuides(0)));

// Negative day indexes must not throw or produce an empty list — JS % keeps the
// sign of the dividend, which is the bug this guards.
assert.equal(rotatedGuides(-1).length, CARE_GUIDES.length);
assert.equal(slugs(rotatedGuides(-1)), slugs(rotatedGuides(CARE_GUIDES.length - 1)));

// Excluding the featured guide drops exactly one, and never resurfaces it.
for (let day = 0; day < 40; day++) {
  const r = rotatedGuides(day, 'post-surgery');
  assert.equal(r.length, CARE_GUIDES.length - 1, `day ${day} exclusion count`);
  assert.ok(!r.some((g) => g.slug === 'post-surgery'), `day ${day} leaked the featured guide`);
}

// An unknown exclusion is a no-op rather than an error.
assert.equal(rotatedGuides(3, 'does-not-exist').length, CARE_GUIDES.length);

// Day index advances once per day, not per hour.
const noon = Date.UTC(2026, 6, 27, 12, 0, 0);
assert.equal(daysSinceEpoch(noon), daysSinceEpoch(noon + 6 * 3_600_000));
assert.equal(daysSinceEpoch(noon) + 1, daysSinceEpoch(noon + 86_400_000));

// Slugs are unique, or /guides?a= would resolve ambiguously.
assert.equal(new Set(CARE_GUIDES.map((g) => g.slug)).size, CARE_GUIDES.length, 'duplicate slug');

// Lookup works for every guide, and misses cleanly.
for (const g of CARE_GUIDES) assert.equal(guideBySlug(g.slug)?.slug, g.slug);
assert.equal(guideBySlug('nope'), undefined);
assert.equal(guideBySlug(null), undefined);

// Every guide has something to render.
for (const g of CARE_GUIDES) {
  assert.ok(g.title && g.summary && g.emoji, `${g.slug} missing header copy`);
  assert.ok(g.minutes > 0, `${g.slug} has no read time`);
  assert.ok(g.sections.length > 0, `${g.slug} has no sections`);
  for (const s of g.sections) {
    assert.ok(s.paragraphs?.length || s.bullets?.length, `${g.slug} has an empty section`);
  }
}

console.log(`careGuides: ok (${CARE_GUIDES.length} guides)`);
