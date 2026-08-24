import { useState, useEffect, useMemo, useRef, useCallback, Component, lazy, Suspense } from 'react';
import { Virtuoso } from 'react-virtuoso';
import axios from 'axios';

const API = '/api';
const LandingPage = lazy(() => import('./LandingPage.jsx'));
import DriftWall from './DriftWall.jsx';
import { FAQPage, ContentPolicyPage, PrivacyPolicyPage, TermsPage, LegacyDisclaimerPage } from './LegalPages.jsx';
import BusinessApprovalPage from './BusinessApprovalPage.jsx';
import AdminPage from './AdminPage.jsx';
import CookieConsent from './CookieConsent.jsx';
import DataRightsPage from './DataRightsPage.jsx';
import PWAInstallBanner from './PWAInstallBanner.jsx';

// ========== Error Boundary ==========
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            className="neu-btn neu-btn-primary"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '0.75rem 2rem' }}
          >
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
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get('v');
      }
      return { platform: 'youtube', embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null, icon: '▶' };
    }
    return { platform: 'unknown', embedUrl: null, icon: '🔗' };
  } catch {
    return { platform: 'unknown', embedUrl: null, icon: '🔗' };
  }
}

// ========== Skip to Content Link ==========
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'absolute',
        top: '-100%',
        left: '1rem',
        padding: '0.75rem 1.5rem',
        background: 'var(--accent)',
        color: 'white',
        fontWeight: 700,
        zIndex: 100,
        textDecoration: 'none',
        borderRadius: '0 0 4px 4px',
      }}
      onFocus={(e) => { e.target.style.top = '0'; }}
      onBlur={(e) => { e.target.style.top = '-100%'; }}
    >
      Skip to content
    </a>
  );
}

