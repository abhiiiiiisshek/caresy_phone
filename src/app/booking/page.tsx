'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Star, Calendar as CalendarIcon, User, MapPin, ClipboardList, ShieldCheck, ArrowRight, Loader2, Phone, MessageSquare } from 'lucide-react';

const COMPANION_DATABASE = {
  cardiology: {
    name: 'Priya Sharma',
    avatar: 'PS',
    photo: '/assets/caresy-companion-priya.png',
    rating: '4.9 (82 visits)',
    verification: 'Police Verified',
    lang: 'Hindi, English',
    specialty: 'Cardiology',
    color: '#08796f'
  },
  orthopedics: {
    name: 'Anil Kumar',
    avatar: 'AK',
    photo: '/assets/caresy-companion-anil.png',
    rating: '4.8 (120 visits)',
    verification: 'Police Verified',
    lang: 'Kannada, Tamil, English',
    specialty: 'Orthopedics',
    color: '#08796f'
  },
  general: {
    name: 'Sarah Mathews',
    avatar: 'SM',
    photo: '/assets/caresy-companion-sarah.png',
    rating: '4.9 (65 visits)',
    verification: 'Police Verified',
    lang: 'Malayalam, Telugu, English',
    specialty: 'General Care',
    color: '#08796f'
  }
};

