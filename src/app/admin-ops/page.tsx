'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { COMPANIONS, findCompanionByName, ratingLabel } from '@/data/companions';
import { Button, Input } from '@/components/ds';

const STATUS_OPTIONS = [
  'DRAFT',
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
];

interface BookingRecord {
  id: string;
  reference_code: string;
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

export default function AdminOps() {
  const { user, isAdmin, openLogin } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states per card to allow editing before saving
  const [editStates, setEditStates] = useState<Record<string, { companionName: string; status: string }>>({});

  // Ops metrics (backs the "Live Operations Desk" widget on /booking, /quick-help, /trust)
  const [opsMetrics, setOpsMetrics] = useState<{ active_companions: number; avg_callback_minutes: number } | null>(null);
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);


  const fetchOpsMetrics = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ops_metrics')
      .select('active_companions, avg_callback_minutes')
      .eq('id', 1)
      .single();
    if (!error && data) setOpsMetrics(data);
  };

  const handleSaveOpsMetrics = async () => {
    if (!opsMetrics) return;
    setIsSavingMetrics(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('ops_metrics')
        .update({
          active_companions: opsMetrics.active_companions,
          avg_callback_minutes: opsMetrics.avg_callback_minutes,
        })
        .eq('id', 1);
      if (error) throw error;
      showToast('Live Operations Desk numbers updated');
    } catch (err: any) {
      showToast(err.message || 'Error updating ops metrics');
    } finally {
      setIsSavingMetrics(false);
    }
  };

  const fetchAllBookings = async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          reference_code,
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

      // Initialize edit states
      const initialEdits: Record<string, { companionName: string; status: string }> = {};
      (data || []).forEach(b => {
        initialEdits[b.id] = {
          companionName: b.service_metadata?.companion?.name || '',
          status: b.status
        };
      });
      setEditStates(initialEdits);
    } catch (err) {
      console.error('Error fetching admin board:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllBookings();
      fetchOpsMetrics();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async (bookingId: string) => {
    const edit = editStates[bookingId];
    if (!edit) return;

    const matched = findCompanionByName(edit.companionName);
    // Stored in the shape my-bookings/page.tsx expects to render.
    const matchedCompanion = matched ? {
      name: matched.name,
      avatar: matched.avatarInitials,
      photo: matched.photo,
      rating: ratingLabel(matched),
      verification: matched.verification,
      lang: matched.languages,
      specialty: matched.specialty,
      color: matched.color,
    } : null;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const updatedMetadata = {
      ...(booking.service_metadata || {}),
      companion: matchedCompanion
    };

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: edit.status,
          service_metadata: updatedMetadata
        })
        .eq('id', bookingId);

      if (error) throw error;
      showToast(`Updated ${booking.reference_code}`);
      fetchAllBookings();
    } catch (err: any) {
      console.error('Error updating booking:', err);
      showToast(err.message || 'Error updating booking');
    }
  };

  const handleCompanionChange = (bookingId: string, name: string) => {
    setEditStates(prev => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        companionName: name
      }
    }));
  };

  const handleStatusChange = (bookingId: string, status: string) => {
    setEditStates(prev => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        status
      }
    }));
  };

  if (isLoading) {
    return (
      <main className="page admin-page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <section className="page-hero reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
          <p>Loading Operations Desk...</p>
        </section>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main className="page admin-page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <section className="page-hero reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 24px' }}>
          <p className="eyebrow">Dispatcher Command Center</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0' }}>Live Operations Desk</h1>
          <p style={{ color: 'var(--muted)' }}>Monitor patient incoming requests, assign companions, and push milestone progress updates to families.</p>
        </section>

        <div className="dashboard-layout" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <div className="unauth-card material-card reveal active" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
            <h2>Admin Login Required</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Please sign in with an authorized ops account to access the dispatcher dashboard.</p>
            <Button variant="primary" onClick={() => openLogin()}>Ops Sign In</Button>
          </div>
        </div>
      </main>
    );
  }

  // Filter columns
  const pendingBookings = bookings.filter(b => b.status === 'DRAFT' || b.status === 'PENDING');
  const activeBookings = bookings.filter(b => b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS');
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  return (
    <main className="page admin-page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section className="page-hero reveal active" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <p className="eyebrow">Dispatcher Command Center</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0' }}>Live Operations Desk</h1>
        <p style={{ color: 'var(--muted)' }}>Monitor patient incoming requests, assign companions, and push milestone progress updates to families.</p>
        <div style={{ marginTop: 14 }}>
          <Link href="/admin/companions">
            <Button variant="secondary" size="sm">Companion applications →</Button>
          </Link>
        </div>
      </section>

      {opsMetrics && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 24px', padding: '0 24px' }}>
          <div className="material-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '2px' }}>Live Operations Desk numbers</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>Shown on the Booking, Quick Help, and Trust pages. Keep these accurate.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <Input
                label="Companions online"
                type="number"
                min={0}
                value={opsMetrics.active_companions}
                onChange={(e) => setOpsMetrics({ ...opsMetrics, active_companions: parseInt(e.target.value) || 0 })}
                style={{ width: '140px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <Input
                label="Avg callback (mins)"
                type="number"
                min={0}
                value={opsMetrics.avg_callback_minutes}
                onChange={(e) => setOpsMetrics({ ...opsMetrics, avg_callback_minutes: parseInt(e.target.value) || 0 })}
                style={{ width: '140px' }}
              />
            </div>
            <Button variant="primary" disabled={isSavingMetrics} onClick={handleSaveOpsMetrics}>
              {isSavingMetrics ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <div className="admin-layout" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Column 1: Pending */}
        <div style={{ background: 'rgba(33, 48, 44, 0.02)', padding: '16px', borderRadius: '16px', border: '1px dashed var(--line)' }}>
          <div className="column-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>⏳ Pending Requests</h3>
            <span className="badge-count" style={{ background: 'var(--ink)', color: 'var(--surface)', padding: '2px 8px', borderRadius: '99px', fontSize: '0.76rem' }}>{pendingBookings.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingBookings.map(b => renderCard(b))}
          </div>
        </div>

        {/* Column 2: Active */}
        <div style={{ background: 'rgba(33, 48, 44, 0.02)', padding: '16px', borderRadius: '16px', border: '1px dashed var(--line)' }}>
          <div className="column-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>🚗 Active Visits</h3>
            <span className="badge-count" style={{ background: 'var(--ink)', color: 'var(--surface)', padding: '2px 8px', borderRadius: '99px', fontSize: '0.76rem' }}>{activeBookings.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeBookings.map(b => renderCard(b))}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div style={{ background: 'rgba(33, 48, 44, 0.02)', padding: '16px', borderRadius: '16px', border: '1px dashed var(--line)' }}>
          <div className="column-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>✅ Completed</h3>
            <span className="badge-count" style={{ background: 'var(--ink)', color: 'var(--surface)', padding: '2px 8px', borderRadius: '99px', fontSize: '0.76rem' }}>{completedBookings.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {completedBookings.map(b => renderCard(b))}
          </div>
        </div>

      </div>

      {toastMessage && (
        <div className="toast active" style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--primary-dark)', color: 'var(--surface)', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--shadow-2)', fontWeight: 700, zIndex: 100 }}>
          {toastMessage}
        </div>
      )}
    </main>
  );

  function renderCard(b: BookingRecord) {
    const edit = editStates[b.id] || { companionName: '', status: b.status };
    const customMeta = b.service_metadata || {};
    const formattedDate = b.scheduled_start_time
      ? new Date(b.scheduled_start_time).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'INSTANT';

    return (
      <div key={b.id} className="admin-card material-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface)' }}>
        <div className="card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div className="patient-info">
            <strong style={{ fontSize: '1.1rem' }}>{b.patient?.full_name || '—'}</strong>
            <span style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Age: {b.patient?.age || '—'} &bull; Lang: {customMeta.language || 'No preference'}</span>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--muted)' }}>{b.reference_code}</span>
        </div>

        <div className="hospital-lbl" style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{b.pickup_location?.title} ({customMeta.department || 'General'})</div>
        
        <dl className="details-list" style={{ fontSize: '0.86rem', color: 'var(--muted)', background: 'rgba(33, 48, 44, 0.03)', padding: '10px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><dt style={{ fontWeight: 700, color: 'var(--charcoal)' }}>Date/Time</dt><dd>{formattedDate}</dd></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><dt style={{ fontWeight: 700, color: 'var(--charcoal)' }}>Cust Phone</dt><dd>{customMeta.customerPhone || '—'}</dd></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><dt style={{ fontWeight: 700, color: 'var(--charcoal)' }}>Cust Email</dt><dd>{customMeta.customerEmail || '—'}</dd></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><dt style={{ fontWeight: 700, color: 'var(--charcoal)' }}>Emergency</dt><dd>{b.patient?.emergency_contact_phone || '—'}</dd></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><dt style={{ fontWeight: 700, color: 'var(--charcoal)' }}>Plan</dt><dd>{customMeta.originalService || b.service_type}</dd></div>
        </dl>

        {b.special_instructions && (
          <div style={{ fontSize: '0.8rem', borderLeft: '2px solid var(--primary)', paddingLeft: '8px', color: 'var(--muted)' }}>
            <strong>Note:</strong> {b.special_instructions}
          </div>
        )}

        <div className="admin-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '4px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Companion Assignment</label>
          <select 
            className="admin-select" 
            value={edit.companionName} 
            onChange={(e) => handleCompanionChange(b.id, e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '0.88rem' }}
          >
            <option value="">Unassigned</option>
            {COMPANIONS.map(c => (
              <option key={c.name} value={c.name}>{c.name} ({c.specialty})</option>
            ))}
          </select>

          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginTop: '6px' }}>Milestone Status</label>
          <select 
            className="admin-select" 
            value={edit.status} 
            onChange={(e) => handleStatusChange(b.id, e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '0.88rem' }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave(b.id)}
            style={{ marginTop: '6px' }}
          >
            Save Updates
          </Button>
        </div>
      </div>
    );
  }
}
