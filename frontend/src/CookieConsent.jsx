import { useState, useEffect } from 'react';

const CONSENT_KEY = 'outscroll_cookie_consent';
const CONSENT_VERSION = '1.0';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) {
        setVisible(true);
      } else {
        const parsed = JSON.parse(stored);
        if (parsed.version !== CONSENT_VERSION) {
          setVisible(true);
        }
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      version: CONSENT_VERSION,
      essential: true,
      timestamp: new Date().toISOString(),
    }));
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      version: CONSENT_VERSION,
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '0 1rem 1rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '700px',
          margin: '0 auto',
          padding: '1.5rem',
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(91, 141, 239, 0.15)',
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>🍪</span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Your Privacy</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              We use essential cookies for authentication and security. We do <strong>not</strong> use analytics,
              advertising, or tracking cookies. Your data is never sold.
              See our{' '}
              <button
                onClick={() => {
                  // Navigate to privacy page - dispatch custom event
                  window.dispatchEvent(new CustomEvent('outscroll-navigate', { detail: 'privacy' }));
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0, textDecoration: 'underline' }}
              >
                Privacy Policy
              </button>
              {' '}for full details under DPDP & GDPR.
            </p>

            {expanded && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-inset)', borderRadius: '4px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>What we use cookies for:</h4>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.4rem' }}>
                  <li style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓ Essential</span>
                    Session authentication, CSRF protection, rate limiting
                  </li>
                  <li style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>✗ Analytics</span>
                    Not used — we don't track your behavior
                  </li>
                  <li style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>✗ Marketing</span>
                    Not used — we don't serve ads
                  </li>
                </ul>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Under DPDP (India) and GDPR (EU), you have the right to withdraw consent at any time by clearing your browser cookies.
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleAcceptAll}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.75rem' }}
          >
            Accept All
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleEssentialOnly}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.75rem' }}
          >
            Essential Only
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.6rem 0.5rem',
            }}
            aria-expanded={expanded}
          >
            {expanded ? 'Less details ↑' : 'More details ↓'}
          </button>
        </div>
      </div>
    </div>
  );
}
