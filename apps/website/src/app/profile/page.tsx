'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { Phone, Mail, FileText, LogOut, CalendarCheck, CircleCheckBig, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@caresy/ui';

function StatTile({ icon: Icon, value, label, color = 'var(--teal)' }: { icon: React.ElementType; value: string | number; label: string; color?: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, background: 'var(--paper)', color, marginBottom: 10 }}>
        <Icon style={{ width: 17, height: 17 }} />
      </span>
      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ink-teal)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
      <Icon style={{ width: 17, height: 17, color: 'var(--teal)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{label}</div>
        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--ink-teal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, profile, isAdmin, isLoading: authIsLoading, openLogin, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{ total: number; completed: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('bookings')
      .select('status')
      .then(({ data }) => {
        if (!data) return;
        setStats({
          total: data.length,
          completed: data.filter((b) => b.status === 'COMPLETED').length,
        });
      });
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (authIsLoading) {
    return (
      <main className="app-shell-page" id="main-content">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '80px 24px' }}>
          <Loader2 style={{ width: '40px', height: '40px', color: 'var(--primary)' }} className="animate-spin" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell-page" id="main-content">
        <section className="page-hero" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <p className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>Your account</p>
          <h1>Profile</h1>
        </section>
        <div className="dashboard-layout" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="unauth-card material-card">
            <h2>Sign in to see your profile</h2>
            <p>Track your bookings, update your details, and reach support faster.</p>
            <Button variant="primary" onClick={() => openLogin('/profile')}>Sign In / Register</Button>
          </div>
        </div>
      </main>
    );
  }

  const displayName = profile?.full_name || (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || 'there';
  const initial = displayName.charAt(0).toUpperCase();
  const memberSince = new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <main className="app-shell-page" id="main-content">
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '0 24px' }}>
        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0 8px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1.6rem', flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>{displayName}</h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Member since {memberSince}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="section-title" style={{ padding: '24px 0 8px' }}>
          <p className="section-kicker">Your care journey</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
          <StatTile icon={CalendarCheck} value={stats ? stats.total : '—'} label="Total bookings" color="var(--teal)" />
          <StatTile icon={CircleCheckBig} value={stats ? stats.completed : '—'} label="Completed" color="var(--success)" />
        </div>

        {/* Account details */}
        <div className="section-title" style={{ padding: '24px 0 8px' }}>
          <p className="section-kicker">Account details</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 8 }}>
          <InfoRow icon={Mail} label="Email" value={user.email || '—'} />
          {profile?.phone && (
            <div style={{ borderTop: '1px solid var(--line)' }}>
              <InfoRow icon={Phone} label="Mobile" value={profile.phone} />
            </div>
          )}
          {profile?.age && (
            <div style={{ borderTop: '1px solid var(--line)' }}>
              <InfoRow icon={CalendarCheck} label="Age" value={String(profile.age)} />
            </div>
          )}
        </div>

        {/* Admin — only rendered for accounts in the admin_users allowlist */}
        {isAdmin && (
          <>
            <div className="section-title" style={{ padding: '24px 0 8px' }}>
              <p className="section-kicker">Admin</p>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 8 }}>
              <a href="/admin-ops" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <ShieldCheck style={{ width: 16, height: 16, color: 'var(--marigold)' }} />
                  <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink-teal)' }}>Admin Operations</span>
                </div>
              </a>
            </div>
          </>
        )}

        {/* Legal / support */}
        <div className="section-title" style={{ padding: '24px 0 8px' }}>
          <p className="section-kicker">Legal & support</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 24 }}>
          <a href="/support" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <Phone style={{ width: 16, height: 16, color: 'var(--muted)' }} />
              <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink-teal)' }}>Contact Support</span>
            </div>
          </a>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <a href="/terms" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <FileText style={{ width: 16, height: 16, color: 'var(--muted)' }} />
                <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink-teal)' }}>Terms & Policies</span>
              </div>
            </a>
          </div>
        </div>

        <Button variant="outline" full onClick={handleLogout} iconLeft={<LogOut style={{ width: '16px', height: '16px' }} />} style={{ color: 'var(--terracotta)', borderColor: 'rgba(196,85,67,0.4)' }}>
          Log out
        </Button>
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--muted)', margin: '14px 0 40px' }}>Caresy v2.0 · Made with care in India</p>
      </section>
    </main>
  );
}
