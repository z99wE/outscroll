import { useState, useEffect } from 'react';

const STORAGE_KEY = 'outscroll-pwa-dismissed';

function getPlatform() {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState('desktop');
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const p = getPlatform();
    setPlatform(p);

    // Already dismissed?
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    // Already installed / standalone mode?
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Listen for Android install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS — show banner after delay since no beforeinstallprompt fires
    if (p === 'ios') {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        localStorage.setItem(STORAGE_KEY, 'true');
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div
      role="alert"
      aria-label="Install OutScroll as an app"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem', color: 'var(--text-primary)' }}>
          📱 Install OutScroll
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {platform === 'ios'
            ? 'Tap the share button → "Add to Home Screen" for the full app experience'
            : 'Add to your home screen for instant access and a smoother experience'}
        </div>
        {platform === 'ios' && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            ⬇️ Safari → Share icon ⬆️ → Add to Home Screen
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        {platform !== 'ios' && (
          <button
            onClick={handleInstall}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0.25rem',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
