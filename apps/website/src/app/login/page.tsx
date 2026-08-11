'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { ArrowLeft, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { MotionSpot, type SpotVariant } from '@caresy/ui';

const EPILOGUE = 'var(--font-epilogue), sans-serif';
const OTP_LEN = 6;
const RESEND_SECONDS = 30;

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41.4 34.9 44 29.9 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 384 512" aria-hidden fill="#fff">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

type Step = 'choose' | 'phone' | 'otp';

export default function Login() {
  const {
    user, profile, isLoading,
    signInWithGoogle, signInWithApple,
    phoneSignInEnabled, startPhoneOtp, resendPhoneOtp, confirmPhoneOtp,
  } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('choose');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [isLoading, user, router]);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const firstName = profile?.full_name?.split(' ')[0] || (user?.user_metadata?.name as string)?.split(' ')[0];
  const otpValue = otp.join('');

  const sendOtp = async () => {
    if (mobile.length !== 10) { setError('Enter a valid 10-digit mobile number.'); return; }
    setBusy(true); setError('');
    try {
      await startPhoneOtp(mobile);
      setStep('otp');
      setResendIn(RESEND_SECONDS);
      setOtp(Array(OTP_LEN).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the OTP.');
    }
    setBusy(false);
  };

  const verify = useCallback(async (code: string) => {
    setBusy(true); setError('');
    try {
      await confirmPhoneOtp(code);
      setDone(true); // effect redirects once the session lands
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code is incorrect.');
      setOtp(Array(OTP_LEN).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 40);
      setBusy(false);
    }
  }, [confirmPhoneOtp]);

  const resend = async () => {
    if (resendIn > 0) return;
    setBusy(true); setError('');
    try {
      await resendPhoneOtp();
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the OTP.');
    }
    setBusy(false);
  };

  const onOtpChange = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) { // deletion
      setOtp((p) => { const n = [...p]; n[i] = ''; return n; });
      return;
    }
    setOtp((p) => {
      const n = [...p];
      // support paste of the whole code into one box
      for (let k = 0; k < digits.length && i + k < OTP_LEN; k++) n[i + k] = digits[k];
      const filledTo = Math.min(i + digits.length, OTP_LEN - 1);
      setTimeout(() => otpRefs.current[filledTo]?.focus(), 0);
      const joined = n.join('');
      if (joined.length === OTP_LEN && !joined.includes('')) setTimeout(() => verify(joined), 80);
      return n;
    });
  };

  const onOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const spotVariant: SpotVariant =
    done ? 'success'
    : error ? 'oops'
    : step === 'otp' ? 'private'
    : 'welcome';
  const heading = step === 'choose' ? (firstName ? 'Welcome back' : 'Welcome to Caresy')
    : step === 'phone' ? 'Enter your number'
    : 'Verify your number';
  const sub = step === 'choose' ? (firstName || 'Wellness, centered around you.')
    : step === 'phone' ? 'We’ll text you a 6-digit code.'
    : `Code sent to +91 ${mobile}`;

  return (
    <main id="main-content" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--m3-bg)', fontFamily: EPILOGUE, overflow: 'hidden' }}>
      <style>{`
        /* Premium micro-interactions — transform/opacity/shadow only, GPU-friendly. */

        /* Buttons: hover lift, tactile press, focus ring. */
        .lp-btn { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.10); transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease, opacity .2s ease, filter .2s ease; }
        .lp-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 22px -8px rgba(0,0,0,0.28); filter: brightness(1.04); }
        .lp-btn:active:not(:disabled) { transform: translateY(0) scale(.97); box-shadow: 0 3px 8px -2px rgba(0,0,0,0.22); transition-duration: .08s; }
        .lp-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(0,105,113,0.35); }
        .lp-btn:disabled { cursor: not-allowed; }

        /* Icon (back) button. */
        .lp-iconbtn { transition: transform .16s ease, background .2s ease; }
        .lp-iconbtn:hover { background: #d5d8d2; transform: translateX(-1px); }
        .lp-iconbtn:active { transform: scale(.9); }

        /* Phone field: glow + subtle lift while focused. */
        .lp-field { transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
        .lp-field:focus-within { border-color: var(--m3-green-deep); box-shadow: 0 0 0 3px rgba(0,105,113,0.12); transform: translateY(-1px); }

        /* OTP boxes: focus lift, pop as a digit lands. */
        .otp-box { transition: border-color .18s ease, box-shadow .18s ease, transform .12s cubic-bezier(.34,1.56,.64,1); }
        .otp-box:focus { outline: none; border-color: var(--m3-green-deep); box-shadow: 0 0 0 3px rgba(0,105,113,0.14); transform: translateY(-2px); }
        .otp-box[data-filled="true"] { border-color: var(--m3-green-deep); animation: lp-pop .22s ease; }
        @keyframes lp-pop { 0%{transform:scale(1);} 40%{transform:scale(1.13);} 100%{transform:scale(1);} }

        /* Card entrance + step-swap fade. */
        .lp-card { animation: lp-rise .5s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes lp-rise { from{opacity:0; transform:translateY(12px) scale(.98);} to{opacity:1; transform:none;} }
        .lp-step { animation: lp-fade .32s ease both; }
        @keyframes lp-fade { from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:none;} }

        /* Error: shake + fade, on the message and the OTP row. */
        .lp-error { animation: lp-shake .4s cubic-bezier(.36,.07,.19,.97) both; }
        .otp-row[data-error="true"] { animation: lp-shake .4s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes lp-shake { 10%,90%{transform:translateX(-1px);} 20%,80%{transform:translateX(2px);} 30%,50%,70%{transform:translateX(-4px);} 40%,60%{transform:translateX(4px);} }

        @media (prefers-reduced-motion: reduce) {
          .lp-btn, .lp-iconbtn, .lp-field, .otp-box, .lp-card, .lp-step, .lp-error, .otp-row { animation: none !important; transition: none !important; }
          .lp-btn:hover:not(:disabled), .lp-btn:active:not(:disabled), .otp-box:focus, .lp-field:focus-within { transform: none; }
        }
      `}</style>

      <div aria-hidden style={{ position: 'absolute', top: '-9%', left: '-10%', right: '60%', bottom: '65%', borderRadius: '50%', background: '#baeed9', filter: 'blur(50px)', mixBlendMode: 'multiply', opacity: 0.3 }} />
      <div aria-hidden style={{ position: 'absolute', top: '56%', left: '50%', right: '-10%', bottom: '-9%', borderRadius: '50%', background: '#9af0fa', filter: 'blur(60px)', mixBlendMode: 'multiply', opacity: 0.2 }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

        {/* Illustrated slot */}
        <MotionSpot variant={spotVariant} size={168} />

        {/* Card */}
        <div className="lp-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18, padding: 24, borderRadius: 'var(--m3-radius-card)', background: 'rgba(248,250,245,0.82)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 30px -12px rgba(0,0,0,0.18)' }}>

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
            {step !== 'choose' && (
              <button
                className="lp-iconbtn"
                onClick={() => { setStep(step === 'otp' ? 'phone' : 'choose'); setError(''); }}
                aria-label="Back"
                style={{ position: 'absolute', left: 0, top: 2, display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 999, border: 'none', background: '#e1e3de', color: 'var(--m3-ink)', cursor: 'pointer' }}
              >
                <ArrowLeft style={{ width: 16, height: 16 }} />
              </button>
            )}
            <h2 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 600, color: 'var(--m3-ink)' }}>{heading}</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--m3-muted)', textAlign: 'center' }}>{sub}</p>
          </div>

          {/* Step content — re-keyed per step so it fades on each transition. */}
          <div key={step} className="lp-step" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* STEP: choose */}
          {step === 'choose' && (
            <>
              <button className="lp-btn" onClick={() => signInWithGoogle()} disabled={isLoading}
                style={btn('var(--m3-green-deep)', '#fff')}>
                {isLoading ? <Loader2 className="animate-spin" style={ic} /> : <GoogleMark />} Continue with Google
              </button>
              <button className="lp-btn" onClick={() => signInWithApple()} disabled={isLoading}
                style={{ ...btn('#000', '#fff'), marginTop: -6 }}>
                {isLoading ? <Loader2 className="animate-spin" style={ic} /> : <AppleMark />} Continue with Apple
              </button>
              {phoneSignInEnabled && (
                <button className="lp-btn" onClick={() => { setStep('phone'); setError(''); }} disabled={isLoading}
                  style={{ ...btn('#fff', 'var(--m3-ink)'), border: '1px solid #c0c9c3', marginTop: -6 }}>
                  <Smartphone style={{ ...ic, color: 'var(--m3-green)' }} /> Continue with phone number
                </button>
              )}
            </>
          )}

          {/* STEP: phone */}
          {step === 'phone' && (
            <>
              <div className="lp-field" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 14, background: '#fff', border: '1px solid #c0c9c3' }}>
                <span style={{ padding: '10px 12px', fontSize: 15, fontWeight: 600, color: 'var(--m3-ink)', borderRight: '1px solid #e1e3de' }}>+91</span>
                <input
                  autoFocus inputMode="numeric" type="tel" placeholder="98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendOtp(); }}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, letterSpacing: '1px', color: 'var(--m3-ink)', fontFamily: 'inherit' }}
                />
              </div>
              <button className="lp-btn" onClick={sendOtp} disabled={busy || mobile.length !== 10} style={{ ...btn('var(--m3-green-deep)', '#fff'), opacity: mobile.length === 10 && !busy ? 1 : 0.6 }}>
                {busy ? <Loader2 className="animate-spin" style={ic} /> : null} Send code
              </button>
            </>
          )}

          {/* STEP: otp */}
          {step === 'otp' && (
            <>
              <div className="otp-row" data-error={error ? 'true' : 'false'} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    className="otp-box"
                    data-filled={d ? 'true' : 'false'}
                    inputMode="numeric" type="tel" maxLength={OTP_LEN} aria-label={`Digit ${i + 1}`}
                    value={d}
                    disabled={busy}
                    onChange={(e) => onOtpChange(i, e.target.value)}
                    onKeyDown={(e) => onOtpKey(i, e)}
                    style={{ width: 44, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 600, color: 'var(--m3-ink)', background: '#fff', border: '1px solid #c0c9c3', borderRadius: 12, fontFamily: 'inherit' }}
                  />
                ))}
              </div>

              <button className="lp-btn" onClick={() => verify(otpValue)} disabled={busy || otpValue.length !== OTP_LEN}
                style={{ ...btn('var(--m3-green-deep)', '#fff'), opacity: otpValue.length === OTP_LEN && !busy ? 1 : 0.6 }}>
                {busy ? <Loader2 className="animate-spin" style={ic} /> : null} Verify &amp; continue
              </button>

              <p style={{ margin: 0, fontSize: 13, textAlign: 'center', color: 'var(--m3-muted)' }}>
                {resendIn > 0
                  ? <>Resend code in {resendIn}s</>
                  : <button onClick={resend} disabled={busy} style={{ border: 'none', background: 'none', color: '#006971', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Resend code</button>}
              </p>
            </>
          )}
          </div>

          {error && (
            <p className="lp-error" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#b3261e', textAlign: 'center' }} role="alert">{error}</p>
          )}

          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 0, fontSize: 12, letterSpacing: '0.3px', color: 'var(--m3-muted)', textAlign: 'center' }}>
            <ShieldCheck style={{ width: 14, height: 14, color: 'var(--m3-green)', flexShrink: 0 }} />
            {step === 'otp' ? 'Your code stays private — we never show it to anyone.' : 'One tap signs you in; new accounts are created automatically.'}
          </p>
        </div>

        <p style={{ margin: 0, fontSize: 14, letterSpacing: '0.25px', color: '#0a0b0d' }}>
          Just browsing? <Link href="/" style={{ color: '#006971', fontWeight: 500, textDecoration: 'none' }}>Explore Caresy first</Link>
        </p>
      </div>
    </main>
  );
}

const ic: React.CSSProperties = { width: 18, height: 18 };
function btn(bg: string, fg: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '15px 24px', borderRadius: 999, border: 'none', background: bg, color: fg, fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', cursor: 'pointer', fontFamily: 'inherit' };
}
