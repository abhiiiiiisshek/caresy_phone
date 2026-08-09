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

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
  }
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