// ========== Header ==========
function Header({ page, setPage, user, onLogout, unreadCount = 0 }) {
  const navRef = useRef(null);

  return (
    <header
      role="banner"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          className="logo"
          style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', letterSpacing: 'inherit' }}
          onClick={() => setPage('feed')}
          aria-label="OutScroll home"
        >
          out<span>scroll</span>
        </button>
        <nav
          ref={navRef}
          role="navigation"
          aria-label="Main navigation"
          style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}
        >
          {[
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
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
              style={{ background: 'none', border: 'none' }}
              aria-current={page === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
          {user && (
            <>
              <button
                onClick={() => setPage('notifications')}
                className="nav-item"
                style={{ background: 'none', border: 'none', position: 'relative' }}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'var(--danger)',
                    color: 'white',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={onLogout}
                className="nav-item"
                style={{ background: 'none', border: 'none' }}
                aria-label="Log out"
              >
                Out
              </button>
            </>
          )}
        </nav>
      </div>
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
        setTimeout(() => {
          if (pointsRef.current) pointsRef.current.style.opacity = '0';
        }, 2000);
      }
    }
  }, [user, onTrack]);

  const handlePlay = useCallback(async () => {
    if (!user) return alert('Login to earn points!');
    setEmbedded(true);
    if (!tracked['play']) {
      await doTrack(video.id, 'play');
      setTracked(t => ({ ...t, play: true }));
    }
  }, [user, tracked, doTrack, video.id]);

  const handle50 = useCallback(async () => {
    if (!user) return;
    if (!tracked['50_watch']) {
      await doTrack(video.id, '50_watch');
      setTracked(t => ({ ...t, '50_watch': true }));
    }
  }, [user, tracked, doTrack, video.id]);

  const handleFull = useCallback(async () => {
    if (!user) return;
    if (!tracked['full_watch']) {
      await doTrack(video.id, 'full_watch');
      setTracked(t => ({ ...t, full_watch: true }));
    }
  }, [user, tracked, doTrack, video.id]);

  const handleSkip = useCallback(async () => {
    if (!user) return;
    if (!tracked['skip']) {
      await doTrack(video.id, 'skip');
      setTracked(t => ({ ...t, skip: true }));
    }
    setEmbedded(false);
  }, [user, tracked, doTrack, video.id]);

  return (
    <article className="neu-card animate-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      {/* Points toast */}
      <div
        ref={pointsRef}
        aria-live="polite"
        style={{
          position: 'absolute',
          top: '-2rem',
          right: '1rem',
          fontWeight: 800,
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.25rem',
          color: pointsEarned && pointsEarned > 0 ? 'var(--success)' : 'var(--danger)',
          opacity: 0,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
        }}
      />

      {/* Video header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            aria-hidden="true"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '2px',
              background: 'var(--bg-inset)',
              boxShadow: 'var(--shadow-inset)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{video.username}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span aria-label={`Platform: ${platform}`}>{platform}</span> ·{' '}
              <time dateTime={video.created_at}>{new Date(video.created_at).toLocaleDateString()}</time>
            </div>
          </div>
        </div>
        <div className="neu-card-inset" style={{
          padding: '0.35rem 0.75rem',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
        }}>
          <span aria-label={`${video.watch_count || 0} people watched this`}>{video.watch_count || 0} watches</span>
        </div>
      </div>

      {/* Embed or URL */}
      {embedded && embedUrl ? (
        <div className="video-embed" style={{ marginBottom: '1rem' }}>
          <iframe
            src={embedUrl}
            title={`Video by ${video.username} on ${platform}`}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      ) : (
        <button
          className="neu-card-inset"
          onClick={handlePlay}
          style={{
            display: 'block',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--accent)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            wordBreak: 'break-all',
            marginBottom: '1rem',
            cursor: 'pointer',
            background: 'var(--bg-inset)',
            border: '1px solid rgba(255,255,255,0.02)',
            boxShadow: 'var(--shadow-inset)',
          }}
          aria-label={`Play video by ${video.username} on ${platform}`}
        >
          {icon} Watch on {platform}
        </button>
      )}

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }} role="group" aria-label="Watch tracking actions">
        <button
          className={`neu-btn ${tracked['play'] ? 'neu-btn-primary' : ''}`}
          onClick={handlePlay}
          style={{ padding: '0.6rem', fontSize: '0.7rem' }}
          disabled={tracked['play']}
          aria-label={tracked['play'] ? 'Already played' : 'Play video, earn 5 points'}
          aria-pressed={tracked['play']}
        >
          ▶ Play (+5)
        </button>
        <button
          className={`neu-btn ${tracked['50_watch'] ? 'neu-btn-success' : ''}`}
          onClick={handle50}
          style={{ padding: '0.6rem', fontSize: '0.7rem' }}
          disabled={tracked['50_watch']}
          aria-label={tracked['50_watch'] ? 'Already marked 50%' : 'Mark 50% watched, earn 70 points'}
          aria-pressed={tracked['50_watch']}
        >
          50% (+70)
        </button>
        <button
          className={`neu-btn ${tracked['full_watch'] ? 'neu-btn-success' : ''}`}
          onClick={handleFull}
          style={{ padding: '0.6rem', fontSize: '0.7rem' }}
          disabled={tracked['full_watch']}
          aria-label={tracked['full_watch'] ? 'Already marked full' : 'Mark fully watched, earn 100 points'}
          aria-pressed={tracked['full_watch']}
        >
          Full (+100)
        </button>
        <button
          className={`neu-btn ${tracked['skip'] ? 'neu-btn-danger' : ''}`}
          onClick={handleSkip}
          style={{ padding: '0.6rem', fontSize: '0.7rem' }}
          disabled={tracked['skip']}
          aria-label={tracked['skip'] ? 'Already skipped' : 'Skip video, lose 5 points'}
          aria-pressed={tracked['skip']}
        >
          Skip (-5)
        </button>
      </div>
    </article>
  );
}

// ========== FeedPage (Virtualized Infinite Scroll) ==========
const LOADING_ITEMS = Array.from({ length: 5 }, (_, i) => ({ id: `loading-${i}`, _loading: true }));

