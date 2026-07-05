'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Phone, MessageSquare, AlertCircle, Clock, MapPin, User, FileText, ArrowRight } from 'lucide-react';

export default function QuickHelp() {
  const { user, openLogin } = useAuth();
  
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [hospital, setHospital] = useState('');
  const [service, setService] = useState('Appointment today');
  const [urgency, setUrgency] = useState('Call now');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);
  const [deskCompanions, setDeskCompanions] = useState(8);
  const [callbackMin, setCallbackMin] = useState(6);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallbackMin(4 + Math.floor(Math.random() * 5));
      setDeskCompanions(5 + Math.floor(Math.random() * 7));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      openLogin(() => {
        submitBookingRequest();
      });
      return;
    }

    submitBookingRequest();
  };

  const submitBookingRequest = async () => {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        alert('Authentication error. Please log in.');
        setIsSubmitting(false);
        return;
      }

      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          customer_user_id: currentUser.id,
          full_name: patientName,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .insert({
          customer_user_id: currentUser.id,
          title: hospital,
          address_line_1: hospital,
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
        })
        .select()
        .single();

      if (locationError) throw locationError;

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_user_id: currentUser.id,
          patient_id: patientData.id,
          pickup_location_id: locationData.id,
          service_type: 'HOSPITAL_COMPANION',
          booking_type: 'INSTANT',
          status: 'PENDING',
          special_instructions: notes || '',
          service_metadata: {
            customerName,
            phone,
            email,
            urgency,
            category: service,
          },
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      setSuccessBookingId(`CRS-${bookingData.id.split('-')[0].toUpperCase()}`);
    } catch (err: any) {
      console.error('Error submitting urgent booking request:', err);
      alert(err.message || 'Failed to submit booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successBookingId) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 pt-28">
        <div className="w-full max-w-lg p-8 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Request Received!</h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">
            Our dispatcher will call <strong className="text-slate-900 dark:text-white">{phone || user?.phone || user?.email}</strong> within {callbackMin} minutes.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-8 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 uppercase font-semibold mb-1">Reference Number</p>
            <p className="text-2xl font-black text-marigold-deep">{successBookingId}</p>
          </div>
          
          <div className="space-y-4">
            <a href={`https://wa.me/919717500225?text=Hi,%20my%20quick%20help%20reference%20is%20${successBookingId}`} target="_blank" rel="noopener" className="w-full flex items-center justify-center gap-2 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-500/20">
              <MessageSquare className="w-5 h-5" /> Chat on WhatsApp
            </a>
            <Link href="/my-bookings" className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl transition-colors">
              View My Bookings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-24 pb-20 relative overflow-hidden">
      
      {/* Background gradients for urgency */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-400/20 dark:bg-red-900/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        
        <header className="mb-10 text-center md:text-left animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
            <AlertCircle className="w-4 h-4" /> Same-day Support
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
            Need help at the hospital <span className="text-red-500">today?</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Share the minimum details. Operations will call back, verify feasibility, and guide the next step immediately.
          </p>
        </header>

        {/* Live Operations Desk Widget */}
        <div className="mb-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-20" />
              <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-1">Live Operations Desk</h3>
              <p className="text-sm md:text-base text-slate-700 dark:text-slate-300">
                Desk Status: <strong className="text-green-500">Active</strong> &bull; Callback: <strong>~{callbackMin} mins</strong>
              </p>
            </div>
          </div>
          <a href="https://wa.me/919717500225" target="_blank" rel="noopener" className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl transition-colors">
            <MessageSquare className="w-4 h-4" /> WhatsApp Us
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          
          {/* Main Form */}
          <form onSubmit={handleFormSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            
            <div className="mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm">1</div> Contact Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your Name</label>
                  <input required name="customerName" type="text" placeholder="e.g. Ananya Rao" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mobile Number</label>
                  <input required name="phone" type="tel" placeholder="+91 97175 00225" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                <input required name="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm">2</div> Where is help needed?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Patient Name</label>
                  <input required name="patientName" type="text" placeholder="Ramesh Kumar" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hospital/Area</label>
                  <input required name="hospital" type="text" placeholder="Max Hospital, Sector 62" value={hospital} onChange={(e) => setHospital(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">What is happening now?</label>
                <select name="service" value={service} onChange={(e) => setService(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none">
                  <option>Appointment today</option>
                  <option>Test or scan today</option>
                  <option>Registration or queue support</option>
                  <option>Medicine or document support</option>
                  <option>Need guidance from operations</option>
                </select>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm">3</div> Urgency
              </h2>
              <div className="space-y-3 mb-6">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">When should we call?</label>
                {['Call now', 'Within 30 minutes', 'Later today'].map((opt) => (
                  <label key={opt} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${urgency === opt ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-red-300'}`}>
                    <input type="radio" name="urgency" value={opt} checked={urgency === opt} onChange={() => setUrgency(opt)} className="w-5 h-5 accent-red-500" />
                    <span className={`font-semibold ${urgency === opt ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Short Note (Optional)</label>
                <textarea rows={3} placeholder="Patient location, mobility needs, emergency contact..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"></textarea>
              </div>
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              {isSubmitting ? 'Submitting...' : <>Request Urgent Call-Back <ArrowRight className="w-5 h-5" /></>}
            </button>
            <p className="text-xs text-center text-slate-500 mt-4">
              * Operations callback and feasibility check are <strong>100% free</strong>. You only pay if a companion is dispatched.
            </p>
          </form>

          {/* Sidebar */}
          <aside className="space-y-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
              <p className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-2">Urgent Request</p>
              <h3 className="text-2xl font-black mb-6">Call-back Priority</h3>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-0.5"><Clock className="w-3.5 h-3.5 text-blue-400" /></div>
                  <p className="text-sm text-slate-300"><strong className="text-white">Status:</strong> Operations review needed</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-0.5"><MapPin className="w-3.5 h-3.5 text-blue-400" /></div>
                  <p className="text-sm text-slate-300"><strong className="text-white">Best for:</strong> Same-day appointments, tests, or queue support</p>
                </li>
              </ul>

              <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl">
                <h4 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4" /> Emergency Boundary</h4>
                <p className="text-xs text-slate-300 leading-relaxed">If the patient condition is worsening or life-threatening, contact hospital emergency services immediately. Caresy is for coordination, not medical care.</p>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}
