'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Phone, MapPin, Calendar, Clock, Star, ShieldCheck, User } from 'lucide-react';

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

  const getStatusClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'pending' || s === 'draft') return 'pending';
    if (s.includes('review')) return 'review';
    if (s.includes('assigned')) return 'assigned';
    if (s.includes('progress') || s === 'active') return 'active';
    if (s === 'completed') return 'completed';
    return 'pending';
  };

  const renderTimeline = (status: string, companionName: string) => {
    const currentStatus = status.toLowerCase();
    let step1Class = 'pending', step2Class = 'pending', step3Class = 'pending', step4Class = 'pending';
    
    if (currentStatus === 'assigned') {
      step1Class = 'active';
    } else if (currentStatus.includes('arrival') || currentStatus.includes('reached')) {
      step1Class = 'completed';
      step2Class = 'active';
    } else if (currentStatus.includes('progress') || currentStatus.includes('consultation')) {
      step1Class = 'completed';
      step2Class = 'completed';
      step3Class = 'active';
    } else if (currentStatus.includes('medicines') || currentStatus.includes('pharmacy')) {
      step1Class = 'completed';
      step2Class = 'completed';
      step3Class = 'completed';
      step4Class = 'active';
    } else if (currentStatus === 'completed') {
      step1Class = 'completed';
      step2Class = 'completed';
      step3Class = 'completed';
      step4Class = 'completed';
    } else {
      step1Class = 'active';
    }

    return (
      <div className="live-tracker-timeline" style={{ marginTop: '20px', borderTop: '1px dashed var(--line)', paddingTop: '20px' }}>
        <span className="tracker-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--charcoal)', fontSize: '0.95rem', marginBottom: '16px' }}>
          <span className="pulse"></span> Live Companion Journey
        </span>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '16px', opacity: step1Class === 'pending' ? 0.5 : 1 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step1Class === 'completed' ? 'var(--primary)' : step1Class === 'active' ? 'var(--marigold)' : '#ccc', color: '#white', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>
              {step1Class === 'completed' ? '✓' : '1'}
            </div>
            <div>
              <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--charcoal)' }}>Companion Assigned</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0 0' }}>{companionName} is verified, police-cleared, and preparing for the visit.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', opacity: step2Class === 'pending' ? 0.5 : 1 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step2Class === 'completed' ? 'var(--primary)' : step2Class === 'active' ? 'var(--marigold)' : '#ccc', color: '#white', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>
              {step2Class === 'completed' ? '✓' : '2'}
            </div>
            <div>
              <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--charcoal)' }}>Hospital Arrival & Check-In</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0 0' }}>Companion guides patient through registration, billing queues, and waits in the lounge.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', opacity: step3Class === 'pending' ? 0.5 : 1 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step3Class === 'completed' ? 'var(--primary)' : step3Class === 'active' ? 'var(--marigold)' : '#ccc', color: '#white', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>
              {step3Class === 'completed' ? '✓' : '3'}
            </div>
            <div>
              <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--charcoal)' }}>Doctor Consultation Support</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0 0' }}>Companion records follow-up dates, notes down doctor instructions, and updates family.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', opacity: step4Class === 'pending' ? 0.5 : 1 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step4Class === 'completed' ? 'var(--primary)' : step4Class === 'active' ? 'var(--marigold)' : '#ccc', color: '#white', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>
              {step4Class === 'completed' ? '✓' : '4'}
            </div>
            <div>
              <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--charcoal)' }}>Medicines & Return</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0 0' }}>Companion collects pharmacy medicines and guides patient safely to the exit gates.</p>
            </div>
          </div>

        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <main className="page my-bookings-page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <section className="page-hero reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
          <p>Loading your bookings...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page my-bookings-page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <section className="page-hero reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 24px' }}>
          <p className="eyebrow">Your Account</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0' }}>My Bookings</h1>
          <p style={{ color: 'var(--muted)' }}>Track your submitted care requests, matching status, and history of hospital companions.</p>
        </section>

        <div className="dashboard-layout" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <div className="unauth-card material-card reveal active" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
            <h2>Authentication Required</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Please sign in with your phone number to access your booking dashboard and track companion matches.</p>
            <button className="btn btn-primary" onClick={() => openLogin(() => fetchBookings())} style={{ display: 'inline-flex' }}>Sign In / Register</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page my-bookings-page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section className="page-hero reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <p className="eyebrow">Your Account</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0' }}>My Bookings</h1>
        <p style={{ color: 'var(--muted)' }}>Track your submitted care requests, matching status, and history of hospital companions.</p>
      </section>

      <div className="dashboard-layout" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
        <div className="booking-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bookings.length === 0 ? (
            <div className="empty-state material-card reveal active" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📅</div>
              <h3>No Bookings Yet</h3>
              <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>You haven't scheduled any companions yet. Get started by booking a service.</p>
              <Link className="btn btn-primary" href="/booking" style={{ display: 'inline-flex' }}>Schedule a Visit</Link>
            </div>
          ) : (
            bookings.map((booking) => {
              const statusClass = getStatusClass(booking.status);
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
                <div key={booking.id} className="booking-card material-card reveal active" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="booking-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
                    <div>
                      <h2 className="booking-card-id" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>CRS-{booking.id.split('-')[0].toUpperCase()}</h2>
                      <span className="booking-date-stamp" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Created: {formattedDate}</span>
                    </div>
                    <span className={`status-badge ${statusClass}`} style={{ padding: '6px 12px', fontSize: '0.74rem', borderRadius: '99px', fontWeight: 800 }}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="booking-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingBottom: '12px' }}>
                    <div className="detail-item">
                      <span className="detail-label" style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Patient</span>
                      <span className="detail-value" style={{ fontSize: '0.94rem', fontWeight: 600 }}>{booking.patient?.full_name || '—'} {booking.patient?.age ? `(${booking.patient.age} yrs)` : ''}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label" style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Hospital</span>
                      <span className="detail-value" style={{ fontSize: '0.94rem', fontWeight: 600 }}>{booking.pickup_location?.title || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label" style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Department</span>
                      <span className="detail-value" style={{ fontSize: '0.94rem', fontWeight: 600 }}>{customMeta.department || 'General'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label" style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Service Plan</span>
                      <span className="detail-value" style={{ fontSize: '0.94rem', fontWeight: 600 }}>{customMeta.originalService || booking.service_type}</span>
                    </div>
                    {careNeeds.length > 0 && (
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <span className="detail-label" style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700, marginBottom: '6px' }}>Specific Needs</span>
                        <div className="needs-tags" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {careNeeds.map((need, idx) => (
                            <span key={idx} className="need-tag" style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '8px', background: 'var(--sage)', color: 'var(--primary-dark)', fontWeight: 700 }}>
                              {need}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {booking.special_instructions && (
                    <div style={{ background: 'rgba(33, 48, 44, 0.03)', padding: '12px', borderRadius: '12px', fontSize: '0.88rem', color: 'var(--charcoal)' }}>
                      <strong>Notes:</strong> {booking.special_instructions}
                    </div>
                  )}

                  {companion && (
                    <div style={{ borderTop: '1px dashed var(--line)', paddingTop: '16px', marginTop: '8px' }}>
                      <strong style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Assigned Hospital Companion</strong>
                      <div style={{ background: 'rgba(8, 121, 111, 0.04)', border: '1px solid rgba(8, 121, 111, 0.12)', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '1.25rem', fontWeight: 900, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                          {companion.photo ? <img src={companion.photo} alt={companion.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (companion.avatar || 'C')}
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--ink)', display: 'block' }}>{companion.name}</strong>
                          <span style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Star style={{ width: '12px', height: '12px', fill: 'var(--amber)', stroke: 'var(--amber)' }} /> {companion.rating}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '8px', background: 'var(--surface)', color: 'var(--primary-dark)', fontWeight: 800, border: '1px solid var(--line)' }}>{companion.verification}</span>
                          <span style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '8px', background: 'var(--surface)', color: 'var(--primary-dark)', fontWeight: 800, border: '1px solid var(--line)' }}>{companion.lang}</span>
                          <span style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '8px', background: 'var(--mint)', color: 'var(--primary-dark)', fontWeight: 800 }}>{companion.specialty}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {companion && renderTimeline(booking.status, companion.name)}

                  <div className="booking-actions-row" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    {companion ? (
                      <>
                        <a 
                          className="btn btn-primary" 
                          href={`https://wa.me/919717500225?text=Hi,%20checking%20status%20for%20booking%20CRS-${booking.id.split('-')[0].toUpperCase()}`} 
                          target="_blank" 
                          rel="noopener" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}
                        >
                          <MessageSquare style={{ width: '16px', height: '16px' }} /> Chat with Companion
                        </a>
                        <a 
                          className="btn btn-outline" 
                          href="tel:+919717500225" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}
                        >
                          <Phone style={{ width: '16px', height: '16px' }} /> Call Dispatch
                        </a>
                      </>
                    ) : (
                      <a 
                        className="btn btn-primary" 
                        href={`https://wa.me/919717500225?text=Hi,%20checking%20assignment%20status%20for%20booking%20CRS-${booking.id.split('-')[0].toUpperCase()}`} 
                        target="_blank" 
                        rel="noopener" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}
                      >
                        <MessageSquare style={{ width: '16px', height: '16px' }} /> Contact Support
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