function LoadingCard() {
  return (
    <div style={{ padding: '1.25rem 0' }}>
      <div className="loading-pulse neu-card" style={{ height: '200px', marginBottom: '1rem' }} role="presentation" />
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
  const virtuosoRef = useRef(null);

  const fetchVideos = useCallback(async (offset, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (append) setLoadingMore(true);

    try {
      const res = await axios.get(`${API}/videos/feed`, { params: { limit: 20, offset } });
      const newVideos = res.data.videos;
      if (append) {
        setVideos(prev => [...prev, ...newVideos]);
      } else {
        setVideos(newVideos);
      }
      setHasMore(newVideos.length === 20);
      offsetRef.current = offset + newVideos.length;
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchVideos(0);
  }, [fetchVideos]);

  const loadMore = useCallback(() => {
    if (!hasMore || fetchingRef.current) return;
    fetchVideos(offsetRef.current, true);
  }, [hasMore, fetchVideos]);

  // Header component rendered above the virtual list
  const ListHeader = useMemo(() => (
    <div style={{ padding: '0 0 1rem 0' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Feed</h2>
      {!loading && videos.length > 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {videos.length} video{videos.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  ), [loading, videos.length]);

  // Empty state
  if (!loading && videos.length === 0) {
    return (
      <div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Feed</h2>
        <div className="neu-card-inset" style={{ padding: '3rem', textAlign: 'center' }}>
          <div aria-hidden="true" style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
          <p style={{ color: 'var(--text-muted)' }}>No videos yet. Be the first to post!</p>
        </div>
      </div>
    );
  }

  // Initial loading state
  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Feed</h2>
        <div style={{ padding: '2rem 0' }}>
          {LOADING_ITEMS.map(item => (
            <LoadingCard key={item.id} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div role="feed" aria-label={`Feed of ${videos.length} videos`} aria-busy={loadingMore}>
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: 'calc(100vh - 200px)' }}
        totalCount={videos.length + (loadingMore ? 1 : 0)}
        itemContent={(index) => {
          // Show loading skeleton at the bottom
          if (index >= videos.length) {
            return <LoadingCard />;
          }
          const video = videos[index];
          return (
            <div style={{ padding: '0.5rem 0' }}>
              <VideoCard video={video} onTrack={onTrack} user={user} />
            </div>
          );
        }}
        endReached={loadMore}
        overscan={200}
        components={{ Header: () => ListHeader }}
        computeItemKey={(index) => {
          if (index >= videos.length) return `loading-${index}`;
          return videos[index].id;
        }}
        itemSize={(index) => {
          // Estimate item height for better scroll performance
          if (index >= videos.length) return 220; // Loading skeleton
          return 340; // Average VideoCard height
        }}
      />
      {loadingMore && (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Loading more videos...
        </div>
      )}
      {!hasMore && videos.length > 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          You've reached the end. Check back later for new content!
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
    axios.get(`${API}/leaderboard`).then(res => {
      setLeaderboard(res.data.leaderboard);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const getRankColor = (rank) => {
    if (rank === 1) return 'var(--gold)';
    if (rank === 2) return 'var(--silver)';
    if (rank === 3) return 'var(--bronze)';
    return 'var(--text-muted)';
  };

  const getRankLabel = (rank) => {
    if (rank === 1) return '1st place, Gold';
    if (rank === 2) return '2nd place, Silver';
    if (rank === 3) return '3rd place, Bronze';
    return `Rank ${rank}`;
  };

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const shareRank = useCallback((username, rank, points) => {
    const text = encodeURIComponent(`🏆 I'm #${rank} on OutScroll with ${points.toLocaleString()} points! 🚀 Climb the ladder by watching business video ads. #OutScroll #Leaderboard`);
    const url = encodeURIComponent('https://outscroll.com');

    if (navigator.share) {
      navigator.share({ title: 'My OutScroll Rank', text: decodeURIComponent(text), url: 'https://outscroll.com' });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`🏆 I'm #${rank} on OutScroll with ${points.toLocaleString()} points! 🚀 Climb the ladder by watching business video ads. https://outscroll.com`).then(() => {
        alert('Rank copied to clipboard! Share it on social media.');
      });
    }
  }, []);

  if (!user) {
    return (
      <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="neu-card" style={{ padding: '3rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏆</div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Leaderboard</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Sign in to see the full leaderboard and track your rank.
          </p>
          <button
            className="neu-btn neu-btn-primary"
            onClick={() => setPage('profile')}
            style={{ padding: '0.875rem 2.5rem', fontSize: '0.9rem' }}
          >
            Sign In to View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Leaderboard</h2>

      {/* Top 3 podium */}
      {leaderboard.length >= 3 && (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}
          role="list"
          aria-label="Top 3 users"
        >
          {/* 2nd place */}
          <div className="neu-card" role="listitem" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2rem' }}>
            <div aria-hidden="true" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥈</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{leaderboard[1]?.username}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 900, color: 'var(--silver)' }}>
              {leaderboard[1]?.total_points.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>points</div>
            <button onClick={() => shareRank(leaderboard[1]?.username, leaderboard[1]?.rank, leaderboard[1]?.total_points)} style={{ marginTop: '0.75rem', background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '0.35rem 0.75rem', borderRadius: '2px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }} aria-label="Share 2nd place rank">
              📤 Share
            </button>
          </div>
          {/* 1st place */}
          <div className="neu-card glow-gold" role="listitem" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid rgba(255,215,0,0.15)' }}>
            <div aria-hidden="true" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🥇</div>
            <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{leaderboard[0]?.username}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 900, color: 'var(--gold)', textShadow: '0 0 15px rgba(255,215,0,0.3)' }}>
              {leaderboard[0]?.total_points.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>points · #1</div>
            <button onClick={() => shareRank(leaderboard[0]?.username, leaderboard[0]?.rank, leaderboard[0]?.total_points)} style={{ marginTop: '0.75rem', background: 'none', border: '1px solid rgba(255,215,0,0.2)', padding: '0.35rem 0.75rem', borderRadius: '2px', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }} aria-label="Share 1st place rank">
              📤 Share
            </button>
          </div>
          {/* 3rd place */}
          <div className="neu-card" role="listitem" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3rem' }}>
            <div aria-hidden="true" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥉</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{leaderboard[2]?.username}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 900, color: 'var(--bronze)' }}>
              {leaderboard[2]?.total_points.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>points</div>
            <button onClick={() => shareRank(leaderboard[2]?.username, leaderboard[2]?.rank, leaderboard[2]?.total_points)} style={{ marginTop: '0.75rem', background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '0.35rem 0.75rem', borderRadius: '2px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }} aria-label="Share 3rd place rank">
              📤 Share
            </button>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="neu-card" style={{ padding: '1rem', overflow: 'hidden' }}>
        <table className="leaderboard-table" aria-label="Leaderboard rankings">
          <thead>
            <tr>
              <th scope="col" style={{ width: '60px' }}>Rank</th>
              <th scope="col">Username</th>
              <th scope="col" style={{ textAlign: 'right' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr key={entry.username} style={{ animation: `fadeIn 0.2s ease` }}>
                <td>
                  <span aria-label={getRankLabel(entry.rank)} style={{ color: getRankColor(entry.rank) }}>
                    {getRankEmoji(entry.rank) || `#${entry.rank}`}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{entry.username}</td>
                <td style={{
                  textAlign: 'right',
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: entry.rank <= 3 ? getRankColor(entry.rank) : 'var(--text-primary)',
                }}>
                  {entry.total_points.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leaderboard.length === 0 && !loading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No users yet. Sign up to climb the ranks!
          </div>
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

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = Object.fromEntries(new FormData(e.target));

    try {
      if (mode === 'signup') {
        if (data.password.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }
        const res = await axios.post(`${API}/auth/signup`, data);
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user);
      } else {
        const res = await axios.post(`${API}/auth/login`, {
          username: data.username,
          password: data.password,
        });
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '3rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>
        {mode === 'login' ? 'Welcome back' : 'Join OutScroll'}
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        {mode === 'login'
          ? 'Sign in to track your points and climb the ranks.'
          : 'Create an account to start earning points by watching content.'}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {mode === 'signup' && (
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="auth-email" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 600 }}>
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="neu-input"
              style={{ width: '100%', padding: '0.875rem', fontSize: '0.9rem' }}
              placeholder="you@email.com"
            />
          </div>
        )}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="auth-username" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 600 }}>
            Username
          </label>
          <input
            id="auth-username"
            ref={usernameRef}
            name="username"
            required
            minLength={3}
            maxLength={20}
            autoComplete="username"
            className="neu-input"
            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9rem' }}
            placeholder="pick a username"
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="auth-password" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 600 }}>
            Password
          </label>
          <input
            id="auth-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="neu-input"
            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9rem' }}
            placeholder="min 8 chars, upper + lower + number"
          />
        </div>

        {error && (
          <div
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: 'var(--danger)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="neu-btn neu-btn-primary"
          style={{ width: '100%', padding: '0.875rem', fontSize: '0.85rem' }}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
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
    axios.get(`${API}/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      setHasPostedToday(res.data.has_posted_today);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (message && messageRef.current) {
      messageRef.current.focus();
    }
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await axios.post(`${API}/videos/submit`, { url }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage({ type: 'success', text: 'Video posted! Others can now watch it.' });
      setUrl('');
      setHasPostedToday(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit' });
    } finally {
      setLoading(false);
    }
  };

  const platformHint = useMemo(() => {
    if (!url) return null;
    const { platform, icon } = parseVideoUrl(url);
    return { platform, icon };
  }, [url]);

  return (
    <div style={{ maxWidth: '500px', margin: '3rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Post a Video</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Share one link per day. Earn points when others watch it.
      </p>

      {hasPostedToday && (
        <div className="neu-card-inset" style={{ padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <div aria-hidden="true" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div>
          <div style={{ fontWeight: 700 }}>You've posted today</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Come back tomorrow to post again
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="neu-card" style={{ padding: '1.5rem' }}>
          <label htmlFor="submit-url" style={{
            display: 'block',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '0.5rem',
            fontWeight: 600,
          }}>
            Video URL
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="submit-url"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              className="neu-input"
              style={{ width: '100%', padding: '0.875rem', fontSize: '0.9rem', paddingRight: '3rem' }}
              placeholder="https://www.tiktok.com/@creator/video/..."
              disabled={hasPostedToday}
              aria-describedby="submit-url-hint"
            />
            {platformHint && (
              <span aria-hidden="true" style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1.1rem',
              }}>
                {platformHint.icon}
              </span>
            )}
          </div>
          <div id="submit-url-hint" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['TikTok', 'Reels', 'Shorts'].map(p => (
              <span key={p} style={{
                fontSize: '0.65rem',
                padding: '0.25rem 0.5rem',
                background: 'var(--bg-inset)',
                color: 'var(--text-muted)',
                borderRadius: '2px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {p}
              </span>
            ))}
          </div>
        </div>

        {message && (
          <div
            ref={messageRef}
            role="status"
            tabIndex={-1}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: message.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.85rem',
            }}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          className="neu-btn neu-btn-primary"
          style={{ width: '100%', padding: '0.875rem', fontSize: '0.85rem', marginTop: '1rem' }}
          disabled={loading || hasPostedToday}
          aria-busy={loading}
        >
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

  useEffect(() => {
    if (!user) return;
    axios.get(`${API}/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      setProfile(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (!user) return <AuthPage onLogin={() => {}} />;
  if (loading) return <div className="loading-pulse neu-card" style={{ height: '300px', margin: '2rem 0' }} role="status" aria-label="Loading profile" />;

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="neu-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{profile?.user?.username}</h2>
            {profile?.user?.business_name && (
              <div style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>{profile.user.business_name}</div>
            )}
            <div style={{
              display: 'inline-block',
              padding: '0.2rem 0.5rem',
              marginTop: '0.25rem',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '2px',
              background: profile?.user?.approval_status === 'approved' ? 'rgba(74,222,128,0.15)' : profile?.user?.approval_status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
              color: profile?.user?.approval_status === 'approved' ? 'var(--success)' : profile?.user?.approval_status === 'rejected' ? 'var(--danger)' : 'var(--warning)',
            }}>
              {profile?.user?.approval_status || 'pending'}
            </div>
          </div>
          <div className="neu-card-inset" style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rank</div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.75rem',
              fontWeight: 900,
              color: profile?.rank <= 3 ? ['var(--gold)', 'var(--silver)', 'var(--bronze)'][profile.rank - 1] : 'var(--text-primary)',
            }}>
              #{profile?.rank}
            </div>
          </div>
        </div>

        <div className="neu-card-inset" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
            Total Points
          </div>
          <div className="points-display" aria-label={`${profile?.user?.total_points.toLocaleString()} total points`}>
            {profile?.user?.total_points.toLocaleString()}
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <div className="neu-card-inset" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Videos Posted</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', marginTop: '0.25rem' }}>{profile?.videos?.length || 0}</div>
          </div>
          <div className="neu-card-inset" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Member Since</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', marginTop: '0.25rem' }}>
              {new Date(profile?.user?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Points breakdown */}
      <div className="neu-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>How to Earn Points</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }} role="list" aria-label="Points system">
          {[
            { action: 'Click play', points: '+5', color: 'var(--accent)' },
            { action: 'Watch 50%', points: '+70', color: 'var(--success)' },
            { action: 'Full watch', points: '+100', color: 'var(--success)' },
            { action: 'Skip before 50%', points: '-5', color: 'var(--danger)' },
          ].map(item => (
            <div key={item.action} role="listitem" className="neu-card-inset" style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.85rem' }}>{item.action}</span>
              <span style={{ fontWeight: 800, color: item.color, fontFamily: "'Playfair Display', serif" }}>{item.points}</span>
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
    axios.get(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      setNotifications(res.data.notifications);
      // Mark all as read
      axios.put(`${API}/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(() => onMarkRead());
    }).catch(() => {}).finally(() => setLoading(false));
  }, [onMarkRead]);

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Notifications</h2>
        {[1, 2, 3].map(i => (
          <div key={i} className="loading-pulse neu-card" style={{ height: '60px', marginBottom: '0.75rem' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Notifications</h2>
      {notifications.length === 0 ? (
        <div className="neu-card-inset" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔔</div>
          <p style={{ color: 'var(--text-muted)' }}>No notifications yet. Post a video and watch the engagement roll in!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {notifications.map(notif => (
            <div key={notif.id} className="neu-card" style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              opacity: notif.read ? 0.6 : 1,
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: notif.points > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', flexShrink: 0,
              }}>
                {notif.points > 0 ? '▶' : '⏭'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notif.message}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>
              {notif.points != null && (
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: notif.points > 0 ? 'var(--success)' : 'var(--danger)',
                }}>
                  {notif.points > 0 ? '+' : ''}{notif.points}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Main App ==========
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
      axios.get(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setUser(res.data.user);
      }).catch(() => {
        localStorage.removeItem('token');
      }).finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    setPage('feed');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('feed');
  }, []);

  // Listen for navigation events from other components (e.g., CookieConsent)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setPage(e.detail);
    };
    window.addEventListener('outscroll-navigate', handler);
    return () => window.removeEventListener('outscroll-navigate', handler);
  }, []);

  const handleTrack = useCallback(async (videoId, action) => {
    try {
      const res = await axios.post(`${API}/engagement/track`, {
        video_id: videoId,
        action,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return res.data;
    } catch (err) {
      console.error('Track error:', err);
      return null;
    }
  }, []);

  // Poll for unread notifications every 30s
  useEffect(() => {
    if (!user) return;
    const poll = () => {
      axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(res => {
        setUnreadCount(res.data.unread_count || 0);
      }).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Focus management: move focus to main content on page change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }, [page]);

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-pulse neu-card" style={{ width: '200px', height: '60px' }} role="status" aria-label="Loading" />
      </div>
    );
  }

  // Show landing page if not authenticated and haven't entered yet
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
      <div style={{ minHeight: '100vh' }}>
        <Header page={page} setPage={setPage} user={user} onLogout={handleLogout} unreadCount={unreadCount} />

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          role="main"
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
          {page === 'admin' && <AdminPage />}
        </main>

        <footer
          role="contentinfo"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            borderTop: '1px solid rgba(255,255,255,0.03)',
            marginTop: '3rem',
          }}
        >
          <span className="logo" style={{ fontSize: '1rem' }}>out<span>scroll</span></span>
          <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            Free leaderboard for entrepreneurs · Post vertical ads · Climb by watching others
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { id: 'faq', label: 'FAQ' },
              { id: 'content-policy', label: 'Content Policy' },
              { id: 'privacy', label: 'Privacy Policy' },
              { id: 'terms', label: 'Terms' },
              { id: 'legacy', label: 'Disclaimer' },
              { id: 'data-rights', label: 'My Data' },
            ].map(link => (
              <button
                key={link.id}
                onClick={() => setPage(link.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                {link.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.65rem' }}>
            © 2026 OutScroll · DPDP & GDPR Compliant
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
