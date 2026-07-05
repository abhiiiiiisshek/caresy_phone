'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AuthModal() {
  const {
    isOpen,
    closeLogin,
    sendOtp,
    verifyOtp,
    updateProfileName,
    user,
    authSuccessCallback
  } = useAuth();

  const [step, setStep] = useState<'email' | 'otp' | 'name'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(30);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Start resend timer when entering OTP step
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Handle modal open/close resets
  useEffect(() => {
    if (!isOpen) {
      setStep('email');
      setEmail('');
      setOtp(Array(6).fill(''));
      setName('');
      setError('');
      setIsSubmitting(false);
      setTimer(30);
      setIsResendDisabled(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError('');
    const res = await sendOtp(email);
    setIsSubmitting(false);

    if (res.success) {
      setStep('otp');
      setTimer(30);
      setIsResendDisabled(true);
      // Focus first OTP input
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } else {
      setError(res.error || 'Failed to send OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    setIsSubmitting(true);
    setError('');
    const res = await sendOtp(email);
    setIsSubmitting(false);

    if (res.success) {
      setTimer(30);
      setIsResendDisabled(true);
      setOtp(Array(6).fill(''));
      otpInputsRef.current[0]?.focus();
    } else {
      setError(res.error || 'Failed to resend OTP.');
    }
  };

  const handleOtpChange = (val: string, index: number) => {
    if (!/^[0-9]?$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    const res = await verifyOtp(email, otpCode);

    if (res.success) {
      // Check if user has a name in metadata
      // Since verifyOtp updates auth state, user metadata might take a tick or we can read it directly
      // In Supabase, if the user was just created, metadata is usually empty
      setIsSubmitting(false);
      setStep('name');
    } else {
      setIsSubmitting(false);
      setError(res.error || 'Invalid verification code.');
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    const res = await updateProfileName(name);
    setIsSubmitting(false);

    if (res.success) {
      closeLogin();
      if (authSuccessCallback) authSuccessCallback();
    } else {
      setError(res.error || 'Failed to save profile name.');
    }
  };

  // Skip name entry if user already has a name
  const handleCheckMetadata = () => {
    if (user && user.user_metadata?.full_name) {
      closeLogin();
      if (authSuccessCallback) authSuccessCallback();
    }
  };

  // Trigger check if we're on the 'name' step and user already has metadata
  if (step === 'name' && user?.user_metadata?.full_name) {
    handleCheckMetadata();
    return null;
  }

  return (
    <div className="auth-modal-overlay active" onClick={closeLogin}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={closeLogin} aria-label="Close authentication modal">
          &times;
        </button>

        {error && (
          <div style={{
            background: 'rgba(216, 92, 70, 0.1)',
            color: 'var(--vermilion-deep)',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.86rem',
            marginBottom: '16px',
            border: '1px solid rgba(216, 92, 70, 0.2)',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {/* Phase 1: Enter Email */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp}>
            <h2>Verify Email Address</h2>
            <p>Please enter your email address to receive a 6-digit verification code.</p>
            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Email Address
              </label>
              <input
                type="email"
                className="auth-input-text"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <button className="btn btn-primary full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        )}

        {/* Phase 2: Enter OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <h2>Enter verification code</h2>
            <p>We've sent a 6-digit code to <span style={{ fontWeight: 700 }}>{email}</span></p>
            <div className="otp-input-group" style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '20px 0' }}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  className="otp-input"
                  value={digit}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  ref={(el) => { otpInputsRef.current[idx] = el; }}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  disabled={isSubmitting}
                  style={{
                    width: '40px',
                    height: '48px',
                    textAlign: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    background: 'var(--surface)'
                  }}
                />
              ))}
            </div>
            <div className="resend-container" style={{ margin: '14px 0 24px', fontSize: '0.88rem', color: 'var(--muted)' }}>
              Didn't receive the email?{' '}
              <button
                type="button"
                className="resend-btn"
                onClick={handleResendOtp}
                disabled={isResendDisabled || isSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isResendDisabled ? 'var(--muted)' : 'var(--primary-dark)',
                  fontWeight: 'bold',
                  cursor: isResendDisabled ? 'not-allowed' : 'pointer',
                  textDecoration: isResendDisabled ? 'none' : 'underline',
                  padding: 0
                }}
              >
                {isResendDisabled ? `Resend in ${timer}s` : 'Resend Code'}
              </button>
            </div>
            <button className="btn btn-primary full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify & Proceed'}
            </button>
          </form>
        )}

        {/* Phase 3: Enter Name */}
        {step === 'name' && (
          <form onSubmit={handleSaveName}>
            <h2>One Last Step</h2>
            <p>Please enter your full name to complete signup and access your dashboard.</p>
            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Your Full Name
              </label>
              <input
                type="text"
                className="auth-input-text"
                placeholder="e.g. Ananya Rao"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <button className="btn btn-primary full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save & Proceed'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
