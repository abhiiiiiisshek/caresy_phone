'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, MessageCircle, Phone, Mail, ArrowRight, ChevronDown, Headset, Bell, Loader2 } from 'lucide-react';
import { createClient } from '@caresy/auth/supabase/client';
import { useAuth } from '@caresy/auth';
import { Input, Button, Reveal } from '@caresy/ui';
import { isValidIndianMobile, normalizeIndianMobile, toE164, mobileHint } from '@caresy/utils/phone';

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

// Ordered by what people actually arrive worried about. Cost first — it is the
// question the old list buried under "are companions verified", and the one
// somebody opens this page to answer before booking.
//
// Prices and cancellation terms here must match packages/utils/src/pricing.ts
// and /terms. They previously said ₹150 within 4 hours and "pay once a
// companion is confirmed", both of which stopped being true when metered
// billing shipped.
const FAQS: { q: string; a: string; cat: FaqCategory; urgent?: boolean }[] = [
  { q: 'What does it cost?', a: '₹299 for the first hour, then ₹4 a minute. A full day (up to 8 hours) is ₹1,599, and we always charge whichever comes to less. If the visit runs a little over, the first 15 minutes past your booked time are free. Bookings that start between 6pm and 8pm add a flat ₹99.', cat: 'payments' },
  { q: 'When and how do I pay?', a: 'After the visit, not before. Your companion completes the booking, the app shows the final amount for the time actually used, and you pay by cash or UPI. Nothing is charged upfront and no card is stored.', cat: 'payments' },
  { q: 'How do I cancel, and what does it cost?', a: 'Scheduled bookings are free to cancel until 6 hours before the start time. Urgent bookings are free within 30 minutes of placing them. Outside those windows — or once a companion has already set out — a ₹99 fee applies, and it goes to the companion for the trip they made.', cat: 'booking' },
  { q: 'Can the companion arrange a cab or drive us?', a: 'Yes. Your companion can compare Uber, Rapido, Ola and local taxis, tell you the fares, and book whichever you choose — you pay the driver directly. Caresy adds nothing to the fare. They can also drive your own car or bike, in which case we only assign companions with a verified, current driving licence.', cat: 'booking' },
  { q: 'Are Caresy companions verified?', a: 'Yes. Every companion clears Aadhaar and police background checks before they are ever assigned to a family. You can see their verification status on the booking.', cat: 'safety' },
  { q: 'Which areas and hospitals do you cover?', a: 'Noida and Greater Noida, including Max, Fortis, Kailash, Metro, Sharda and Yatharth. Type your hospital when booking — if we serve the area, the pincode fills in automatically. If it does not appear, message us on WhatsApp and we will confirm.', cat: 'booking' },
  { q: 'What happens if a companion is late?', a: 'Our operations team tracks companion locations live. If a delay threatens your appointment time, we dispatch a backup companion or coordinate directly with the hospital desk. Your billing starts when the companion actually begins, never before.', cat: 'booking' },
  { q: 'Can I follow the visit if I live elsewhere?', a: 'Yes. Every booking has a tracking link you can share with family anywhere — they do not need an account or the app to open it. The care timeline also keeps visits, prescriptions and reports in one place for the whole family.', cat: 'technical' },
  { q: 'Can I speak to my companion directly?', a: 'To keep everyone safe, coordination happens through Caresy Support. Message us on WhatsApp with your booking reference and we relay anything to your companion immediately.', cat: 'safety' },
  { q: 'Is Caresy a medical service or nursing agency?', a: 'No. Caresy provides non-medical assistance and logistics. Our companions do not administer medicine or give medical advice — they handle navigation, queues, paperwork, pharmacy runs and company.', cat: 'safety' },
  { q: 'I am having trouble signing in', a: 'Caresy uses one-tap Google sign-in — there is no password to remember. You can browse and fill in a booking without signing in at all; we only ask when you confirm. If you still cannot get in, message us on WhatsApp.', cat: 'technical' },
  { q: 'Emergencies and what companions cannot do', a: "If a patient's condition deteriorates inside the hospital, our companions immediately alert hospital triage staff and notify your emergency contact. Caresy is not a substitute for ambulance services — for life-threatening emergencies, call the hospital's emergency team directly.", cat: 'safety', urgent: true },
];

/**
 * One contact route, one row.
 *
 * These were three stacked cards with a 48px icon, a 22px title and a 24px pad
 * each — most of a phone screen spent on three links, pushing the FAQ people
 * came for below the fold. A row says the same thing in a fifth of the height.
 */
function ContactRow({ href, primary, icon: Icon, title, desc }: {
  href: string; primary?: boolean; icon: React.ElementType; title: string; desc: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noopener"
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, textDecoration: 'none', background: primary ? 'var(--m3-green-deep)' : 'var(--m3-chip)', border: primary ? 'none' : '1px solid var(--m3-line)' }}
    >
      <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: primary ? 'rgba(255,255,255,0.16)' : '#fff', color: primary ? '#fff' : 'var(--m3-green-deep)' }}>
        <Icon style={{ width: 18, height: 18 }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: primary ? '#fff' : 'var(--m3-ink)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: primary ? 'rgba(255,255,255,0.82)' : 'var(--m3-muted)' }}>{desc}</span>
      </span>
      <ArrowRight style={{ width: 15, height: 15, flexShrink: 0, color: primary ? '#fff' : 'var(--m3-muted)' }} />
    </a>
  );
}

