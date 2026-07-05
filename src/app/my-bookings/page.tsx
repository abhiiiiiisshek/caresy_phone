'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Phone, Calendar, Star, ShieldCheck, Check, Clock, User, MapPin, Activity, ArrowRight, Loader2 } from 'lucide-react';

interface CompanionDetails {
  name: string;
  avatar: string;
  rating: string;
  verification: string;
  lang: string;
  specialty: string;
  color?: string;
  photo?: string;
}

interface BookingRecord {
  id: string;
  status: string;
  created_at: string;
  scheduled_start_time: string | null;
  special_instructions: string | null;
  service_type: string;
  booking_type: string;
  service_metadata: any;
  patient?: any;
  pickup_location?: any;
}

export default function MyBookings() {
  const { user, openLogin } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = async () => {
    setIsLoading(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          scheduled_start_time,
          special_instructions,
          estimated_duration_minutes,
          service_type,
          booking_type,
          service_metadata,
          patient:patients (
            full_name,
            age,
            emergency_contact_phone
          ),
          pickup_location:locations!pickup_location_id (
            title,
            address_line_1
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const getStatusInfo = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'pending' || s === 'draft') return { label: 'Pending Assignment', color: 'bg-marigold text-marigold-deep border-marigold/50 dark:bg-marigold/20 dark:text-marigold dark:border-marigold/30' };
    if (s.includes('review')) return { label: 'Under Review', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' };
    if (s.includes('assigned')) return { label: 'Companion Assigned', color: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' };
    if (s.includes('progress') || s === 'active') return { label: 'Active Visit', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' };
    if (s === 'completed') return { label: 'Completed', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
  };

  const renderTimeline = (status: string, companionName: string) => {
    const currentStatus = status.toLowerCase();
    let step1Active = false, step1Completed = false;
    let step2Active = false, step2Completed = false;
    let step3Active = false, step3Completed = false;
    let step4Active = false, step4Completed = false;
    
    if (currentStatus === 'assigned') {
      step1Active = true;
    } else if (currentStatus.includes('arrival') || currentStatus.includes('reached')) {
      step1Completed = true;
      step2Active = true;
    } else if (currentStatus.includes('progress') || currentStatus.includes('consultation')) {
      step1Completed = true;
      step2Completed = true;
      step3Active = true;
    } else if (currentStatus.includes('medicines') || currentStatus.includes('pharmacy')) {
      step1Completed = true;
      step2Completed = true;
      step3Completed = true;
      step4Active = true;
    } else if (currentStatus === 'completed') {
      step1Completed = true;
      step2Completed = true;
      step3Completed = true;
      step4Completed = true;
    } else {
      step1Active = true; // Fallback
    }

    const Step = ({ title, desc, active, completed, num, last }: any) => {
      const isPast = completed;
      const isCurrent = active;
      const isFuture = !completed && !active;
      
      return (
        <div className={`flex gap-4 ${isFuture ? 'opacity-50' : ''} relative`}>
          {!last && (
            <div className={`absolute left-3 top-8 bottom-[-16px] w-[2px] ${isPast ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          )}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 relative z-10 transition-colors ${
            isPast ? 'bg-teal-500 text-white' : 
            isCurrent ? 'bg-marigold text-marigold-deep border-2 border-marigold ring-4 ring-marigold/20' : 
            'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }`}>
            {isPast ? <Check className="w-3 h-3" /> : num}
          </div>
          <div className="pb-6">
            <strong className={`block text-sm ${isCurrent ? 'text-teal-700 dark:text-teal-400 font-extrabold' : 'text-slate-900 dark:text-slate-100 font-bold'}`}>{title}</strong>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{desc}</p>
          </div>
        </div>
      );
    };

    return (
      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <span className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm mb-6">
          <Activity className="w-4 h-4 text-marigold" /> Live Companion Journey
        </span>
        
        <div className="flex flex-col">
          <Step num="1" title="Companion Assigned" desc={`${companionName} is verified, police-cleared, and preparing for the visit.`} active={step1Active} completed={step1Completed} />
          <Step num="2" title="Hospital Arrival & Check-In" desc="Companion guides patient through registration, billing queues, and waits in the lounge." active={step2Active} completed={step2Completed} />
          <Step num="3" title="Doctor Consultation Support" desc="Companion records follow-up dates, notes down doctor instructions, and updates family." active={step3Active} completed={step3Completed} />
          <Step num="4" title="Medicines & Return" desc="Companion collects pharmacy medicines and guides patient safely to the exit gates." active={step4Active} completed={step4Completed} last />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading your bookings...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-20 relative overflow-hidden">
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-teal-200/30 dark:bg-teal-900/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />
        <div className="absolute top-[50%] left-[-10%] w-[30%] h-[30%] bg-marigold/10 dark:bg-marigold-deep/10 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <header className="mb-10 text-center animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
              My <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-teal-700 dark:from-teal-400 dark:to-teal-200">Bookings</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Track your submitted care requests, matching status, and history of hospital companions.
            </p>
          </header>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Authentication Required</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Please sign in with your phone number to access your booking dashboard and track companion matches.
            </p>
            <button onClick={() => openLogin(() => fetchBookings())} className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 transition-all">
              Sign In / Register
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-20 relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-teal-200/30 dark:bg-teal-900/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />
      <div className="absolute top-[50%] left-[-10%] w-[30%] h-[30%] bg-marigold/10 dark:bg-marigold-deep/10 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <header className="mb-10 md:text-left animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-4">
            <User className="w-4 h-4" /> Your Account
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
            My <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-teal-700 dark:from-teal-400 dark:to-teal-200">Bookings</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Track your submitted care requests, matching status, and history of hospital companions.
          </p>
        </header>

        <div className="space-y-6">
          {bookings.length === 0 ? (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">No Bookings Yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                You haven't scheduled any companions yet. Get started by booking a service.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/booking" className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 transition-all">
                  Schedule a Visit
                </Link>
                <Link href="/quick-help" className="px-8 py-4 bg-gradient-to-r from-marigold to-orange-500 hover:from-marigold-deep hover:to-orange-600 text-ink-teal font-bold rounded-xl shadow-lg shadow-marigold/20 transition-all">
                  Get Urgent Help
                </Link>
              </div>
            </div>
          ) : (
            bookings.map((booking, index) => {
              const statusInfo = getStatusInfo(booking.status);
              const customMeta = booking.service_metadata || {};
              const companion: CompanionDetails | null = customMeta.companion || null;
              
              const formattedDate = booking.scheduled_start_time
                ? new Date(booking.scheduled_start_time).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : new Date(booking.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

              const careNeeds: string[] = customMeta.careNeeds || [];

              return (
                <div key={booking.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: `${(index + 1) * 100}ms` }}>
                  
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                          CRS-{booking.id.split('-')[0].toUpperCase()}
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" /> Created on {new Date(booking.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {/* Actions Desktop */}
                    <div className="hidden md:flex items-center gap-3">
                      {companion ? (
                        <>
                          <a href={`https://wa.me/919717500225?text=Hi,%20checking%20status%20for%20booking%20CRS-${booking.id.split('-')[0].toUpperCase()}`} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors">
                            <MessageSquare className="w-4 h-4" /> Chat
                          </a>
                          <a href="tel:+919717500225" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors">
                            <Phone className="w-4 h-4" /> Call
                          </a>
                        </>
                      ) : (
                        <a href={`https://wa.me/919717500225?text=Hi,%20checking%20assignment%20status%20for%20booking%20CRS-${booking.id.split('-')[0].toUpperCase()}`} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold rounded-xl transition-colors">
                          <MessageSquare className="w-4 h-4" /> Contact Support
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient</span>
                      <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {booking.patient?.full_name || '—'} {booking.patient?.age ? <span className="text-slate-500 font-normal">({booking.patient.age}y)</span> : ''}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hospital</span>
                      <p className="font-semibold text-slate-900 dark:text-white truncate" title={booking.pickup_location?.title}>
                        {booking.pickup_location?.title || '—'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Schedule</span>
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {formattedDate}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service</span>
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {customMeta.originalService || booking.service_type}
                      </p>
                    </div>
                  </div>

                  {/* Needs & Notes */}
                  {(careNeeds.length > 0 || booking.special_instructions) && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
                      {careNeeds.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Specific Needs</span>
                          <div className="flex flex-wrap gap-2">
                            {careNeeds.map((need, idx) => (
                              <span key={idx} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg shadow-sm">
                                {need}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {booking.special_instructions && (
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</span>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{booking.special_instructions}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Companion Profile */}
                  {companion && (
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">Assigned Companion</span>
                      <div className="bg-gradient-to-r from-teal-50 to-white dark:from-teal-900/10 dark:to-slate-900 border border-teal-100 dark:border-teal-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl font-bold overflow-hidden shrink-0 shadow-inner">
                          {companion.photo ? <img src={companion.photo} alt={companion.name} className="w-full h-full object-cover" /> : (companion.avatar || 'C')}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {companion.name}
                            <span className="flex items-center gap-1 text-sm text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg">
                              <Star className="w-3 h-3 fill-current" /> {companion.rating}
                            </span>
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-green-500" /> {companion.verification}
                            </span>
                            <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                              {companion.lang}
                            </span>
                            <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg">
                              {companion.specialty}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {companion && renderTimeline(booking.status, companion.name)}

                  {/* Actions Mobile */}
                  <div className="mt-6 flex md:hidden gap-3">
                    {companion ? (
                      <>
                        <a href={`https://wa.me/919717500225?text=Hi,%20checking%20status%20for%20booking%20CRS-${booking.id.split('-')[0].toUpperCase()}`} target="_blank" rel="noopener" className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl">
                          <MessageSquare className="w-4 h-4" /> Chat
                        </a>
                        <a href="tel:+919717500225" className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl">
                          <Phone className="w-4 h-4" /> Call
                        </a>
                      </>
                    ) : (
                      <a href={`https://wa.me/919717500225?text=Hi,%20checking%20assignment%20status%20for%20booking%20CRS-${booking.id.split('-')[0].toUpperCase()}`} target="_blank" rel="noopener" className="w-full flex items-center justify-center gap-2 py-3 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold rounded-xl">
                        <MessageSquare className="w-4 h-4" /> Contact Support
                      </a>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