export default function Booking() {
  const { user, openLogin } = useAuth();

  // Step 1: Patient details
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergency, setEmergency] = useState('');

  // Step 2: Appointment details
  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('');
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [language, setLanguage] = useState('No preference');

  // Step 3: Support needed
  const [service, setService] = useState('Hospital Companion');
  const [careNeeds, setCareNeeds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);

  // Live status states
  const [deskCompanions, setDeskCompanions] = useState(8);
  const [callbackMin, setCallbackMin] = useState(6);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallbackMin(4 + Math.floor(Math.random() * 5));
      setDeskCompanions(5 + Math.floor(Math.random() * 7));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckboxChange = (need: string) => {
    if (careNeeds.includes(need)) {
      setCareNeeds(careNeeds.filter(n => n !== need));
    } else {
      setCareNeeds([...careNeeds, need]);
    }
  };

  const getServicePrice = () => {
    if (service.includes('Pickup')) return '₹899';
    if (service.includes('Full Day')) return '₹1,299';
    if (service.includes('Custom')) return 'Quote after review';
    return '₹499';
  };

  const getMatchedCompanion = () => {
    if (!patientName && !hospital && !department) return null;
    const deptLower = department.toLowerCase();
    if (deptLower.includes('cardio') || deptLower.includes('heart')) {
      return COMPANION_DATABASE.cardiology;
    }
    if (deptLower.includes('ortho') || deptLower.includes('physio') || deptLower.includes('bone') || deptLower.includes('joint')) {
      return COMPANION_DATABASE.orthopedics;
    }
    return COMPANION_DATABASE.general;
  };

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
          age: age ? parseInt(age) : null,
          emergency_contact_phone: emergency || null,
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

      let serviceEnum = 'HOSPITAL_COMPANION';
      if (service.includes('Pickup')) serviceEnum = 'APPOINTMENT_ASSISTANCE';
      else if (service.includes('Full Day')) serviceEnum = 'HOSPITAL_COMPANION';
      else if (service.includes('Custom')) serviceEnum = 'HOSPITAL_COMPANION';

      const scheduledStart = new Date(`${date}T${time}:00`);
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_user_id: currentUser.id,
          patient_id: patientData.id,
          pickup_location_id: locationData.id,
          service_type: serviceEnum,
          booking_type: 'SCHEDULED',
          status: 'PENDING',
          scheduled_start_time: scheduledStart.toISOString(),
          special_instructions: notes || '',
          estimated_duration_minutes: service.includes('Full Day') ? 480 : 240,
          service_metadata: {
            customerEmail: email,
            customerPhone: phone,
            doctor,
            department,
            language,
            careNeeds,
            originalService: service,
          },
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      setSuccessBookingId(`CRS-${bookingData.id.split('-')[0].toUpperCase()}`);
    } catch (err: any) {
      console.error('Error submitting booking request:', err);
      alert(err.message || 'Failed to submit booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const matched = getMatchedCompanion();

  if (successBookingId) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 pt-28">
        <div className="w-full max-w-lg p-8 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Request Generated!</h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">
            We have received your booking request. An admin will review it shortly and assign a companion.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-8 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 uppercase font-semibold mb-1">Booking ID</p>
            <p className="text-2xl font-black text-marigold-deep">{successBookingId}</p>
          </div>
          
          <div className="space-y-4">
            <Link href="/my-bookings" className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-marigold to-orange-500 hover:from-marigold-deep hover:to-orange-600 text-ink-teal font-bold rounded-xl transition-all shadow-lg shadow-marigold/20 hover:shadow-xl hover:-translate-y-1">
              Go to My Bookings
            </Link>
            <Link href="/" className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl transition-colors">
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-24 pb-20 relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-teal-200/30 dark:bg-teal-900/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />
      <div className="absolute top-[50%] left-[-10%] w-[30%] h-[30%] bg-marigold/10 dark:bg-marigold-deep/10 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        <header className="mb-10 text-center md:text-left animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 text-xs font-bold uppercase tracking-wider mb-4">
            <CalendarIcon className="w-4 h-4" /> Planned Hospital Visit
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
            Book a companion for an <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-teal-700 dark:from-teal-400 dark:to-teal-200">upcoming appointment.</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Use this when the visit is not urgent and you know the hospital, date, time, and patient support needs.
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
                Desk Status: <strong className="text-green-500">Active</strong> &bull; Callback: <strong>~{callbackMin} mins</strong> &bull; Companions Online: <strong>{deskCompanions}</strong>
              </p>
            </div>
          </div>
          <a href="https://wa.me/919717500225" target="_blank" rel="noopener" className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl transition-colors">
            <MessageSquare className="w-4 h-4" /> Chat on WhatsApp
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          
          {/* Main Form */}
          <form onSubmit={handleFormSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            
            {/* Step 1: Patient Details */}
            <div className="mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm"><User className="w-4 h-4" /></div> 
                Patient Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Patient Name</label>
                  <input required name="patientName" type="text" placeholder="e.g. Ramesh Kumar" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Age</label>
                  <input name="age" type="number" min="1" max="120" placeholder="e.g. 68" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Customer Mobile</label>
                  <input required name="phone" type="tel" placeholder="+91 97175 00225" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Customer Email</label>
                  <input required name="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Emergency Contact (Optional)</label>
                <input name="emergency" type="tel" placeholder="+91 99887 77665" value={emergency} onChange={(e) => setEmergency(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
              </div>
            </div>

            {/* Step 2: Appointment Details */}
            <div className="mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm"><MapPin className="w-4 h-4" /></div> 
                Appointment Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hospital/Clinic Name</label>
                  <input required name="hospital" type="text" placeholder="e.g. Max Hospital, Saket" value={hospital} onChange={(e) => setHospital(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Department</label>
                  <input name="department" type="text" placeholder="e.g. Cardiology" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Doctor Name (Optional)</label>
                  <input name="doctor" type="text" placeholder="e.g. Dr. Mehta" value={doctor} onChange={(e) => setDoctor(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Appointment Date</label>
                  <input required name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Appointment Time</label>
                  <input required name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Preferred Language</label>
                  <select name="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all">
                    <option>No preference</option>
                    <option>Hindi</option>
                    <option>English</option>
                    <option>Tamil</option>
                    <option>Telugu</option>
                    <option>Kannada</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 3: Support Needed */}
            <div className="mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm"><ClipboardList className="w-4 h-4" /></div> 
                Support Needed
              </h2>
              <div className="space-y-2 mb-6">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Service Type</label>
                <select name="service" value={service} onChange={(e) => setService(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all">
                  <option value="Hospital Companion">Hospital Companion (₹499)</option>
                  <option value="Hospital Companion + Pickup">Hospital Companion + Pickup (₹899)</option>
                  <option value="Full Day Companion">Full Day Companion (₹1,299)</option>
                  <option value="Custom Support">Custom Support (Quote after review)</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-3">Additional Care Needs</label>
                <div className="space-y-3">
                  {['Wheelchair', 'Walking assistance', 'Medicine collection'].map(need => (
                    <label key={need} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${careNeeds.includes(need) ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-teal-300'}`}>
                      <input type="checkbox" value={need} checked={careNeeds.includes(need)} onChange={() => handleCheckboxChange(need)} className="w-5 h-5 accent-teal-600" />
                      <span className={`font-semibold ${careNeeds.includes(need) ? 'text-teal-800 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>{need}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Medical Notes & Instructions</label>
                <textarea name="notes" rows={4} placeholder="Medical history, specific location in hospital, mobility constraints..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none transition-all"></textarea>
              </div>
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating Booking...</> : <>Generate Booking Request <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          {/* Sidebar Area */}
          <aside className="space-y-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            
            {/* Summary Widget */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-3xl p-6">
              <p className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-2">Request Preview</p>
              <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">
                {patientName && hospital ? 'CRS-READY' : 'CRS-XXXX'}
              </h3>
              
              <ul className="space-y-4 mb-6">
                <li className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
                  <span className={`font-medium ${patientName && hospital ? 'text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {patientName && hospital ? 'Ready to Request' : 'Form incomplete'}
                  </span>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Patient & Hospital</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{patientName || '—'} @ {hospital || '—'}</span>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Service</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{service} <strong className="text-marigold-deep">({getServicePrice()})</strong></span>
                </li>
              </ul>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">What happens next?</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Operations reviews your request and assigns the best matching companion based on distance, language, and medical department.</p>
              </div>
            </div>

            {/* Companion Matcher */}
            <div className="bg-teal-900 text-white rounded-3xl shadow-xl p-6 relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-teal-800 blur-[40px] rounded-full pointer-events-none" />
              
              <div className="relative z-10">
                <p className="text-sm text-teal-300 uppercase font-bold tracking-wider mb-2">Live Matching</p>
                <h3 className="text-xl font-bold mb-4">Companion Preview</h3>
                
                {!matched ? (
                  <div className="bg-teal-950/50 rounded-xl p-4 border border-teal-800/50">
                    <p className="text-sm text-teal-200">Start typing hospital and department details to see available companions...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-teal-950/50 p-4 rounded-2xl border border-teal-800/50">
                      <img src={matched.photo} alt={matched.name} className="w-14 h-14 rounded-xl object-cover border border-teal-700" />
                      <div>
                        <strong className="block text-lg font-bold">{matched.name}</strong>
                        <div className="flex items-center gap-1 text-marigold text-sm font-medium">
                          <Star className="w-4 h-4 fill-current" /> {matched.rating}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 text-xs font-bold bg-white/10 rounded-lg flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> {matched.verification}
                      </span>
                      <span className="px-2 py-1 text-xs font-bold bg-white/10 rounded-lg">{matched.lang}</span>
                      <span className="px-2 py-1 text-xs font-bold bg-teal-500 text-white rounded-lg">{matched.specialty}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
          </aside>

        </div>
      </div>
    </main>
  );
}
