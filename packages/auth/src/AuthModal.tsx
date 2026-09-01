'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { X, Loader2, Smartphone } from 'lucide-react';
import { Button, Input } from '@caresy/ui';
// utils/phone is a leaf: pure functions, no imports of its own. @caresy/utils
// also lists @caresy/auth (serviceArea needs the Supabase client), so the two
// manifests reference each other — but the module graph stays acyclic, which is
// what the bundler follows. Import from the subpath, never the package root.
import { isValidIndianMobile, toE164, mobileHint } from '@caresy/utils/phone';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 384 512" aria-hidden="true" fill="#fff">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export default function AuthModal() {
  const { isOpen, closeLogin, user, profile, isLoading, signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, signInWithPhone, phoneSignInEnabled, saveProfile, onboardingEnabled } = useAuth();

  const [step, setStep] = useState<'name' | 'age' | 'phone'>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Email/password — same interface as /login and mobile
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [confirmationMsg, setConfirmationMsg] = useState('');

  // Onboarding only applies on portals that enabled it (the customer site).
  // On admin/companion portals a signed-in user is never asked for name/age.
  //
  // `profile` is null both when onboarding is genuinely incomplete AND while the
  // fetch is still in flight, so this must wait for isLoading to settle. Without
  // that, any openLogin() during the load window — tapping Confirm Booking, or
  // the moment after the OAuth redirect — re-asked name/age/phone of someone who
  // had already given them.
  const profileResolved = !isLoading;
  const needsOnboarding = !!user && onboardingEnabled && profileResolved
    && (!profile || !profile.onboarding_completed);

  useEffect(() => {
    if (isOpen && needsOnboarding) {
      setStep('name');
      setName((user?.user_metadata?.full_name || user?.user_metadata?.name || '') as string);
      setAge(profile?.age ? String(profile.age) : '');
      setPhone(profile?.phone || '');
      setError('');
    }
  }, [isOpen, needsOnboarding]);

  if (!isOpen) return null;
  // Already signed in and nothing to onboard (admin/companion portals, or a
  // customer who already finished onboarding): the modal has nothing to show,
  // so don't render the onboarding steps. Prevents admin.caresy.co.in from ever
  // asking an ops user for their name/age/phone.
  if (user && !needsOnboarding) return null;

  const handleGoogleClick = async () => {
    setIsSubmitting(true);
    setError('');
    await signInWithGoogle();
  };

  const handleAppleClick = async () => {
    setIsSubmitting(true);
    setError('');
    await signInWithApple();
  };

  const handlePhoneClick = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await signInWithPhone();
      // Session is live; the effect above flips this modal to onboarding, which
      // still asks for a name and age — the number is already on the profile.
    } catch (err: any) {
      setError(err?.message || 'Phone sign-in failed.');
    }
    setIsSubmitting(false);
  };

  const handleEmailAuth = async () => {
    setEmailError(''); setConfirmationMsg('');
    const e = email.trim().toLowerCase();
    if (!e || !/\S+@\S+\.\S+/.test(e)) { setEmailError('Enter a valid email'); return; }
    if (!password || password.length < 6) { setEmailError('Password must be at least 6 characters'); return; }
    if (authMode === 'signup' && !fullName.trim()) { setEmailError('Full name is required'); return; }
    setIsSubmitting(true);
    try {
      if (authMode === 'signup') {
        const { needsConfirmation } = await signUpWithEmail(e, password, fullName);
        if (needsConfirmation) setConfirmationMsg('Check your email to confirm, then log in.');
        else setEmailError('');
      } else {
        await signInWithEmail(e, password);
      }
    } catch (err: any) {
      setEmailError(err?.message || 'Something went wrong');
    }
    setIsSubmitting(false);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError('');
    setStep('age');
  };

  const handleAgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    if (!ageNum || ageNum < 1 || ageNum > 120) {
      setError('Enter a valid age.');
      return;
    }
    setError('');
    setStep('phone');
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // A non-empty check let nine-digit numbers through, so accounts existed
    // that operations could not call.
    if (!isValidIndianMobile(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    // Stored as +919876543210 so every screen reads one shape.
    const res = await saveProfile({ full_name: name.trim(), age: parseInt(age, 10), phone: toE164(phone)! });
    setIsSubmitting(false);
    if (!res.success) {
      setError(res.error || 'Failed to save profile.');
    }
  };

  return (
    <div className="auth-modal-overlay active" onClick={closeLogin}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={closeLogin} aria-label="Close authentication modal">
          <X style={{ width: '20px', height: '20px' }} />
        </button>

        {!user ? (
          <div>
            <h2>Welcome to Caresy</h2>
            <p>Sign in to book a companion and track your requests.</p>

            {error && <p style={{ color: 'var(--terracotta)', fontWeight: 600, marginTop: '-12px' }}>{error}</p>}

            {/* Log in / Sign up toggle — mirrors /login */}
            <div style={{ display: 'flex', background: '#f1f5f3', borderRadius: 999, padding: 4, gap: 0, marginBottom: 16 }}>
              <button
                onClick={() => { setAuthMode('login'); setEmailError(''); setConfirmationMsg(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 999, border: 'none', cursor: 'pointer', background: authMode === 'login' ? '#fff' : 'transparent', color: authMode === 'login' ? 'var(--teal, #0f5b4c)' : '#8a968f', fontWeight: 700, fontSize: 14, boxShadow: authMode === 'login' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', fontFamily: 'inherit' }}
              >Log in</button>
              <button
                onClick={() => { setAuthMode('signup'); setEmailError(''); setConfirmationMsg(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 999, border: 'none', cursor: 'pointer', background: authMode === 'signup' ? '#fff' : 'transparent', color: authMode === 'signup' ? 'var(--teal, #0f5b4c)' : '#8a968f', fontWeight: 700, fontSize: 14, boxShadow: authMode === 'signup' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', fontFamily: 'inherit' }}
              >Sign up</button>
            </div>

            {/* Email / Password — primary credentials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {authMode === 'signup' && (
                <Input label="Full name" type="text" placeholder="e.g. Ananya Rao" value={fullName} onChange={(e) => { setFullName(e.target.value); setEmailError(''); }} />
              )}
              <Input label="Email" type="email" placeholder="you@example.com" inputMode="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(''); setConfirmationMsg(''); }} />
              <Input label="Password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => { setPassword(e.target.value); setEmailError(''); }} />
              {emailError && <p style={{ margin: 0, fontSize: 13, color: '#b3261e', fontWeight: 600 }}>{emailError}</p>}
              {confirmationMsg && <p style={{ margin: 0, fontSize: 13, color: '#1b7a54', fontWeight: 600 }}>{confirmationMsg}</p>}
              <Button variant="primary" full shape="pill" size="lg" disabled={isSubmitting} onClick={handleEmailAuth}>
                {isSubmitting ? <Loader2 className="animate-spin" style={{ width: '20px', height: '20px' }} /> : (authMode === 'signup' ? 'Create account' : 'Log in')}
              </Button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontSize: 12, color: '#9aa5a0', fontWeight: 600 }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            <Button
              variant="secondary"
              full
              shape="pill"
              size="lg"
              disabled={isSubmitting}
              onClick={handleGoogleClick}
              style={{ background: '#fff', border: '1px solid var(--line)', color: 'var(--ink-teal)' }}
              iconLeft={isSubmitting ? undefined : <GoogleIcon />}
            >
              {isSubmitting ? <Loader2 className="animate-spin" style={{ width: '20px', height: '20px' }} /> : 'Continue with Google'}
            </Button>

            <Button
              variant="secondary"
              full
              shape="pill"
              size="lg"
              disabled={isSubmitting}
              onClick={handleAppleClick}
              style={{ marginTop: '12px', background: '#000', border: '1px solid #000', color: '#fff' }}
              iconLeft={isSubmitting ? undefined : <AppleIcon />}
            >
              {isSubmitting ? <Loader2 className="animate-spin" style={{ width: '20px', height: '20px' }} /> : 'Continue with Apple'}
            </Button>

            {phoneSignInEnabled && (
              <Button
                variant="primary"
                full
                shape="pill"
                size="lg"
                disabled={isSubmitting}
                onClick={handlePhoneClick}
                style={{ marginTop: '12px' }}
                iconLeft={<Smartphone style={{ width: '18px', height: '18px' }} />}
              >
                Continue with phone number
              </Button>
            )}
          </div>
        ) : step === 'name' ? (
          <form onSubmit={handleNameSubmit}>
            <h2>What&apos;s your name?</h2>
            <p>We&apos;ll use this to personalize your bookings.</p>

            {error && <p style={{ color: 'var(--terracotta)', fontWeight: 600, marginTop: '-12px' }}>{error}</p>}

            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <Input
                label="Full Name"
                type="text"
                required
                autoFocus
                placeholder="e.g. Ananya Rao"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" full shape="pill" size="lg">Continue</Button>
          </form>
        ) : step === 'age' ? (
          <form onSubmit={handleAgeSubmit}>
            <h2>How old are you?</h2>
            <p>Helps us tailor support for you or the person you&apos;re booking for.</p>

            {error && <p style={{ color: 'var(--terracotta)', fontWeight: 600, marginTop: '-12px' }}>{error}</p>}

            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <Input
                label="Age"
                type="number"
                required
                autoFocus
                min={1}
                max={120}
                placeholder="e.g. 34"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" full shape="pill" size="lg">Continue</Button>
          </form>
        ) : (
          <form onSubmit={handlePhoneSubmit}>
            <h2>What&apos;s your phone number?</h2>
            <p>So our operations team can reach you about a booking.</p>

            {error && <p style={{ color: 'var(--terracotta)', fontWeight: 600, marginTop: '-12px' }}>{error}</p>}

            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <Input
                label="Phone Number"
                type="tel"
                required
                autoFocus
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                hint={mobileHint(phone) ?? '+91 — we only need the 10 digits'}
              />
            </div>
            <Button type="submit" variant="primary" full shape="pill" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" style={{ width: '20px', height: '20px' }} /> : 'Finish'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
