'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, MessageCircle, Phone, Mail, ArrowRight, ChevronDown, Headset, Bell, Loader2 } from 'lucide-react';
import { createClient } from '@caresy/auth/supabase/client';
import { Input, Button } from '@caresy/ui';

const EPILOGUE = 'var(--font-epilogue), sans-serif';
const SUP_WA = '919717500225';
const SUP_TEL = '+919717500225';
const SUP_EMAIL = 'support@caresy.co.in';
const supWa = (topic?: string) => `https://wa.me/${SUP_WA}?text=${encodeURIComponent(`Hello Caresy Support,\n\nI need help with: ${topic || 'a general question'}.`)}`;

type FaqCategory = 'booking' | 'payments' | 'safety' | 'technical';

const CHIPS: { key: FaqCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'booking', label: 'Booking' },
  { key: 'payments', label: 'Payments' },
  { key: 'safety', label: 'Companion Safety' },
  { key: 'technical', label: 'Technical Support' },
];

const FAQS: { q: string; a: string; cat: FaqCategory; urgent?: boolean }[] = [
  { q: 'How do I reschedule or cancel?', a: 'Open the booking, tap Details, and use Reschedule or Cancel. We offer free cancellation up to 4 hours before the visit; a flat ₹150 fee applies within that window. Our support team confirms the change and processes any refund.', cat: 'booking' },
  { q: 'Are Caresy companions verified?', a: 'Yes. Every companion clears Aadhaar and police background checks through AuthBridge before they are ever assigned to a family. You can see their verification status on the booking.', cat: 'safety' },
  { q: 'When do I pay for a booking?', a: 'You only pay once a companion is confirmed for your visit. For some services you can also choose to pay after the visit is complete.', cat: 'payments' },
  { q: 'Which cities and hospitals does Caresy cover?', a: 'We currently operate in Noida and Greater Noida, serving all major hospitals in these areas, including Max, Fortis, Kailash, Metro, Sharda and Yatharth. If your hospital is not listed, message us on WhatsApp to verify coverage.', cat: 'booking' },
  { q: 'Can I speak to my caregiver directly?', a: 'To keep everyone safe, all coordination happens through Caresy Support. Message us on WhatsApp with your booking reference and we relay anything to your companion instantly.', cat: 'safety' },
  { q: 'What happens if a companion is late?', a: 'Our operations team tracks companion locations live. If a delay threatens your appointment time, we immediately dispatch a backup companion or coordinate directly with the hospital desk.', cat: 'booking' },
  { q: 'Is Caresy a medical service or home nursing agency?', a: 'No. Caresy provides non-medical assistance and logistics coordination. Our companions do not administer medicine or give medical advice — they handle navigation, queuing, documentation, and companionship.', cat: 'safety' },
  { q: 'How do I sign in if I have trouble with my account?', a: 'Caresy uses one-tap Google sign-in — there is no password to remember. If you cannot sign in, message us on WhatsApp and we will restore access to your account.', cat: 'technical' },
  { q: 'Emergency situations & boundary policies', a: "If a patient's condition deteriorates inside the hospital, our companions immediately alert hospital triage staff and notify your emergency contact. Caresy is not a substitute for ambulance services — for life-threatening emergencies, call the hospital's emergency team directly.", cat: 'safety', urgent: true },
];

function ContactCard({ href, dark, icon: Icon, title, desc, action }: {
  href: string; dark?: boolean; icon: React.ElementType; title: string; desc: string; action: string;
}) {
  const ink = dark ? '#8abda9' : 'var(--m3-ink)';
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener" style={{ display: 'flex', flexDirection: 'column', padding: 24, borderRadius: 'var(--m3-radius-card)', background: dark ? 'var(--m3-green)' : '#e7e9e4', textDecoration: 'none', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', background: dark ? 'rgba(138,189,169,0.2)' : '#e1e3de', color: ink, marginBottom: 16 }}>
        <Icon style={{ width: 20, height: 20 }} />
      </span>
      <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 500, color: ink, paddingBottom: 4 }}>{title}</span>
      <span style={{ fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: dark ? ink : 'var(--m3-muted)', opacity: dark ? 0.8 : 1 }}>{desc}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 16, fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', color: dark ? ink : 'var(--m3-green-deep)' }}>
        {action}
        <ArrowRight style={{ width: 10, height: 10 }} />
      </span>
    </a>
  );
}

