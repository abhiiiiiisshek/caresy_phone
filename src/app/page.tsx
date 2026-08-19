'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Car, User, Shield, ShieldCheck, Users, Star, PhoneCall, ArrowRight, HeartHandshake } from 'lucide-react';

const SERVICES = [
  { icon: FileText, title: 'Hospital Assistance', price: '₹499', desc: 'Paperwork, appointments, medicine pickup, and queue management.' },
  { icon: Car, title: 'Pick-up & Drop', price: '₹899', desc: 'Safe and reliable rides for patients and their attendants.' },
  { icon: User, title: 'Elderly Care', price: '₹899', desc: 'Compassionate companionship during hospital visits.' },
  { icon: Shield, title: 'Full-day Concierge', price: '₹1,299', desc: "Complete day-long support so you don't worry about a thing." },
];

export default function Home() {
  return (
    <main id="main-content">

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-end pb-12 pt-32 px-4 md:px-12 bg-cover bg-center overflow-hidden" style={{ backgroundImage: 'url(/assets/caresy-hero.png)' }}>
        {/* Overlay scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
        
        {/* Floating update card */}
        <div className="absolute top-[45%] right-[5%] md:right-[15%] -translate-y-1/2 bg-[#F4ECE6] p-5 rounded-3xl max-w-[320px] shadow-2xl hidden md:block border border-white/50">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-black/5 px-2 py-1 rounded-md mb-3 inline-block">Example of a live update</span>
          <p className="font-bold text-ink-teal flex items-center gap-2 text-[15px] mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal block animate-pulse"></span>
            Registration complete
          </p>
          <p className="text-slate-600 text-[13px] leading-relaxed">
            Patient is seated near Cardiology. Companion has shared the token and file status.
          </p>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl mb-8">
            <p className="text-white/90 uppercase tracking-widest font-bold text-xs mb-4">Hospital companions for today or later</p>
            <h1 className="text-white text-5xl md:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight">
              Get trusted<br/>hospital<br/>help without<br/>leaving<br/>your day.
            </h1>
            <p className="text-white/90 text-lg md:text-[1.1rem] max-w-lg leading-relaxed font-medium">
              Choose urgent assistance for a hospital visit today, or schedule a verified companion for an upcoming appointment, test, or follow-up.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mb-4">
            <Link href="/quick-help" className="bg-terracotta hover:bg-terracotta-deep transition-colors p-6 rounded-3xl text-white group block shadow-lg">
              <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 group-hover:bg-white/30 transition-colors">Today</span>
              <h2 className="text-xl font-bold mb-1">I need help now</h2>
              <p className="text-white/85 text-[13px] leading-relaxed pr-4">Fast call-back for same-day hospital assistance.</p>
            </Link>
            <Link href="/booking" className="bg-teal hover:bg-teal-deep transition-colors p-6 rounded-3xl text-white group block shadow-lg">
              <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 group-hover:bg-white/30 transition-colors">Later</span>
              <h2 className="text-xl font-bold mb-1">Book for an appointment</h2>
              <p className="text-white/85 text-[13px] leading-relaxed pr-4">Schedule a companion for a planned visit.</p>
            </Link>
          </div>

          {/* Trust Chips */}
          <div className="flex flex-wrap gap-2 max-w-2xl">
            {[
              { title: '4-step', desc: 'family update flow', icon: <FileText className="w-4 h-4 mb-1.5 text-teal" /> },
              { title: '6 checks', desc: 'before assignment', icon: <ShieldCheck className="w-4 h-4 mb-1.5 text-teal" /> },
              { title: 'Human', desc: 'hospital presence', icon: <HeartHandshake className="w-4 h-4 mb-1.5 text-teal" /> }
            ].map((chip, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex-1 min-w-[130px]">
                {chip.icon}
                <div className="text-white font-bold text-sm">{chip.title}</div>
                <div className="text-white/70 text-[11px] leading-tight mt-0.5">{chip.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reconcile the "how big are you really" question honestly, right under the hero */}
      <section className="section" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
        <div className="proof-bar" style={{ marginTop: 0 }}>
          <div className="proof-item">
            <div className="proof-icon"><ShieldCheck style={{ width: '18px', height: '18px' }} /></div>
            <strong>Aadhaar + police verified</strong>
            <span>Every companion is checked via AuthBridge before assignment.</span>
          </div>
          <div className="proof-item">
            <div className="proof-icon"><Users style={{ width: '18px', height: '18px' }} /></div>
            <strong>Live in Noida &amp; Greater Noida</strong>
            <span>Covering Max, Fortis, Kailash, Sharda and other major hospitals — <Link href="/faq#coverage" style={{ textDecoration: 'underline' }}>see full coverage</Link>.</span>
          </div>
          <div className="proof-item">
            <div className="proof-icon"><Star style={{ width: '18px', height: '18px' }} /></div>
            <strong>4.9/5 from 5,000+ visits</strong>
            <span>Real families, real hospitals — <Link href="/trust" style={{ textDecoration: 'underline' }}>read their stories</Link>.</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section calm-path">
        <div className="section-title" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p className="section-kicker">How it works</p>
          <h2>Four steps, start to finish.</h2>
          <p style={{ margin: '0 auto' }}>No app download, no account required to get started — just a call or a form.</p>
        </div>
        <div className="grid-3-col" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            ['1', 'Tell us what you need', 'Same-day help or a scheduled visit — share the hospital and the situation.'],
            ['2', 'We match a companion', 'A verified, trained companion nearby is assigned to your family.'],
            ['3', 'They handle the day', 'Queues, paperwork, medicines — while you get live updates.'],
            ['4', 'You stay in the loop', 'Every milestone, from check-in to discharge, sent straight to your phone.'],
          ].map(([num, title, desc]) => (
            <article className="material-card" key={num} style={{ padding: '24px' }}>
              <div className="step-chip">{num}</div>
              <h3>{title}</h3>
              <p style={{ margin: 0, fontSize: '0.92rem' }}>{desc}</p>
            </article>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <Link href="/how-it-works" className="btn btn-outline">See the full walkthrough</Link>
        </div>
      </section>

      {/* Services with visible pricing */}
      <section className="section service-teaser">
        <div className="section-title" style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p className="section-kicker">Complete hospital support</p>
          <h2>From door to doctor and back.</h2>
          <p style={{ margin: '0 auto' }}>Pick exactly what you need — prices shown upfront, no surprises at booking.</p>
        </div>
        <div className="teaser-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {SERVICES.map((s) => (
            <div className="teaser-card" key={s.title}>
              <span><s.icon style={{ width: '14px', height: '14px', display: 'inline', marginRight: '6px' }} />{s.price}</span>
              <strong>{s.title}</strong>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <Link href="/services" className="btn btn-glass">See all services &amp; full pricing</Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section">
        <div className="final-cta">
          <div>
            <p className="eyebrow">Ready when you are</p>
            <h2>Book a visit, or call if it&apos;s urgent.</h2>
            <p>Every companion&apos;s photo, name, and verification status are shared with you before the visit begins.</p>
          </div>
          <div className="final-actions">
            <a href="tel:+919717500225" className="btn btn-glass"><PhoneCall style={{ width: '18px', height: '18px' }} /> Call us</a>
            <Link href="/quick-help" className="btn btn-urgent">Need help today</Link>
            <Link href="/booking" className="btn btn-primary">Book for later <ArrowRight style={{ width: '18px', height: '18px' }} /></Link>
          </div>
        </div>
      </section>

    </main>
  );
}
