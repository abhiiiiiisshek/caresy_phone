import type { Metadata } from 'next';
import Link from 'next/link';
import { CARE_GUIDES, guideBySlug } from '@/lib/careGuides';

const EPILOGUE = 'var(--font-epilogue), sans-serif';

export const metadata: Metadata = {
  title: 'Care guides — Caresy',
  description: 'Short, practical guides on recovering after surgery, managing medicines, preventing falls and everyday care at home.',
};

// Server component: the guides are static text, so there is nothing to hydrate.
// `?a=<slug>` opens one, no param lists them all — the same query-param shape
// used elsewhere in this app rather than a dynamic segment.
export default async function GuidesPage({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const { a } = await searchParams;
  const guide = guideBySlug(a ?? null);

  return (
    <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, paddingBottom: 96 }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: 16 }}>
        {guide ? (
          <article style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Link href="/guides" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--m3-green-deep)', textDecoration: 'none' }}>
              ← All guides
            </Link>

            <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span aria-hidden style={{ fontSize: 40, lineHeight: '46px' }}>{guide.emoji}</span>
              <h1 style={{ margin: 0, fontSize: 27, lineHeight: '34px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>{guide.title}</h1>
              <p style={{ margin: 0, fontSize: 15, lineHeight: '22px', color: 'var(--m3-muted)' }}>{guide.summary}</p>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--m3-green-deep)' }}>{guide.minutes} min read</span>
            </header>

            {guide.sections.map((s, i) => (
              <section key={s.heading ?? i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {s.heading && (
                  <h2 style={{ margin: 0, fontSize: 17, lineHeight: '23px', fontWeight: 700, color: 'var(--m3-ink)' }}>{s.heading}</h2>
                )}
                {s.paragraphs?.map((p) => (
                  <p key={p.slice(0, 40)} style={{ margin: 0, fontSize: 15, lineHeight: '24px', color: 'var(--m3-ink)' }}>{p}</p>
                ))}
                {s.bullets && (
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {s.bullets.map((b) => (
                      <li key={b.slice(0, 40)} style={{ fontSize: 15, lineHeight: '23px', color: 'var(--m3-ink)' }}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <p style={{ margin: 0, padding: '14px 16px', borderRadius: 12, background: 'var(--m3-chip)', fontSize: 12.5, lineHeight: '18px', color: 'var(--m3-muted)' }}>
              General wellbeing guidance, not medical advice. Follow your doctor&rsquo;s instructions for anything specific to the patient, and seek care urgently if you are worried.
            </p>

            <Link href="/booking" style={{ display: 'inline-block', textAlign: 'center', padding: '14px 24px', borderRadius: 999, background: 'var(--m3-green)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Book a companion for the next visit
            </Link>
          </article>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <header>
              <h1 style={{ margin: '0 0 4px', fontSize: 27, lineHeight: '34px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>Care guides</h1>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: '21px', color: 'var(--m3-muted)' }}>
                Short, practical reading for looking after someone at home.
              </p>
            </header>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CARE_GUIDES.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides?a=${g.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)', textDecoration: 'none' }}>
                    <span aria-hidden style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 12, background: 'var(--m3-chip)', fontSize: 22, flexShrink: 0 }}>{g.emoji}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--m3-ink)' }}>{g.title}</span>
                      <span style={{ display: 'block', fontSize: 12.5, lineHeight: '18px', color: 'var(--m3-muted)' }}>{g.summary}</span>
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--m3-green-deep)', flexShrink: 0 }}>{g.minutes} min</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
