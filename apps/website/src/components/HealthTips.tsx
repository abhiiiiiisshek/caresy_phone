import Link from 'next/link';
import { CARE_GUIDES } from '@/lib/careGuides';

/**
 * Quick-info strip on the home screen.
 *
 * No state, no date maths, no client boundary: a CSS scroll-snap row of static
 * cards. Rotating a "guide of the day" would have meant a Date read during
 * render, which mismatches between the statically prerendered HTML and the
 * client. Letting the reader swipe is less code and shows them more than one.
 */
export default function HealthTips() {
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
        {/* post-surgery has its own featured card directly below this strip. */}
        {CARE_GUIDES.filter((g) => g.slug !== 'post-surgery').map((g) => (
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
              <span aria-hidden style={{ display: 'grid', placeItems: 'center', width: 63, height: 64, borderRadius: 12, background: 'var(--m3-chip)', fontSize: 30, flexShrink: 0 }}>
                {g.emoji}
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
