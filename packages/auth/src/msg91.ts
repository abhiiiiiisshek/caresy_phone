'use client';

// MSG91's OTP widget owns the entire phone-number → OTP → resend UI, so this
// file is a script loader and a promise wrapper around its callbacks, nothing
// more. Building our own number field and OTP boxes would be a week of work to
// arrive back at what the widget already does.
//
// The widget hands back a short-lived JWT ("access-token"). It is NOT proof of
// anything on its own — only MSG91's verifyAccessToken endpoint can turn it
// into a verified number, and that call needs the secret authkey, so it happens
// server-side in /api/auth/phone. Never read the number from the browser.

type OtpCb = (data: unknown) => void;

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    // Exposed only when initSendOTP runs with exposeMethods:true — they let us
    // drive send/verify/retry from our own UI instead of MSG91's popup.
    sendOtp?: (identifier: string, success: OtpCb, failure: OtpCb) => void;
    verifyOtp?: (otp: string, success: OtpCb, failure: OtpCb) => void;
    retryOtp?: (channel: string | null, success: OtpCb, failure: OtpCb) => void;
  }
}

function otpError(e: unknown, fallback: string): Error {
  const msg = (e as { message?: string })?.message;
  return new Error(typeof msg === 'string' && msg ? msg : fallback);
}

const SCRIPT_SRC = 'https://verify.msg91.com/otp-provider.js';

let loading: Promise<void> | null = null;

function loadWidget(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('OTP sign-in is browser-only.'));
  if (window.initSendOTP) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let the next attempt retry instead of caching a rejected promise.
      loading = null;
      reject(new Error('Could not load the OTP widget. Check your connection.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Whether phone sign-in should be offered at all. The admin and companion
 * portals share this package but don't set the widget vars (or host the
 * /api/auth/phone route), so the button stays hidden there.
 */
export function msg91Configured(): boolean {
  return !!process.env.NEXT_PUBLIC_MSG91_WIDGET_ID && !!process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;
}

// --- Headless flow (our own UI) ----------------------------------------------
// initSendOTP with exposeMethods:true hands control to window.sendOtp/verifyOtp
// instead of showing MSG91's popup, so the login page renders its own number and
// OTP fields. We init the widget once and reuse the exposed methods.

let exposed: Promise<void> | null = null;

function initExposed(): Promise<void> {
  exposed ??= (async () => {
    await loadWidget();
    window.initSendOTP!({
      widgetId: process.env.NEXT_PUBLIC_MSG91_WIDGET_ID,
      tokenAuth: process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH,
      exposeMethods: true,
      // We drive send/verify ourselves; these are required but unused here.
      success: () => {},
      failure: () => {},
    });
    // The methods attach synchronously after init, but guard for a tick anyway.
    for (let i = 0; i < 100 && typeof window.sendOtp !== 'function'; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (typeof window.sendOtp !== 'function') {
      exposed = null;
      throw new Error('The OTP service did not initialise. Please try again.');
    }
  })();
  return exposed;
}

/** Sends an OTP to `phone` (E.164 digits, e.g. "919717500225"). */
export async function sendPhoneOtp(phone: string): Promise<void> {
  await initExposed();
  return new Promise<void>((resolve, reject) => {
    window.sendOtp!(phone, () => resolve(), (e) => reject(otpError(e, 'Could not send the OTP. Check the number and try again.')));
  });
}

/** Resends the OTP through the same channel. */
export async function retryPhoneOtp(): Promise<void> {
  await initExposed();
  return new Promise<void>((resolve, reject) => {
    window.retryOtp!(null, () => resolve(), (e) => reject(otpError(e, 'Could not resend the OTP.')));
  });
}

/** Verifies `otp`; resolves with the MSG91 access-token for /api/auth/phone. */
export async function verifyPhoneOtp(otp: string): Promise<string> {
  await initExposed();
  return new Promise<string>((resolve, reject) => {
    window.verifyOtp!(otp, (data) => {
      const token = typeof data === 'string' ? data : (data as { message?: string })?.message;
      if (token) resolve(token);
      else reject(new Error('That code did not verify. Please try again.'));
    }, (e) => reject(otpError(e, 'That code is incorrect or expired.')));
  });
}

/** Opens the widget; resolves with the access-token once the OTP is verified. */
export async function getMsg91AccessToken(): Promise<string> {
  await loadWidget();
  return new Promise<string>((resolve, reject) => {
    window.initSendOTP!({
      widgetId: process.env.NEXT_PUBLIC_MSG91_WIDGET_ID,
      tokenAuth: process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH,
      exposeMethods: false,
      success: (data: unknown) => {
        const token = typeof data === 'string' ? data : (data as { message?: string })?.message;
        if (token) resolve(token);
        else reject(new Error('The OTP widget returned no token.'));
      },
      failure: (err: unknown) => {
        reject(new Error((err as { message?: string })?.message || 'OTP verification failed.'));
      },
    });
  });
}
