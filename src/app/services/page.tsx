'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Car, User, Shield } from 'lucide-react';
import { ServiceCard } from '@/components/ds';

const SERVICES = [
  { icon: FileText, title: 'Hospital Assistance', price: '₹499', desc: 'We help with paperwork, appointments, medicine pickup, queue management and waiting room comfort.' },
  { icon: Car, title: 'Pick-up & Drop', price: '₹899', desc: 'Safe and reliable pickup and drop services for patients and their attendants.' },
  { icon: User, title: 'Elderly Care Companion', price: '₹899', desc: 'Compassionate companionship and assistance for elderly during hospital visits.' },
  { icon: Shield, title: 'Full-day Concierge', price: '₹1,299', desc: "Complete day-long support so you don't have to worry about a thing." },
];

export default function Services() {
  return (
    <main className="page" id="main-content">
      <section className="page-hero" style={{ textAlign: 'center' }}>
        <p className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>Complete hospital support</p>
        <h1>Our Services</h1>
        <p style={{ margin: '0 auto' }}>Comprehensive support designed to make hospital visits stress-free — prices shown upfront, no surprises at booking.</p>
      </section>

      <section className="section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {SERVICES.map((s) => (
            <ServiceCard
              key={s.title}
              icon={<s.icon style={{ width: 14, height: 14 }} />}
              price={s.price}
              title={s.title}
              description={s.desc}
              onClick={() => { window.location.href = '/booking'; }}
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link href="/booking" className="btn btn-primary">Book a Service</Link>
        </div>
      </section>
    </main>
  );
}
