'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Car, User, Shield, Star, PhoneCall, ArrowRight, HeartPulse } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-marigold selection:text-ink-teal pt-24 pb-20 overflow-hidden relative">
      
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-200/40 dark:bg-teal-900/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-marigold/20 dark:bg-marigold-deep/20 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-12 mt-8 md:mt-16 mb-24">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100/50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-sm font-semibold mb-6 animate-fade-in-up">
              <Star className="w-4 h-4 fill-current" /> Trusted in 50+ Hospitals
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              Your Care,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-marigold to-orange-500">Our Priority.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto md:mx-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              We assist you and your loved ones with everything you need at the hospital so you can focus on what matters most.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <Link 
                href="/booking" 
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-marigold to-orange-500 text-ink-teal font-bold text-lg rounded-2xl shadow-lg shadow-marigold/20 hover:shadow-xl hover:shadow-marigold/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Book Assistance <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              </Link>
              <Link 
                href="/quick-help" 
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 dark:bg-white/5 backdrop-blur-md text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold text-lg rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-800 hover:-translate-y-1 transition-all duration-300"
              >
                <PhoneCall className="w-5 h-5" /> Need Help Now?
              </Link>
            </div>
          </div>

          <div className="flex-1 relative w-full max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl shadow-teal-900/10 border border-white/20 dark:border-white/10 relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img 
                src="/assets/caresy-hero.png" 
                alt="Caresy companion helping an elderly patient" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
              />
            </div>
            
            {/* Floating Card */}
            <div className="absolute -bottom-8 -left-8 md:-bottom-12 md:-left-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 p-4 md:p-6 rounded-2xl shadow-xl flex items-center gap-4 animate-float">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Companions</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">24 Ready</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-12 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Complete Hospital Support</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">From door to doctor and back, we ensure a seamless and comfortable healthcare experience.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {[
              { icon: FileText, title: "Hospital Assistance", desc: "Paperwork, appointments, medicine pickup, and queue management.", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
              { icon: Car, title: "Pick-up & Drop", desc: "Safe and reliable rides for patients and their attendants.", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
              { icon: User, title: "Elderly Care", desc: "Compassionate companionship during hospital visits.", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
              { icon: Shield, title: "Full-day Concierge", desc: "Complete day-long support so you don't worry about a thing.", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" }
            ].map((service, idx) => (
              <div key={idx} className="group p-6 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/50 dark:border-white/5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl ${service.bg} ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {service.desc}
                </p>
              </div>
            ))}
            
          </div>
        </section>

      </div>
    </main>
  );
}
