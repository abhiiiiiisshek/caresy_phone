import { HEALTH_TIPS } from '@/lib/healthTips';

/**
 * Quick-info strip on the home screen.
 *
 * No state, no date maths, no client boundary: a CSS scroll-snap row of static
 * cards. Rotating a "tip of the day" would have meant a Date read during render,
 * which mismatches between the statically prerendered HTML and the client.
 * Letting the reader swipe is less code and shows them more than one tip.
 */
export default function HealthTips() {
  return (
    <section aria-labelledby="health-tips-heading" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 id="health-tips-heading" style={{ margin: 0, fontSize: 16, lineHeight: '22px', fontWeight: 700, color: 'var(--m3-ink)' }}>
          Everyday care
        </h2>
        <span style={{ fontSize: 12, color: 'var(--m3-muted)' }}>Swipe for more</span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
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
        {HEALTH_TIPS.map((tip) => (
          <article
            key={tip.title}
            style={{
              scrollSnapAlign: 'start',
              flex: '0 0 78%',
              maxWidth: 300,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '14px 16px',
              borderRadius: 'var(--m3-radius-card)',
              background: 'var(--m3-surface)',
              border: '1px solid var(--m3-line)',
            }}
          >
            <span aria-hidden style={{ fontSize: 22, lineHeight: '26px' }}>{tip.emoji}</span>
            <h3 style={{ margin: 0, fontSize: 14.5, lineHeight: '20px', fontWeight: 700, color: 'var(--m3-ink)' }}>{tip.title}</h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: '19px', color: 'var(--m3-muted)' }}>{tip.body}</p>
          </article>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 11.5, lineHeight: '16px', color: 'var(--m3-muted)' }}>
        General wellbeing guidance, not medical advice. Follow your doctor&rsquo;s instructions for anything specific to the patient.
      </p>
    </section>
  );
}
