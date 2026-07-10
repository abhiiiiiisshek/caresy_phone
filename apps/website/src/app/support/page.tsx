'use client';

import React, { useState } from 'react';
import {
  Mail, ArrowUpRight, MessageCircle, ChevronRight, Plus, Minus, Loader2,
  CalendarCheck, Wallet, UserRound, RotateCcw, Siren, CircleHelp,
} from 'lucide-react';
import { createClient } from '@caresy/auth/supabase/client';
import { Input, Button, Card, Badge } from '@caresy/ui';

const SUP_WA = '919717500225';
const SUP_EMAIL = 'support@caresy.co.in';
const supWa = (topic?: string) => `https://wa.me/${SUP_WA}?text=${encodeURIComponent(`Hello Caresy Support,\n\nI need help with: ${topic || 'a general question'}.`)}`;

const CATEGORIES = [
  { icon: CalendarCheck, title: 'My Booking', sub: 'Status, timing, address' },
  { icon: Wallet, title: 'Payment Issues', sub: 'Charges, receipts, failures' },
  { icon: UserRound, title: 'Caregiver Queries', sub: 'About your companion' },
  { icon: RotateCcw, title: 'Cancellation & Refund', sub: 'Change or cancel a visit' },
  { icon: Siren, title: 'Emergency Assistance', sub: 'Urgent, same-day help' },
  { icon: CircleHelp, title: 'General Questions', sub: 'Anything else' },
];

const FAQS = [
  { q: 'Are Caresy companions verified?', a: 'Yes. Every companion clears Aadhaar and police background checks through AuthBridge before they are ever assigned to a family. You can see their verification status on the booking.' },
  { q: 'Which cities and hospitals does Caresy cover?', a: 'We currently operate in Noida and Greater Noida, serving all major hospitals in these areas, including Max, Fortis, Kailash, Metro, Sharda and Yatharth. If your hospital is not listed, message us on WhatsApp to verify coverage.' },
  { q: 'When do I pay for a booking?', a: 'You only pay once a companion is confirmed for your visit. For some services you can also choose to pay after the visit is complete.' },
  { q: 'Can I speak to my caregiver directly?', a: 'To keep everyone safe, all coordination happens through Caresy Support. Message us on WhatsApp with your booking reference and we relay anything to your companion instantly.' },
  { q: 'How do I reschedule or cancel?', a: 'Open the booking, tap Details, and use Reschedule or Cancel. We offer free cancellation up to 4 hours before the visit; a flat ₹150 fee applies within that window. Our support team confirms the change and processes any refund.' },
  { q: 'What happens if a companion is late?', a: 'Our operations team tracks companion locations live. If a delay threatens your appointment time, we immediately dispatch a backup companion or coordinate directly with the hospital desk.' },
  { q: 'Is Caresy a medical service or home nursing agency?', a: 'No. Caresy provides non-medical assistance and logistics coordination. Our companions do not administer medicine or give medical advice — they handle navigation, queuing, documentation, and companionship.' },
  { q: 'Emergency situations & boundary policies', a: "If a patient's condition deteriorates inside the hospital, our companions immediately alert hospital triage staff and notify your emergency contact. Caresy is not a substitute for ambulance services — for life-threatening emergencies, call the hospital's emergency team directly.", urgent: true },
];

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ padding: '20px 2px 8px' }}>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{title}</h3>
    </div>
  );
}

function FaqItem({ q, a, urgent, open, onToggle }: { q: string; a: string; urgent?: boolean; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 700, color: urgent ? 'var(--terracotta-deep)' : 'var(--ink-teal)' }}>{q}</span>
        <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', background: open ? 'var(--teal)' : 'var(--sage)', color: open ? '#fff' : 'var(--ink-teal)', flexShrink: 0 }}>
          {open ? <Minus style={{ width: 15, height: 15 }} /> : <Plus style={{ width: 15, height: 15 }} />}
        </span>
      </button>
      {open && (
        <p style={{ margin: 0, padding: '0 16px 16px', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--muted)' }}>{a}</p>
      )}
    </div>
  );
}

