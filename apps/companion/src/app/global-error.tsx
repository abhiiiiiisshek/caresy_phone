'use client';

// Fix for Next 16.2 _global-error prerender crash (isPageStatic hardcodes
// _global-error as static and ignores `dynamic`). This file provides a
// self-contained error boundary with no app context imports. After patching
// next/dist/build/utils.js to not hardcode isStatic:true, `dynamic` is
// respected and the route becomes dynamic, avoiding static prerender.
export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f8faf5',
          color: '#1B4D3E',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: '100%',
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 16,
            padding: 24,
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800 }}>Something went wrong</h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.92rem', color: '#5c6b64', lineHeight: 1.5 }}>
            An unexpected error occurred. Try again.
          </p>
          {error?.digest && <p style={{ fontSize: '0.78rem', color: '#8a8a8a' }}>Ref: {error.digest}</p>}
          <button type="button" onClick={() => reset()} style={{ border: '1px solid #1B4D3E', background: '#1B4D3E', color: '#fff', borderRadius: 999, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
