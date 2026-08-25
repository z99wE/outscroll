import { useState, useEffect, useMemo, useRef, useCallback, Component, lazy, Suspense } from 'react';
import { Virtuoso } from 'react-virtuoso';
import axios from 'axios';

const API = '/api';
const LandingPage = lazy(() => import('./LandingPage.jsx'));
import { FAQPage, ContentPolicyPage, PrivacyPolicyPage, TermsPage, LegacyDisclaimerPage } from './LegalPages.jsx';
import BusinessApprovalPage from './BusinessApprovalPage.jsx';
import AdminPage from './AdminPage.jsx';
import CookieConsent from './CookieConsent.jsx';
import DataRightsPage from './DataRightsPage.jsx';
import ContactPage from './ContactPage.jsx';
import PWAInstallBanner from './PWAInstallBanner.jsx';

// ========== Error Boundary ==========
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button className="btn btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ========== Helper: parse video URL ==========
function parseVideoUrl(url) {
  if (!url) return { platform: 'unknown', embedUrl: null, icon: '🔗' };
  try {
    const u = new URL(url);
    if (u.hostname.includes('tiktok.com')) {
      const videoId = u.pathname.split('/').pop();
      return { platform: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`, icon: '♪' };
    }
    if (u.hostname.includes('instagram.com')) {
      return { platform: 'instagram', embedUrl: `${u.href.endsWith('/') ? u.href : u.href + '/'}`, icon: '◎' };
    }
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId;
      if (u.hostname.includes('youtu.be')) { videoId = u.pathname.slice(1); }
      else { videoId = u.searchParams.get('v'); }
      return { platform: 'youtube', embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null, icon: '▶' };
    }
    return { platform: 'unknown', embedUrl: null, icon: '🔗' };
  } catch { return { platform: 'unknown', embedUrl: null, icon: '🔗' }; }
}

// ========== Skip to Content ==========
function SkipLink() {
  return (
    <a href="#main-content" className="skip-link" style={{
      position: 'absolute', top: '-100%', left: '1rem',
      padding: '0.75rem 1.5rem', background: 'var(--accent)', color: 'white',
      fontWeight: 700, zIndex: 100, textDecoration: 'none', borderRadius: '0 0 4px 4px',
    }}
      onFocus={(e) => { e.target.style.top = '0'; }}
      onBlur={(e) => { e.target.style.top = '-100'; }}
    >Skip to content</a>
  );
}

// ========== Header ==========
function Header({ page, setPage, user, onLogout, unreadCount = 0, onHome }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'feed', label: 'Feed' },
    { id: 'leaderboard', label: 'Ranks' },
    { id: 'faq', label: 'FAQ' },
    ...(user ? [
      { id: 'submit', label: 'Post' },
      { id: 'business', label: 'Business' },
      { id: 'data-rights', label: 'My Data' },
      { id: 'profile', label: 'Profile' },
      { id: 'admin', label: 'Admin' },
    ] : []),
  ];

  return (
    <header role="banner" style={{
      background: 'var(--surface-raised)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Top color bar */}
      <div style={{ height: '3px', display: 'flex' }}>
        <div style={{ flex: 1, background: 'var(--brand-blue)' }} />
        <div style={{ flex: 1, background: 'var(--brand-red)' }} />
        <div style={{ flex: 1, background: 'var(--brand-yellow)' }} />
        <div style={{ flex: 1, background: 'var(--brand-green)' }} />
      </div>

      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        padding: '0.75rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button
          className="logo"
          style={{ cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit', color: 'inherit' }}
          onClick={onHome}
          aria-label="OutScroll home"
        >out<span>scroll</span></button>

        {/* Mobile hamburger */}
        <button
          className="nav-item"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.25rem', padding: '0.5rem' }}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Desktop nav */}
        <nav role="navigation" aria-label="Main navigation"
          style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}
        >
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setMenuOpen(false); }}
              aria-current={page === item.id ? 'page' : undefined}
            >{item.label}</button>
          ))}
          {user && (
            <>
              <button onClick={() => { setPage('notifications'); setMenuOpen(false); }}
                className="nav-item" style={{ position: 'relative' }}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '2px',
                    background: 'var(--danger)', color: 'white',
                    fontSize: '0.55rem', fontWeight: 800, width: '15px', height: '15px',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              <button onClick={() => { onLogout(); setMenuOpen(false); }}
                className="nav-item" aria-label="Log out"
              >Out</button>
            </>
          )}
        </nav>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <nav style={{
          padding: '0.5rem 1rem 1rem', borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
        }}>
          {navItems.map(item => (
            <button key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setMenuOpen(false); }}
              style={{ width: '100%', textAlign: 'left' }}
            >{item.label}</button>
          ))}
          {user && (
            <>
              <button className="nav-item" onClick={() => { setPage('notifications'); setMenuOpen(false); }}
                style={{ width: '100%', textAlign: 'left' }}
              >🔔 Notifications {unreadCount > 0 && `(${unreadCount})`}</button>
              <button className="nav-item" onClick={() => { onLogout(); setMenuOpen(false); }}
                style={{ width: '100%', textAlign: 'left', color: 'var(--danger)' }}
              >Log Out</button>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

// ========== VideoCard ==========
function VideoCard({ video, onTrack, user }) {
  const [embedded, setEmbedded] = useState(false);
  const [tracked, setTracked] = useState({});
  const [pointsEarned, setPointsEarned] = useState(null);
  const { platform, embedUrl, icon } = useMemo(() => parseVideoUrl(video.url), [video.url]);
  const pointsRef = useRef(null);

  const doTrack = useCallback(async (videoId, action) => {
    if (!user) return;
    const result = await onTrack(videoId, action);
    if (result?.points_awarded) {
      setPointsEarned(result.points_awarded);
      if (pointsRef.current) {
        pointsRef.current.textContent = `${result.points_awarded > 0 ? '+' : ''}${result.points_awarded}`;
        pointsRef.current.style.opacity = '1';
        setTimeout(() => { if (pointsRef.current) pointsRef.current.style.opacity = '0'; }, 2000);
      }
    }
  }, [user, onTrack]);

  const handlePlay = useCallback(async () => {
    if (!user) return alert('Login to earn points!');
    setEmbedded(true);
    if (!tracked['play']) { await doTrack(video.id, 'play'); setTracked(t => ({ ...t, play: true })); }
  }, [user, tracked, doTrack, video.id]);

  const handle50 = useCallback(async () => {
    if (!user) return;
    if (!tracked['50_watch']) { await doTrack(video.id, '50_watch'); setTracked(t => ({ ...t, '50_watch': true })); }
  }, [user, tracked, doTrack, video.id]);

  const handleFull = useCallback(async () => {
    if (!user) return;
    if (!tracked['full_watch']) { await doTrack(video.id, 'full_watch'); setTracked(t => ({ ...t, full_watch: true })); }
  }, [user, tracked, doTrack, video.id]);

  const handleSkip = useCallback(async () => {
    if (!user) return;
    if (!tracked['skip']) { await doTrack(video.id, 'skip'); setTracked(t => ({ ...t, skip: true })); }
    setEmbedded(false);
  }, [user, tracked, doTrack, video.id]);

  return (
    <article className="card animate-in" style={{ padding: '1.25rem', marginBottom: '1rem', position: 'relative' }}>
      {/* Points toast */}
      <div ref={pointsRef} aria-live="polite" style={{
        position: 'absolute', top: '-1.5rem', right: '1rem',
        fontWeight: 800, fontFamily: "'Anton', sans-serif", fontSize: '1.25rem',
        color: pointsEarned && pointsEarned > 0 ? 'var(--success)' : 'var(--danger)',
        opacity: 0, transition: 'opacity 0.3s', pointerEvents: 'none',
      }} />

      {/* Video header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '6px',
            background: 'var(--surface-inset)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', flexShrink: 0,
          }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>{video.username}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              <span aria-label={`Platform: ${platform}`}>{platform}</span> ·{' '}
              <time dateTime={video.created_at}>{new Date(video.created_at).toLocaleDateString()}</time>
            </div>
          </div>
        </div>
        <span className="badge badge-neutral" aria-label={`${video.watch_count || 0} people watched this`}>
          {video.watch_count || 0} watches
        </span>
      </div>

      {/* Embed or URL */}
      {embedded && embedUrl ? (
        <div className="video-embed" style={{ marginBottom: '1rem' }}>
          <iframe src={embedUrl} title={`Video by ${video.username} on ${platform}`} allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        </div>
      ) : (
        <button onClick={handlePlay} style={{
          display: 'block', width: '100%', padding: '1.75rem', textAlign: 'center',
          color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem',
          cursor: 'pointer', background: 'var(--surface-inset)', border: '1px solid var(--border)',
          borderRadius: '6px',
        }} aria-label={`Play video by ${video.username} on ${platform}`}>
          {icon} Watch on {platform}
        </button>
      )}

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }} role="group" aria-label="Watch tracking actions">
        <button className={`btn ${tracked['play'] ? 'btn-primary' : 'btn-secondary'}`}
          onClick={handlePlay} style={{ padding: '0.5rem', fontSize: '0.7rem' }}
          disabled={tracked['play']} aria-pressed={tracked['play']}
        >▶ Play (+5)</button>
        <button className={`btn ${tracked['50_watch'] ? 'btn-success' : 'btn-secondary'}`}
          onClick={handle50} style={{ padding: '0.5rem', fontSize: '0.7rem' }}
          disabled={tracked['50_watch']} aria-pressed={tracked['50_watch']}
        >50% (+70)</button>
        <button className={`btn ${tracked['full_watch'] ? 'btn-success' : 'btn-secondary'}`}
          onClick={handleFull} style={{ padding: '0.5rem', fontSize: '0.7rem' }}
          disabled={tracked['full_watch']} aria-pressed={tracked['full_watch']}
        >Full (+100)</button>
        <button className={`btn ${tracked['skip'] ? 'btn-danger' : 'btn-secondary'}`}
          onClick={handleSkip} style={{ padding: '0.5rem', fontSize: '0.7rem' }}
          disabled={tracked['skip']} aria-pressed={tracked['skip']}
        >Skip (-5)</button>
      </div>

      {/* Report button */}
      {user && user.id !== video.submitted_by && (
        <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
          <button
            onClick={async () => {
              const reason = prompt('Why are you reporting this video?');
              if (reason) {
                try {
                  await axios.post(`${API}/videos/report`, { video_id: video.id, reason }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                  });
                  alert('Report submitted. We review all reports within 24 hours.');
                } catch { alert('Failed to submit report.'); }
              }
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            aria-label={`Report video by ${video.username}`}
          >🚩 Report</button>
        </div>
      )}
    </article>
  );
}

// ========== FeedPage ==========
const LOADING_ITEMS = Array.from({ length: 5 }, (_, i) => ({ id: `loading-${i}`, _loading: true }));

function LoadingCard() {
  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div className="loading-pulse" style={{ height: '200px' }} role="presentation" />
    </div>
  );
}

function FeedPage({ user, onTrack }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const fetchingRef = useRef(false);

  const fetchVideos = useCallback(async (offset, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (append) setLoadingMore(true);
    try {
      const res = await axios.get(`${API}/videos/feed`, { params: { limit: 20, offset } });
      const newVideos = res.data.videos;
      setVideos(prev => append ? [...prev, ...newVideos] : newVideos);
      setHasMore(newVideos.length === 20);
      offsetRef.current = offset + newVideos.length;
    } catch {} finally {
      setLoading(false); setLoadingMore(false); fetchingRef.current = false;
    }
  }, []);

  useEffect(() => { fetchVideos(0); }, [fetchVideos]);

  const loadMore = useCallback(() => {
    if (!hasMore || fetchingRef.current) return;
    fetchVideos(offsetRef.current, true);
  }, [hasMore, fetchVideos]);

  const ListHeader = useMemo(() => (
    <div style={{ padding: '0 0 1rem 0' }}>
      <h2 style={{ marginBottom: '0.25rem', fontSize: '1.75rem' }}>Feed</h2>
      {!loading && videos.length > 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {videos.length} video{videos.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  ), [loading, videos.length]);

  if (!loading && videos.length === 0) {
    return (
      <div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>Feed</h2>
        <div className="card-inset" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
          <p style={{ color: 'var(--text-secondary)' }}>No videos yet. Be the first to post!</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>Feed</h2>
        <div style={{ padding: '1rem 0' }}>{LOADING_ITEMS.map(item => <LoadingCard key={item.id} />)}</div>
      </div>
    );
  }

  return (
    <div role="feed" aria-label={`Feed of ${videos.length} videos`} aria-busy={loadingMore}>
      <Virtuoso
        style={{ height: 'calc(100vh - 180px)' }}
        totalCount={videos.length + (loadingMore ? 1 : 0)}
        itemContent={(index) => {
          if (index >= videos.length) return <LoadingCard />;
          return <div style={{ padding: '0.25rem 0' }}><VideoCard video={videos[index]} onTrack={onTrack} user={user} /></div>;
        }}
        endReached={loadMore}
        overscan={200}
        components={{ Header: () => ListHeader }}
        computeItemKey={(index) => index >= videos.length ? `loading-${index}` : videos[index].id}
        itemSize={(index) => index >= videos.length ? 220 : 320}
      />
      {!hasMore && videos.length > 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          You've reached the end. Check back later!
        </div>
      )}
    </div>
  );
}

// ========== LeaderboardPage ==========
function LeaderboardPage({ user, setPage }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API}/leaderboard`).then(res => setLeaderboard(res.data.leaderboard)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const getRankColor = (rank) => rank === 1 ? 'var(--gold)' : rank === 2 ? 'var(--silver)' : rank === 3 ? 'var(--bronze)' : 'var(--text-muted)';
  const getRankLabel = (rank) => rank === 1 ? '1st place' : rank === 2 ? '2nd place' : rank === 3 ? '3rd place' : `Rank ${rank}`;
  const getRankEmoji = (rank) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  const shareRank = useCallback((username, rank, points) => {
    if (navigator.share) {
      navigator.share({ title: 'My OutScroll Rank', text: `🏆 I'm #${rank} on OutScroll with ${points.toLocaleString()} points!`, url: 'https://outscroll.com' });
    } else {
      navigator.clipboard.writeText(`🏆 I'm #${rank} on OutScroll with ${points.toLocaleString()} points! https://outscroll.com`).then(() => alert('Copied to clipboard!'));
    }
  }, []);

  if (!user) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏆</div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Leaderboard</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Sign in to see the full leaderboard and track your rank.
          </p>
          <button className="btn btn-primary" onClick={() => setPage('profile')} style={{ padding: '0.875rem 2.5rem' }}>
            Sign In to View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>Leaderboard</h2>

      {leaderboard.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }} role="list" aria-label="Top 3 users">
          {[1, 0, 2].map((idx) => {
            const entry = leaderboard[idx];
            const isFirst = idx === 0;
            return (
              <div key={entry?.username} className={`card ${isFirst ? 'glow-gold' : ''}`} role="listitem"
                style={{
                  padding: isFirst ? '2rem 1.5rem' : '1.5rem', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  marginTop: idx === 1 ? '1rem' : idx === 2 ? '2rem' : 0,
                  border: isFirst ? '2px solid var(--gold)' : undefined,
                }}>
                <div style={{ fontSize: isFirst ? '2.5rem' : '2rem', marginBottom: '0.5rem' }}>{getRankEmoji(entry?.rank)}</div>
                <div style={{ fontWeight: 700, fontSize: isFirst ? '1.2rem' : '1rem', color: 'var(--text-heading)' }}>{entry?.username}</div>
                <div style={{ fontFamily: "'Anton', sans-serif", fontSize: isFirst ? '2rem' : '1.5rem', color: getRankColor(entry?.rank) }}>
                  {entry?.total_points.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>points</div>
                <button className="btn btn-ghost" style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem' }}
                  onClick={() => shareRank(entry?.username, entry?.rank, entry?.total_points)}
                  aria-label={`Share ${getRankLabel(entry?.rank)} rank`}>📤 Share</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ padding: '1rem', overflow: 'hidden' }}>
        <table className="leaderboard-table" aria-label="Leaderboard rankings">
          <thead><tr>
            <th scope="col" style={{ width: '60px' }}>Rank</th>
            <th scope="col">Username</th>
            <th scope="col" style={{ textAlign: 'right' }}>Points</th>
          </tr></thead>
          <tbody>
            {leaderboard.map(entry => (
              <tr key={entry.username}>
                <td><span aria-label={getRankLabel(entry.rank)} style={{ color: getRankColor(entry.rank) }}>
                  {getRankEmoji(entry.rank) || `#${entry.rank}`}
                </span></td>
                <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{entry.username}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Anton', sans-serif", fontSize: '1.05rem', color: entry.rank <= 3 ? getRankColor(entry.rank) : 'var(--text-heading)' }}>
                  {entry.total_points.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leaderboard.length === 0 && !loading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users yet. Sign up to climb the ranks!</div>
        )}
      </div>
    </div>
  );
}

// ========== AuthPage ==========
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);
  const errorRef = useRef(null);
  const formStartTime = useRef(Date.now());

  useEffect(() => { if (error && errorRef.current) errorRef.current.focus(); }, [error]);
  useEffect(() => { if (usernameRef.current) usernameRef.current.focus(); }, [mode]);
  useEffect(() => { formStartTime.current = Date.now(); }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const data = Object.fromEntries(new FormData(e.target));
    try {
      if (mode === 'signup') {
        if (data.password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return; }
        const res = await axios.post(`${API}/auth/signup`, data, {
          headers: { 'x-form-start': String(formStartTime.current) },
        });
        localStorage.setItem('token', res.data.token); onLogin(res.data.user);
      } else {
        const res = await axios.post(`${API}/auth/login`, { username: data.username, password: data.password });
        localStorage.setItem('token', res.data.token); onLogin(res.data.user);
      }
    } catch (err) { setError(err.response?.data?.error || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
      <h2 style={{ marginBottom: '0.25rem', fontSize: '1.75rem' }}>
        {mode === 'login' ? 'Welcome back' : 'Join OutScroll'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        {mode === 'login' ? 'Sign in to track your points and climb the ranks.' : 'Create an account to start earning points.'}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Honeypot fields — hidden from humans, visible to bots */}
        {mode === 'signup' && (
          <>
            <input type="text" name="_website" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, padding: 0, border: 0 }} aria-hidden="true" />
            <input type="text" name="_company" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, padding: 0, border: 0 }} aria-hidden="true" />
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="auth-email" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>Email</label>
              <input id="auth-email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@email.com" />
            </div>
          </>
        )}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="auth-username" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>Username</label>
          <input id="auth-username" ref={usernameRef} name="username" required minLength={3} maxLength={20} autoComplete="username" className="input" placeholder="pick a username" />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="auth-password" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>Password</label>
          <input id="auth-password" name="password" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="input" placeholder="min 8 chars, upper + lower + number" />
        </div>

        {/* Cloudflare Turnstile CAPTCHA — only shows if site key is configured */}
        {mode === 'signup' && import.meta.env.VITE_TURNSTILE_SITE_KEY && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="cf-turnstile" data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY} data-theme="light" />
            <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          </div>
        )}

        {error && (
          <div ref={errorRef} role="alert" tabIndex={-1} className="badge badge-danger"
            style={{ display: 'block', padding: '0.6rem 0.875rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}
          >{error}</div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem' }} disabled={loading} aria-busy={loading}>
          {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
        >{mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}</button>
      </div>
    </div>
  );
}

// ========== SubmitPage ==========
function SubmitPage({ user }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const messageRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => setHasPostedToday(res.data.has_posted_today)).catch(() => {});
  }, []);

  useEffect(() => { if (message && messageRef.current) messageRef.current.focus(); }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setMessage(null);
    try {
      await axios.post(`${API}/videos/submit`, { url }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setMessage({ type: 'success', text: 'Video posted! Others can now watch it.' });
      setUrl(''); setHasPostedToday(true);
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit' }); }
    finally { setLoading(false); }
  };

  const urlValidation = useMemo(() => {
    if (!url) return { valid: null, platform: null, icon: null, error: null };
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      const path = u.pathname.toLowerCase();
      if (host === 'tiktok.com' || host.endsWith('.tiktok.com'))
        return { valid: true, platform: 'TikTok', icon: '♪', error: null };
      if (host === 'instagram.com' && path.includes('/reel/'))
        return { valid: true, platform: 'Instagram Reels', icon: '◎', error: null };
      if ((host === 'youtube.com' || host === 'youtu.be') && (path.includes('/shorts/') || path === '/shorts'))
        return { valid: true, platform: 'YouTube Shorts', icon: '▶', error: null };
      if (host === 'instagram.com')
        return { valid: false, platform: 'Instagram', icon: '◎', error: 'Only Instagram Reels links are accepted (not regular posts or stories)' };
      if (host === 'youtube.com' || host === 'youtu.be')
        return { valid: false, platform: 'YouTube', icon: '▶', error: 'Only YouTube Shorts links are accepted (not regular videos)' };
      return { valid: false, platform: null, icon: null, error: 'Only TikTok, Instagram Reels, and YouTube Shorts links are allowed' };
    } catch {
      return { valid: false, platform: null, icon: null, error: 'Enter a valid URL' };
    }
  }, [url]);

  return (
    <div style={{ maxWidth: '500px', margin: '3rem auto' }}>
      <h2 style={{ marginBottom: '0.25rem', fontSize: '1.75rem' }}>Post a Video</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Share one link per day. Earn points when others watch it.
      </p>

      {hasPostedToday && (
        <div className="card-inset" style={{ padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div>
          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>You've posted today</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Come back tomorrow</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <label htmlFor="submit-url" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Video URL</label>
          <div style={{ position: 'relative' }}>
            <input id="submit-url" type="url" value={url} onChange={e => setUrl(e.target.value)} required className="input"
              placeholder="https://www.tiktok.com/@creator/video/..." disabled={hasPostedToday}
              style={{ paddingRight: '3rem', borderColor: url && !urlValidation.valid ? 'var(--danger)' : undefined }}
              aria-describedby="submit-url-hint" />
            {urlValidation.icon && <span aria-hidden="true" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem' }}>{urlValidation.icon}</span>}
          </div>
          {url && urlValidation.valid === false && urlValidation.error && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }} role="alert">
              {urlValidation.error}
            </div>
          )}
          {url && urlValidation.valid === true && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }} role="status">
              ✓ Valid {urlValidation.platform} link
            </div>
          )}
          <div id="submit-url-hint" style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>Accepted platforms:</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { name: 'TikTok', icon: '♪' },
                { name: 'Instagram Reels', icon: '◎' },
                { name: 'YouTube Shorts', icon: '▶' },
              ].map(p => (
                <span key={p.name} className="badge badge-neutral">{p.icon} {p.name}</span>
              ))}
            </div>
          </div>
        </div>

        {message && (
          <div ref={messageRef} role="status" tabIndex={-1}
            className={message.type === 'success' ? 'badge badge-success' : 'badge badge-danger'}
            style={{ display: 'block', padding: '0.6rem 0.875rem', marginTop: '1rem', fontSize: '0.85rem', fontWeight: 600 }}
          >{message.text}</div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '1rem' }} disabled={loading || hasPostedToday || (url && urlValidation.valid === false)} aria-busy={loading}>
          {loading ? 'Posting...' : 'Post Video'}
        </button>
      </form>
    </div>
  );
}