export default function Support() {
  const [openFaq, setOpenFaq] = useState(0);
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

  return (
    <main className="app-shell-page" id="main-content" style={{ background: 'var(--paper)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>

        {/* header */}
        <div style={{ padding: '20px 2px 6px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink-teal)', letterSpacing: '-0.01em' }}>How can we help?</h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>Real humans in our ops room, 24/7.</p>
        </div>

        {/* primary contact — WhatsApp */}
        <div style={{ padding: '12px 0 0' }}>
          <a href={supWa()} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(228,240,236,0.16), transparent 45%), var(--ink-teal)', color: '#fff', boxShadow: 'var(--shadow-2)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 14, background: 'rgba(39,168,117,0.22)', flexShrink: 0 }}><MessageCircle style={{ width: 22, height: 22, color: '#4FD1A0' }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>Chat on WhatsApp</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>Fastest reply · usually under 5 min</div>
              </div>
              <ArrowUpRight style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.7)' }} />
            </div>
          </a>
          <a href={`mailto:${SUP_EMAIL}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginTop: 10, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: 'var(--teal-soft)', color: 'var(--teal)', flexShrink: 0 }}><Mail style={{ width: 18, height: 18 }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-teal)' }}>Email Support</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{SUP_EMAIL}</div>
              </div>
              <ChevronRight style={{ width: 18, height: 18, color: 'var(--muted)' }} />
            </div>
          </a>
        </div>

        {/* help categories */}
        <SectionHead title="Browse help topics" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {CATEGORIES.map((cat) => {
            const urgent = cat.title === 'Emergency Assistance';
            return (
              <a key={cat.title} href={supWa(cat.title)} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
                <div style={{ height: '100%', padding: 14, borderRadius: 'var(--radius)', background: 'var(--surface)', border: `1px solid ${urgent ? 'rgba(196,85,67,0.28)' : 'var(--line)'}` }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, marginBottom: 10, background: urgent ? 'var(--terracotta-soft)' : 'var(--teal-soft)', color: urgent ? 'var(--terracotta-deep)' : 'var(--teal)' }}><cat.icon style={{ width: 18, height: 18 }} /></span>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-teal)' }}>{cat.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 1 }}>{cat.sub}</div>
                </div>
              </a>
            );
          })}
        </div>

        {/* FAQ accordion */}
        <SectionHead title="Frequently asked" />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 8 }}>
          {FAQS.map((faq, i) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} urgent={faq.urgent} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>

        {/* contact form */}
        <SectionHead title="Send us a message" />
        <Card style={{ marginBottom: 24 }}>
          {submitted ? (
            <p style={{ textAlign: 'center', color: 'var(--teal-deep)', fontWeight: 700, padding: '16px 0', margin: 0 }}>
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
        </Card>

        {/* coverage */}
        <div id="coverage" style={{ scrollMarginTop: '110px', marginBottom: 32 }}>
          <Card variant="sunken" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Badge tone="teal" style={{ width: 'max-content' }}>Coverage Area</Badge>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Active Metro Areas &amp; Network Hospitals</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
              Caresy companions are currently deployed and operating in <strong>Noida and Greater Noida</strong>. We coordinate care across all major private and public healthcare systems.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div>
                <strong style={{ color: 'var(--teal-deep)' }}>Noida</strong>
                <p style={{ fontSize: '0.86rem', margin: '4px 0 0', lineHeight: 1.45, color: 'var(--muted)' }}>Max Super Speciality Hospital (Sector 62), Fortis Hospital (Sector 62), Kailash Hospital (Sector 27), Metro Hospital (Sector 11).</p>
              </div>
              <div>
                <strong style={{ color: 'var(--teal-deep)' }}>Greater Noida</strong>
                <p style={{ fontSize: '0.86rem', margin: '4px 0 0', lineHeight: 1.45, color: 'var(--muted)' }}>Sharda Hospital, Yatharth Super Speciality Hospital, GIMS (Government Institute of Medical Sciences).</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