export default function Support() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [chip, setChip] = useState<FaqCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error: insertError } = await supabase.from('contact_messages').insert({
        name: formData.get('contact-name') as string,
        phone: formData.get('contact-phone') as string,
        message: formData.get('contact-message') as string,
      });
      if (insertError) throw insertError;
      setSubmitted(true);
      form.reset();
    } catch (err: any) {
      console.error('Error submitting contact message:', err);
      setError(err.message || 'Failed to send your message. Please try again or call us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = FAQS.filter((f) =>
    (chip === 'all' || f.cat === chip) &&
    (!query || (f.q + ' ' + f.a).toLowerCase().includes(query.toLowerCase()))
  );
  const visible = showAll || query || chip !== 'all' ? filtered : filtered.slice(0, 4);

  return (
    <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, paddingBottom: 96 }}>
      <div style={{ maxWidth: 576, margin: '0 auto' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 16px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/caresy-logo.jpg" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontSize: 28, lineHeight: '36px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>Caresy</span>
          </Link>
          <Link href="/my-bookings" aria-label="Notifications" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', color: 'var(--m3-ink)' }}>
            <Bell style={{ width: 20, height: 20 }} />
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 48, padding: '48px 16px 64px' }}>

          {/* Hero */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 400, color: 'var(--m3-green-deep)' }}>How can we help you today?</h1>
            <p style={{ margin: '0 auto', maxWidth: 672, fontSize: 16, lineHeight: '24px', letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>
              Find answers to common questions or reach out to our dedicated support team. We&apos;re here to ensure your Caresy experience is seamless and secure.
            </p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 672, width: '100%' }}>
            <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#707974' }} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search FAQs, articles..."
              style={{ width: '100%', padding: '20px 17px 21px 49px', borderRadius: 12, border: '1px solid #c0c9c3', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: 16, letterSpacing: '0.5px', color: 'var(--m3-ink)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {/* Contact bento */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ContactCard href={supWa()} dark icon={MessageCircle} title="Chat with us" desc="Instant support via WhatsApp" action="Start chat" />
            <ContactCard href={`tel:${SUP_TEL}`} icon={Phone} title="Call Support" desc="Speak to a human representative" action="Call now" />
            <ContactCard href={`mailto:${SUP_EMAIL}`} icon={Mail} title="Email Support" desc="Typically replies in 24 hrs" action="Write email" />
          </div>

          {/* FAQ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
            <h2 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 400, color: 'var(--m3-ink)' }}>Frequently Asked Questions</h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0' }}>
              {CHIPS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => { setChip(c.key); setOpenFaq(null); }}
                  style={{
                    padding: '9px 17px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 500, letterSpacing: '0.1px',
                    background: chip === c.key ? 'var(--m3-cyan)' : '#e1e3de',
                    border: chip === c.key ? '1px solid transparent' : '1px solid #c0c9c3',
                    color: chip === c.key ? 'var(--m3-cyan-ink)' : 'var(--m3-muted)',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div style={{ borderRadius: 'var(--m3-radius-card)', border: '1px solid rgba(192,201,195,0.5)', background: 'var(--m3-bg)', overflow: 'hidden', padding: '8px 0 0' }}>
              {visible.length === 0 && (
                <p style={{ margin: 0, padding: 24, fontSize: 14, color: 'var(--m3-muted)', textAlign: 'center' }}>No results. Try another search or chat with us.</p>
              )}
              {visible.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} style={{ borderBottom: i < visible.length - 1 ? '1px solid rgba(192,201,195,0.3)' : 'none' }}>
                    <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', padding: '20px 24px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 16, lineHeight: '24px', fontWeight: 500, letterSpacing: '0.15px', color: f.urgent ? 'var(--terracotta-deep)' : 'var(--m3-ink)' }}>{f.q}</span>
                      <ChevronDown style={{ width: 14, height: 14, color: 'var(--m3-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                    </button>
                    {open && (
                      <p style={{ margin: 0, padding: '0 24px 20px', fontSize: 14, lineHeight: 1.6, letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>{f.a}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {!showAll && !query && chip === 'all' && filtered.length > 4 && (
              <button onClick={() => setShowAll(true)} style={{ margin: '2px auto 0', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', color: 'var(--m3-green-deep)' }}>
                View all FAQs
              </button>
            )}
          </div>

          {/* Expert CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '49px 33px 33px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-chip)', border: '1px solid rgba(192,201,195,0.2)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', background: 'var(--m3-green-deep)', color: '#fff', marginBottom: 16 }}>
              <Headset style={{ width: 25, height: 25 }} />
            </span>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, lineHeight: '28px', fontWeight: 500, color: 'var(--m3-ink)' }}>Still need assistance?</h2>
            <p style={{ margin: '0 0 24px', maxWidth: 448, fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>
              Our specialized care experts can help tailor a solution specifically for your unique needs.
            </p>
            <a href={supWa('speaking to a care expert')} target="_blank" rel="noopener" style={{ padding: '16px 32px', borderRadius: 999, background: 'var(--m3-green-deep)', color: '#fff', fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', textDecoration: 'none', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
              Contact an Expert
            </a>
          </div>

          {/* Message form */}
          <div style={{ padding: 24, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 22, lineHeight: '28px', fontWeight: 500, color: 'var(--m3-ink)' }}>Send us a message</h2>
            {submitted ? (
              <p style={{ textAlign: 'center', color: 'var(--m3-green-deep)', fontWeight: 700, padding: '16px 0', margin: 0 }}>
                Thanks — your message has been sent. Our team will get back to you shortly.
              </p>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && <p style={{ color: 'var(--terracotta)', fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>{error}</p>}
                <Input label="Name" id="contact-name" name="contact-name" placeholder="Your Full Name" required />
                <Input label="Phone Number" type="tel" id="contact-phone" name="contact-phone" placeholder="Your Phone Number" required />
                <Input label="Your Message" id="contact-message" name="contact-message" placeholder="How can we help you?" multiline rows={4} required />
                <Button type="submit" variant="primary" full disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} /> : 'Send Message'}
                </Button>
              </form>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