// ========== ProfilePage ==========
function ProfilePage({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyMsg, setVerifyMsg] = useState(null);

  const authHeaders = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    if (!user) return;
    axios.get(`${API}/me`, { headers: authHeaders })
      .then(res => setProfile(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const sendVerification = async () => {
    setVerifying(true); setVerifyMsg(null);
    try {
      const res = await axios.post(`${API}/auth/send-verification`, { email: user.email }, { headers: authHeaders });
      setVerifyMsg({ type: 'success', text: res.data.dev_code ? `Code: ${res.data.dev_code}` : 'Code sent! Check your email.' });
    } catch (err) { setVerifyMsg({ type: 'error', text: err.response?.data?.error || 'Failed to send code' }); }
    finally { setVerifying(false); }
  };

  const verifyEmail = async () => {
    if (!verifyCode) return;
    try {
      await axios.post(`${API}/auth/verify-email`, { email: user.email, code: verifyCode }, { headers: authHeaders });
      setVerifyMsg({ type: 'success', text: 'Email verified!' });
      setProfile(p => ({ ...p, user: { ...p.user, email_verified: true } }));
    } catch (err) { setVerifyMsg({ type: 'error', text: err.response?.data?.error || 'Verification failed' }); }
  };

  if (!user) return <AuthPage onLogin={() => {}} />;
  if (loading) return <div className="loading-pulse" style={{ height: '300px', margin: '2rem 0' }} role="status" aria-label="Loading profile" />;

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{profile?.user?.username}</h2>
            {profile?.user?.business_name && (
              <div style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>{profile.user.business_name}</div>
            )}
            <span className={`badge ${profile?.user?.approval_status === 'approved' ? 'badge-success' : profile?.user?.approval_status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}
              style={{ marginTop: '0.5rem' }}>
              {profile?.user?.approval_status || 'pending'}
            </span>

            {/* Email verification */}
            {profile?.user?.email_verified ? (
              <span className="badge badge-success" style={{ marginTop: '0.5rem', marginLeft: '0.5rem' }}>✓ Email verified</span>
            ) : (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--warning-light)', border: '1px solid rgba(253,185,19,0.2)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.5rem' }}>Email not verified</div>
                {!verifying && !verifyCode ? (
                  <button className="btn btn-secondary" onClick={sendVerification} style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}>
                    Send verification code
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" value={verifyCode} onChange={e => setVerifyCode(e.target.value)}
                      className="input" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      placeholder="6-digit code" maxLength={6} />
                    <button className="btn btn-primary" onClick={verifyEmail} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                      Verify
                    </button>
                  </div>
                )}
                {verifyMsg && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: verifyMsg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                    {verifyMsg.text}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="card-inset" style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Rank</div>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: '1.75rem', color: profile?.rank <= 3 ? ['var(--gold)', 'var(--silver)', 'var(--bronze)'][profile.rank - 1] : 'var(--text-heading)' }}>
              #{profile?.rank}
            </div>
          </div>
        </div>

        <div className="card-inset" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Total Points</div>
          <div className="points-display" aria-label={`${profile?.user?.total_points.toLocaleString()} total points`}>
            {profile?.user?.total_points.toLocaleString()}
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <div className="card-inset" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Videos Posted</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-heading)', marginTop: '0.25rem' }}>{profile?.videos?.length || 0}</div>
          </div>
          <div className="card-inset" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Member Since</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-heading)', marginTop: '0.25rem' }}>
              {new Date(profile?.user?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>How to Earn Points</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }} role="list" aria-label="Points system">
          {[
            { action: 'Click play', points: '+5', color: 'var(--accent)' },
            { action: 'Watch 50%', points: '+70', color: 'var(--success)' },
            { action: 'Full watch', points: '+100', color: 'var(--success)' },
            { action: 'Skip before 50%', points: '-5', color: 'var(--danger)' },
          ].map(item => (
            <div key={item.action} role="listitem" className="card-inset" style={{
              padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-heading)' }}>{item.action}</span>
              <span style={{ fontWeight: 800, fontFamily: "'Anton', sans-serif", color: item.color, fontSize: '1.1rem' }}>{item.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== NotificationsPage ==========
function NotificationsPage({ onMarkRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => {
        setNotifications(res.data.notifications);
        axios.put(`${API}/notifications/read`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
          .then(() => onMarkRead());
      }).catch(() => {}).finally(() => setLoading(false));
  }, [onMarkRead]);

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>Notifications</h2>
        {[1, 2, 3].map(i => <div key={i} className="loading-pulse" style={{ height: '60px', marginBottom: '0.75rem' }} />)}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>Notifications</h2>
      {notifications.length === 0 ? (
        <div className="card-inset" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔔</div>
          <p style={{ color: 'var(--text-secondary)' }}>No notifications yet. Post a video and watch the engagement roll in!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {notifications.map(notif => (
            <div key={notif.id} className="card" style={{
              padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
              opacity: notif.read ? 0.6 : 1,
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: notif.type === 'engagement' ? (notif.points > 0 ? 'var(--brand-green)' : 'var(--brand-red)')
                  : notif.type === 'approval_update' ? 'var(--brand-blue)'
                  : notif.type === 'new_video' ? 'var(--brand-yellow)'
                  : 'var(--surface-inset)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0,
                color: notif.type === 'new_video' ? '#1a1a1a' : 'white',
              }}>{notif.type === 'engagement' ? (notif.points > 0 ? '▶' : '⏭')
                : notif.type === 'approval_update' ? '✓'
                : notif.type === 'new_video' ? '🎬'
                : '🔔'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-heading)' }}>{notif.message}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>
              {notif.points != null && (
                <span className={notif.points > 0 ? 'badge badge-success' : 'badge badge-danger'}>
                  {notif.points > 0 ? '+' : ''}{notif.points}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Main App ==========
// ========== Donation Buttons (admin-configured) ==========
function DonationButtons() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    fetch(`${API}/donations`).then(r => r.json()).then(setConfig).catch(() => {});
  }, []);

  if (!config || !config.enabled || (!config.kofi && !config.bmc)) return null;

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Support us:</span>
      {config.kofi && (
        <a href={config.kofi} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.4rem 0.875rem', background: '#FF5E5B', color: 'white',
            borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
            textDecoration: 'none', transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >☕ Ko-fi</a>
      )}
      {config.bmc && (
        <a href={config.bmc} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.4rem 0.875rem', background: '#FFDD00', color: '#000',
            borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
            textDecoration: 'none', transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >☕ Buy Me a Coffee</a>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('feed');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const mainRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setAuthChecked(true));
    } else { setAuthChecked(true); }
  }, []);

  const handleLogin = useCallback((userData) => { setUser(userData); setPage('feed'); }, []);
  const handleLogout = useCallback(() => { localStorage.removeItem('token'); setUser(null); setPage('feed'); }, []);

  useEffect(() => {
    const handler = (e) => { if (e.detail) setPage(e.detail); };
    window.addEventListener('outscroll-navigate', handler);
    return () => window.removeEventListener('outscroll-navigate', handler);
  }, []);

  const handleTrack = useCallback(async (videoId, action) => {
    try {
      const res = await axios.post(`${API}/engagement/track`, { video_id: videoId, action },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      return res.data;
    } catch (err) { console.error('Track error:', err); return null; }
  }, []);

  useEffect(() => {
    if (!user) return;
    const poll = () => {
      axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => setUnreadCount(res.data.unread_count || 0)).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => { if (mainRef.current) mainRef.current.focus(); }, [page]);

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <div className="loading-pulse" style={{ width: '200px', height: '60px' }} role="status" aria-label="Loading" />
      </div>
    );
  }

  if (showLanding && !user) {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <LandingPage onEnter={() => setShowLanding(false)} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SkipLink />
      <CookieConsent />
      <PWAInstallBanner />
      <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
        <Header page={page} setPage={setPage} user={user} onLogout={handleLogout} unreadCount={unreadCount} onHome={() => { if (!user) { setShowLanding(true); } else { setPage('feed'); } }} />

        <main id="main-content" ref={mainRef} tabIndex={-1} role="main"
          style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem', outline: 'none' }}
        >
          {page === 'feed' && <FeedPage user={user} onTrack={handleTrack} />}
          {page === 'leaderboard' && <LeaderboardPage user={user} setPage={setPage} />}
          {page === 'submit' && user && <SubmitPage user={user} />}
          {page === 'profile' && (user ? <ProfilePage user={user} /> : <AuthPage onLogin={handleLogin} />)}
          {page === 'notifications' && user && <NotificationsPage onMarkRead={() => setUnreadCount(0)} />}
          {page === 'faq' && <FAQPage />}
          {page === 'content-policy' && <ContentPolicyPage />}
          {page === 'privacy' && <PrivacyPolicyPage />}
          {page === 'terms' && <TermsPage />}
          {page === 'legacy' && <LegacyDisclaimerPage />}
          {page === 'business' && user && <BusinessApprovalPage />}
          {page === 'data-rights' && <DataRightsPage user={user} onLogout={handleLogout} />}
          {page === 'contact' && <ContactPage user={user} />}
          {page === 'admin' && <AdminPage />}
        </main>

        <footer role="contentinfo" style={{
          textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)',
          fontSize: '0.75rem', borderTop: '1px solid var(--border)', marginTop: '3rem',
        }}>
          <span className="logo" style={{ fontSize: '1rem' }}>out<span>scroll</span></span>
          <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>Free leaderboard for entrepreneurs · Post vertical ads · Climb by watching others</div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { id: 'faq', label: 'FAQ' },
              { id: 'content-policy', label: 'Content Policy' },
              { id: 'privacy', label: 'Privacy Policy' },
              { id: 'terms', label: 'Terms' },
              { id: 'legacy', label: 'Disclaimer' },
              { id: 'data-rights', label: 'My Data' },
              { id: 'contact', label: 'Contact' },
              { id: 'contact', label: 'Contact' },
            ].map(link => (
              <button key={link.id} onClick={() => setPage(link.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
              >{link.label}</button>
            ))}
          </div>

          {/* Donation buttons — admin-configured via /api/donations */}
          <DonationButtons />
          <div style={{ marginTop: '0.75rem', fontSize: '0.65rem' }}>© 2026 OutScroll · DPDP & GDPR Compliant</div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
