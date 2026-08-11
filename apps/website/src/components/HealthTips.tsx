'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { rotatedGuides, daysSinceEpoch } from '@/lib/careGuides';
import { GuideIcon } from '@/lib/guideIcons';

// The home page is statically prerendered, so reading Date during render would
// bake the build date into the HTML and disagree with the client from the next
// day onward. useSyncExternalStore is the sanctioned way out: the server (and
// the hydration pass) sees 0, then the client swaps in today without a mismatch.
const noopSubscribe = () => () => {};
const serverDay = () => 0;
// Stable within a calendar day, so React never sees a changing snapshot.
const clientDay = () => daysSinceEpoch(Date.now());

/**
 * Quick-info strip on the home screen.
 *
 * ponytail: rotates once a day, not per visit — a per-visit shuffle would need
 * either a random value (hydration mismatch) or a stored counter. Swap clientDay
 * for a per-session seed if the same order within one day starts feeling stale.
 */
export default function HealthTips() {
  const day = useSyncExternalStore(noopSubscribe, clientDay, serverDay);
  // Nothing excluded: post-surgery used to have its own card below this strip,
  // which gave the home page two separate things to read and made neither feel
  // like the one to open. The card is gone; the guide belongs back in here.
  const guides = rotatedGuides(day);

  return (
    <section aria-labelledby="care-guides-heading" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h3 id="care-guides-heading" style={{ margin: 0, fontSize: 15, lineHeight: '21px', fontWeight: 700, color: 'var(--m3-ink)' }}>
          Everyday care
        </h3>
        <Link href="/guides" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--m3-green-deep)', textDecoration: 'none', flexShrink: 0 }}>
          See all
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          // Bleed to the screen edges so the row reads as scrollable, while the
          // first card still lines up with the rest of the page.
          margin: '0 -16px',
          padding: '2px 16px 6px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {guides.map((g) => (
          <article
            key={g.slug}
            style={{
              scrollSnapAlign: 'start',
              flex: '0 0 82%',
              maxWidth: 320,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              padding: 21,
              borderRadius: 'var(--m3-radius-card)',
              background: 'var(--m3-surface)',
              border: '1px solid var(--m3-line)',
              boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--m3-ink)' }}>{g.title}</h4>
                <span style={{ fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>{g.summary}</span>
              </div>
              <span aria-hidden style={{ display: 'grid', placeItems: 'center', width: 63, height: 64, borderRadius: 12, background: 'var(--m3-chip)', flexShrink: 0 }}>
                <GuideIcon slug={g.slug} size={34} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--m3-green-deep)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>{g.minutes} min read</span>
              </span>
              <Link
                href={`/guides?a=${g.slug}`}
                style={{ padding: '6px 16px', borderRadius: 'var(--radius-pill)', background: 'var(--m3-cyan)', color: 'var(--m3-cyan-ink)', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', textDecoration: 'none', flexShrink: 0 }}
              >
                Read
              </Link>
            </div>
          </article>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 11.5, lineHeight: '16px', color: 'var(--m3-muted)' }}>
        General wellbeing guidance, not medical advice. Follow your doctor&rsquo;s instructions for anything specific to the patient.
      </p>
    </section>
  );
}
