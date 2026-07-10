'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { X, Loader2 } from 'lucide-react';
import { Button, Input } from '@caresy/ui';

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

export default function AuthModal() {
  const { isOpen, closeLogin, user, profile, signInWithGoogle, saveProfile } = useAuth();

  const [step, setStep] = useState<'name' | 'age' | 'phone'>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsOnboarding = !!user && (!profile || !profile.onboarding_completed);

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

  const handleGoogleClick = async () => {
    setIsSubmitting(true);
    setError('');
    await signInWithGoogle();
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
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    const res = await saveProfile({ full_name: name.trim(), age: parseInt(age, 10), phone: phone.trim() });
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
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
