'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { Phone, Mail, LogOut, CalendarCheck, Loader2, ShieldCheck, UserRound, CreditCard, HeartHandshake, History, ClipboardList, Users, Bell, Lock, Globe, ChevronRight, Settings, Activity as ActivityIcon, UserCog } from 'lucide-react';
import { Button } from '@caresy/ui';

const EPILOGUE = 'var(--font-epilogue), sans-serif';
const SUPPORT_WA = '919717500225';
const supWa = (topic: string) => `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(`Hello Caresy Support,\n\nI need help with: ${topic}.`)}`;

function SettingsRow({ icon: Icon, label, sub, href, onClick, tinted }: {
  icon: React.ElementType; label: string; sub?: string; href?: string; onClick?: () => void; tinted?: boolean;
}) {
  const inner = (
    <>
      <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: tinted ? '#e1e3de' : 'var(--m3-chip)', color: 'var(--m3-green-deep)', flexShrink: 0 }}>
        <Icon style={{ width: 18, height: 18 }} />
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontSize: 16, lineHeight: '24px', letterSpacing: '0.5px', color: 'var(--m3-ink)' }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>{sub}</span>}
      </span>
      <ChevronRight style={{ width: 14, height: 14, color: 'var(--m3-muted)', flexShrink: 0 }} />
    </>
  );
  const style: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: 16, borderRadius: 12, background: tinted ? 'var(--m3-chip)' : 'transparent', textDecoration: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' };
  if (onClick) return <button onClick={onClick} style={style}>{inner}</button>;
  if (href?.startsWith('http')) return <a href={href} target="_blank" rel="noopener" style={style}>{inner}</a>;
  return <Link href={href || '#'} style={style}>{inner}</Link>;
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 25, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-bg)', border: '1px solid rgba(192,201,195,0.3)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 500, color: 'var(--m3-green-deep)' }}>
        <Icon style={{ width: 20, height: 20 }} />
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
      <Icon style={{ width: 17, height: 17, color: 'var(--m3-green)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--m3-muted)' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--m3-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, profile, isAdmin, isLoading: authIsLoading, openLogin, signOut } = useAuth();
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (authIsLoading) {
    return (
      <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 24px' }}>
          <Loader2 style={{ width: 40, height: 40, color: 'var(--m3-green)' }} className="animate-spin" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, paddingBottom: 96 }}>
        <div style={{ maxWidth: 576, margin: '0 auto', padding: 16 }}>
          <h1 style={{ margin: '0 0 16px', fontSize: 28, lineHeight: '34px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>Profile</h1>
          <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-chip)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 500, color: 'var(--m3-ink)' }}>Sign in to see your profile</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--m3-muted)' }}>Track your bookings, update your details, and reach support faster.</p>
            <Button variant="primary" onClick={() => openLogin('/profile')}>Sign In / Register</Button>
          </div>
        </div>
      </main>
    );
  }

  const displayName = profile?.full_name || (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || 'there';
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUrl = (user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || null;
  const memberSince = new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, paddingBottom: 96 }}>
      <div style={{ maxWidth: 576, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32, padding: '16px 16px 64px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/caresy-logo.jpg" alt="" style={{ width: 37, height: 32, borderRadius: 999, objectFit: 'cover' }} />
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>Profile</h1>
        </div>

        {/* Profile header card */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 24, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-chip)' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', border: '4px solid var(--m3-bg)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'grid', placeItems: 'center', background: 'var(--m3-green)' }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 34 }}>{initial}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <h2 style={{ margin: 0, fontSize: 32, lineHeight: '40px', fontWeight: 400, color: 'var(--m3-ink)', textAlign: 'center' }}>{displayName}</h2>
            <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--m3-muted)' }}>
              {profile?.age ? `Age ${profile.age}` : `Member since ${memberSince}`}
            </span>
            <div style={{ display: 'flex', gap: 8, paddingTop: 12 }}>
              <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--m3-green)', color: 'var(--m3-green-soft)', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px' }}>Caresy Member</span>
              <span style={{ padding: '4px 12px', borderRadius: 999, background: '#e1e3de', color: 'var(--m3-muted)', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px' }}>Verified Identity</span>
            </div>
          </div>
          <a href={supWa('updating my profile details')} target="_blank" rel="noopener" style={{ width: '100%', padding: '12px 24px', borderRadius: 999, background: 'var(--m3-green-deep)', color: '#fff', fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
            Edit Profile
          </a>
        </section>

        {/* Account settings */}
        <Section icon={UserCog} title="Account Settings">
          <SettingsRow icon={UserRound} label="Personal Information" onClick={() => setShowInfo(!showInfo)} />
          {showInfo && (
            <div style={{ borderRadius: 12, background: 'var(--m3-surface)', border: '1px solid var(--m3-line)', overflow: 'hidden' }}>
              <InfoRow icon={Mail} label="Email" value={user.email || '—'} />
              {profile?.phone && <div style={{ borderTop: '1px solid var(--m3-line)' }}><InfoRow icon={Phone} label="Mobile" value={profile.phone} /></div>}
              {profile?.age && <div style={{ borderTop: '1px solid var(--m3-line)' }}><InfoRow icon={CalendarCheck} label="Age" value={String(profile.age)} /></div>}
            </div>
          )}
          <SettingsRow icon={CreditCard} label="Payment Methods" href={supWa('payment methods')} />
          <SettingsRow icon={HeartHandshake} label="Companion Preferences" href={supWa('my companion preferences')} />
          {isAdmin && <SettingsRow icon={ShieldCheck} label="Admin Operations" href="https://admin.caresy.co.in/ops" />}
        </Section>

        {/* Activity */}
        <Section icon={ActivityIcon} title="Activity">
          <SettingsRow icon={History} label="Past Bookings" href="/my-bookings" />
          <SettingsRow icon={ClipboardList} label="Care Logs" href="/my-bookings" />
          <SettingsRow icon={Users} label="Family Members" href={supWa('adding a family member')} />
        </Section>

        {/* App settings */}
        <Section icon={Settings} title="App Settings">
          <SettingsRow tinted icon={Bell} label="Notifications" href={supWa('notification preferences')} />
          <SettingsRow tinted icon={Lock} label="Privacy & Security" href="/privacy" />
          <SettingsRow tinted icon={Globe} label="Language" sub="English" href={supWa('using Caresy in another language')} />
        </Section>

        {/* Log out */}
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 32px', borderRadius: 999, border: 'none', background: 'var(--m3-urgent-bg)', color: 'var(--m3-urgent-ink)', fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', cursor: 'pointer', fontFamily: 'inherit' }}>
          <LogOut style={{ width: 18, height: 18 }} />
          Log Out
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--m3-muted)', margin: '-16px 0 0' }}>Caresy v2.0 · Made with care in India</p>
      </div>
    </main>
  );
}
