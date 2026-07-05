'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Mail, KeyRound, User as UserIcon, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

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

  if (step === 'name' && user?.user_metadata?.full_name) {
    closeLogin();
    if (authSuccessCallback) authSuccessCallback();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in-up" onClick={closeLogin}>
      <div 
        className="relative w-full max-w-md p-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl flex flex-col items-center animate-float"
        onClick={(e) => e.stopPropagation()}
        style={{ animationDuration: '10s' }}
      >
        <button 
          onClick={closeLogin}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-gradient-to-br from-marigold to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-marigold/30 mb-6">
          <ShieldCheck className="w-8 h-8 text-ink-teal" />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 text-center">
          {step === 'email' && "Welcome to Caresy"}
          {step === 'otp' && "Verify Your Identity"}
          {step === 'name' && "One Last Step"}
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
          {step === 'email' && "Enter your email to receive a secure login code."}
          {step === 'otp' && `We sent a 6-digit code to ${email}`}
          {step === 'name' && "Please enter your full name to complete your profile."}
        </p>

        {error && (
          <div className="w-full mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* STEP 1: EMAIL */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="w-full">
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                disabled={isSubmitting}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-marigold focus:border-marigold outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-marigold to-orange-500 hover:from-marigold-deep hover:to-orange-600 text-ink-teal font-bold rounded-xl shadow-md shadow-marigold/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Secure Code"}
            </button>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="w-full flex flex-col items-center">
            <div className="flex gap-2 mb-6">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  required
                  disabled={isSubmitting}
                  value={digit}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  ref={(el) => { otpInputsRef.current[idx] = el; }}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  className="w-12 h-14 text-center text-xl font-bold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-marigold focus:border-marigold outline-none transition-all text-slate-900 dark:text-white"
                />
              ))}
            </div>
            
            <button 
              type="button"
              disabled={isResendDisabled || isSubmitting}
              onClick={handleResendOtp}
              className={`text-sm mb-6 font-medium transition-colors ${isResendDisabled ? 'text-slate-400' : 'text-marigold-deep hover:text-orange-600'}`}
            >
              {isResendDisabled ? `Resend code in ${timer}s` : 'Resend Code'}
            </button>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-marigold to-orange-500 hover:from-marigold-deep hover:to-orange-600 text-ink-teal font-bold rounded-xl shadow-md shadow-marigold/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Proceed"}
            </button>
          </form>
        )}

        {/* STEP 3: NAME */}
        {step === 'name' && (
          <form onSubmit={handleSaveName} className="w-full">
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                disabled={isSubmitting}
                placeholder="Full Name (e.g. Ananya Rao)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-marigold focus:border-marigold outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-marigold to-orange-500 hover:from-marigold-deep hover:to-orange-600 text-ink-teal font-bold rounded-xl shadow-md shadow-marigold/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Complete Setup <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