export default function Support() {
  const { user, profile } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [chip, setChip] = useState<FaqCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled, so the phone can be validated as it is typed.
  //
  // null means "not typed in yet", which is what lets the signed-in customer's
  // own details fill the field without an effect copying them into state — the
  // profile arrives after first paint, so that would be a setState-in-effect.
  // The instant they type, `??` stops falling through and their value wins,
  // including when they clear the field to empty.
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const nameValue = name ?? profile?.full_name ?? '';
  const phoneValue = phone ?? normalizeIndianMobile(profile?.phone || '') ?? '';

  const canSubmit = nameValue.trim() !== '' && isValidIndianMobile(phoneValue) && message.trim() !== '';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Native `required` cannot express "10 digits starting 6-9", so the real
    // check lives here. Without it, support gets messages from numbers that
    // cannot be dialled.
    if (!canSubmit) {
      setError(isValidIndianMobile(phoneValue) ? 'Please fill in every field.' : 'Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error: insertError } = await supabase.from('contact_messages').insert({
        name: nameValue.trim(),
        // Stored in one shape, always: +919876543210.
        phone: toE164(phoneValue),
        message: message.trim(),
        user_id: user?.id ?? null,
      });
      if (insertError) throw insertError;
      setSubmitted(true);
      setName(''); setPhone(''); setMessage('');
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
            <img src="/img/caresy-mark.png" alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span style={{ fontSize: 28, lineHeight: '36px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>Caresy</span>
          </Link>
          <Link href="/my-bookings" aria-label="Notifications" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', color: 'var(--m3-ink)' }}>
            <Bell style={{ width: 20, height: 20 }} />
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '20px 16px 48px' }}>

          {/* Hero */}
          <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 26, lineHeight: '32px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>How can we help?</h1>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: '21px', color: 'var(--m3-muted)' }}>
              Answers below, or reach a person in under a minute.
            </p>
          </Reveal>

          {/* Reach a human — first, because that is why most people open this page */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ContactRow href={supWa()} primary icon={MessageCircle} title="Chat on WhatsApp" desc="Fastest — usually answered in minutes" />
            <ContactRow href={`tel:${SUP_TEL}`} icon={Phone} title="Call us" desc={SUP_TEL} />
            <ContactRow href={`mailto:${SUP_EMAIL}`} icon={Mail} title="Email" desc="Replies within 24 hours" />
          </div>

          {/* FAQ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, lineHeight: '26px', fontWeight: 700, color: 'var(--m3-ink)' }}>Common questions</h2>

            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#707974' }} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions"
                style={{ width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12, border: '1px solid #c0c9c3', background: '#fff', fontSize: 15, color: 'var(--m3-ink)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {CHIPS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => { setChip(c.key); setOpenFaq(null); }}
                  style={{
                    flexShrink: 0,
                    padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13, fontWeight: chip === c.key ? 700 : 500, letterSpacing: '0.1px',
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
                    <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', padding: '15px 17px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 14.5, lineHeight: '20px', fontWeight: open ? 700 : 500, color: f.urgent ? 'var(--terracotta-deep)' : 'var(--m3-ink)' }}>{f.q}</span>
                      <ChevronDown style={{ width: 14, height: 14, color: 'var(--m3-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                    </button>
                    {open && (
                      <p style={{ margin: 0, padding: '0 17px 16px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--m3-muted)' }}>{f.a}</p>
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

          {/* Message form. The "Contact an Expert" block that used to sit above
              this was a third WhatsApp link, identical to the one at the top of
              the page — two CTAs competing to do the same thing. */}
          <div style={{ padding: 20, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-surface)', border: '1px solid var(--m3-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Headset style={{ width: 18, height: 18, color: 'var(--m3-green-deep)' }} />
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--m3-ink)' }}>Still stuck? Write to us</h2>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--m3-muted)' }}>We reply on WhatsApp or by phone, usually the same day.</p>
            {submitted ? (
              <p style={{ textAlign: 'center', color: 'var(--m3-green-deep)', fontWeight: 700, padding: '12px 0', margin: 0 }}>
                Thanks — we have your message and will get back to you shortly.
              </p>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <p style={{ color: 'var(--terracotta)', fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>{error}</p>}
                <Input label="Name" id="contact-name" name="contact-name" placeholder="Your full name" required
                  value={nameValue} onChange={(e) => setName(e.target.value)} />
                <Input
                  label="Phone number" type="tel" id="contact-phone" name="contact-phone"
                  inputMode="numeric" maxLength={10} placeholder="98765 43210" required
                  value={phoneValue}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  hint={mobileHint(phoneValue) ?? '+91 — we only need the 10 digits'}
                />
                <Input label="Your message" id="contact-message" name="contact-message" placeholder="What do you need help with?" multiline rows={4} required
                  value={message} onChange={(e) => setMessage(e.target.value)} />
                <Button type="submit" variant="primary" full disabled={isSubmitting || !canSubmit}>
                  {isSubmitting ? <Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} /> : 'Send message'}
                </Button>
              </form>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
