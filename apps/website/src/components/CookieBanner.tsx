'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [personalization, setPersonalization] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Delay display slightly for smooth entrance
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({ essential: true, analytics: true, personalization: true }));
    setIsVisible(false);
  };

  const handleDeclineAll = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({ essential: true, analytics: false, personalization: false }));
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({ essential: true, analytics, personalization }));
    setIsVisible(false);
  };

  return (
    <div className={`cookie-banner ${isVisible ? 'show' : ''}`} style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      maxWidth: '420px',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: '24px',
      padding: '20px',
      boxShadow: 'var(--shadow-2)',
      zIndex: 100,
      textAlign: 'left'
    }}>
      <h3 className="cookie-banner-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px', fontSize: '1.1rem', color: 'var(--ink)' }}>
        <Cookie style={{ color: 'var(--primary)', width: '20px', height: '20px' }} />
        Cookie Consent
      </h3>
      <p className="cookie-banner-text" style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: '0 0 15px', lineHeight: '1.45' }}>
        In compliance with the DPDP Act 2023, we request your consent to use cookies for analyzing web traffic and optimizing your companion coordination experience. Read our <Link href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Privacy Policy</Link>.
      </p>

      {showPrefs && (
        <div className="cookie-banner-preferences" style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0', padding: '12px', border: '1px solid var(--line)', borderRadius: '12px', background: 'rgba(0,0,0,0.01)', fontSize: '0.82rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
            <input type="checkbox" checked disabled style={{ accentColor: 'var(--primary)' }} /> Essential Cookies (Required)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} style={{ accentColor: 'var(--primary)' }} /> Analytics & Performance
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={personalization} onChange={(e) => setPersonalization(e.target.checked)} style={{ accentColor: 'var(--primary)' }} /> Personalization
          </label>
        </div>
      )}

      <div className="cookie-banner-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {!showPrefs ? (
          <>
            <button className="btn btn-primary" onClick={handleAcceptAll} style={{ minHeight: '38px', padding: '8px 16px', fontSize: '0.88rem', borderRadius: '12px', flex: 1, cursor: 'pointer' }}>
              Accept All
            </button>
            <button className="btn btn-outline" onClick={handleDeclineAll} style={{ minHeight: '38px', padding: '8px 16px', fontSize: '0.88rem', borderRadius: '12px', flex: 1, cursor: 'pointer', background: 'none', border: '1px solid var(--line)' }}>
              Reject All
            </button>
            <button className="btn btn-outline" onClick={() => setShowPrefs(true)} style={{ minHeight: '38px', padding: '8px 16px', fontSize: '0.88rem', borderRadius: '12px', flexBasis: '100%', cursor: 'pointer', background: 'none', border: '1px solid var(--line)', marginTop: '4px' }}>
              Manage Preferences
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={handleSavePreferences} style={{ minHeight: '38px', padding: '8px 16px', fontSize: '0.88rem', borderRadius: '12px', flexBasis: '100%', cursor: 'pointer' }}>
            Save Choices
          </button>
        )}
      </div>
    </div>
  );
}
