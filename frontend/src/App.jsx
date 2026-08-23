import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = '/api';

// ========== Helper: parse video URL to get platform info ==========
function parseVideoUrl(url) {
  if (!url) return { platform: 'unknown', embedUrl: null };
  try {
    const u = new URL(url);
    // TikTok
    if (u.hostname.includes('tiktok.com')) {
      const videoId = u.pathname.split('/').pop();
      return {
        platform: 'tiktok',
        embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
        icon: '♪'
      };
    }
    // Instagram Reels
    if (u.hostname.includes('instagram.com')) {
      return {
        platform: 'instagram',
        embedUrl: `${u.href.endsWith('/') ? u.href : u.href + '/'}`,
        icon: '◎'
      };
    }
    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId;
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get('v');
      }
      return {
        platform: 'youtube',
        embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null,
        icon: '▶'
      };
    }
    // Twitter/X
    if (u.hostname.includes('twitter.com') || u.hostname.includes('x.com')) {
      return {
        platform: 'twitter',
        embedUrl: null,
        icon: '𝕏'
      };
    }
    return { platform: 'unknown', embedUrl: null, icon: '🔗' };
  } catch {
    return { platform: 'unknown', embedUrl: null, icon: '🔗' };
  }
}

// ========== Components ==========

function Header({ page, setPage, user, onLogout }) {
  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div
          className="logo"
          style={{ cursor: 'pointer' }}
          onClick={() => setPage('feed')}
        >
          out<span>scroll</span>
        </div>
        <nav style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          {[
            { id: 'feed', label: 'Feed' },
            { id: 'leaderboard', label: 'Ranks' },
            ...(user ? [{ id: 'submit', label: 'Post' }, { id: 'profile', label: 'Profile' }] : []),
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
              style={{ background: 'none', border: 'none' }}
            >
              {item.label}
            </button>
          ))}
          {user && (
            <button
              onClick={onLogout}
              className="nav-item"
              style={{ background: 'none', border: 'none' }}
            >
              Out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function VideoCard({ video, onTrack, user }) {
  const [embedded, setEmbedded] = useState(false);
  const [tracked, setTracked] = useState({});
  const { platform, embedUrl, icon } = parseVideoUrl(video.url);

  const handlePlay = async () => {
    if (!user) return alert('Login to earn points!');
    setEmbedded(true);
    if (!tracked['play']) {
      await onTrack(video.id, 'play');
      setTracked(t => ({ ...t, play: true }));
    }
  };

  const handle50 = async () => {
    if (!user) return;
    if (!tracked['50_watch']) {
      await onTrack(video.id, '50_watch');
      setTracked(t => ({ ...t, '50_watch': true }));
    }
  };

  const handleFull = async () => {
    if (!user) return;
    if (!tracked['full_watch']) {
      await onTrack(video.id, 'full_watch');
      setTracked(t => ({ ...t, full_watch: true }));
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    if (!tracked['skip']) {
      await onTrack(video.id, 'skip');
      setTracked(t => ({ ...t, skip: true }));
    }
    setEmbedded(false);
  };

  return (
    <div className="neu-card animate-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      {/* Video header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '2px',
            background: 'var(--bg-inset)',
            boxShadow: 'var(--shadow-inset)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{video.username}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {platform} · {new Date(video.created_at).toLocaleDateString()}
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
          {video.watch_count || 0} watches
        </div>
      </div>

      {/* Embed or URL */}
      {embedded && embedUrl ? (
        <div className="video-embed" style={{ marginBottom: '1rem' }}>
          <iframe
            src={embedUrl}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      ) : (
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="neu-card-inset"
          style={{
            display: 'block',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--accent)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            wordBreak: 'break-all',
            marginBottom: '1rem',
          }}
          onClick={(e) => {
            e.preventDefault();
            handlePlay();
          }}
        >
          {icon} Watch on {platform}
        </a>
      )}

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        <button
          className={`neu-btn ${tracked['play'] ? 'neu-btn-primary' : ''}`}
          onClick={handlePlay}
          style={{ padding: '0.6rem', fontSize: '0.7rem' }}
          disabled={tracked['play']}
        >
          ▶ Play (+5)
        </button>
        <button
          className={`neu-btn ${tracked['50_watch'] ? 'neu-btn-success' : ''}`}
          onClick={handle50}
          style={{ padding: '0.6rem', fontSize: '0.7rem' }}
          disabled={tracked['50_watch']}
        >
          50% (+70)
        </button>
        <button
          className={`neu-btn ${tracked['full_watch'] ? 'neu-btn-success' : ''}`}
          onClick={handleFull}
          style={{ padding: '0.6rem', fontSize: '0.7rem' }}
          disabled={tracked['full_watch']}
        >
          Full (+100)
        </button>
        <button
          className={`neu-btn ${tracked['skip'] ? 'neu-btn-danger' : ''}`}
          onClick={handleSkip}
          style={{ padding: '0.6rem', fontSize: '0.7rem' }}
          disabled={tracked['skip']}
        >
          Skip (-5)
        </button>
      </div>
    </div>
  );
}

function FeedPage({ user, onTrack }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/videos/feed`).then(res => {
      setVideos(res.data.videos);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem 0' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="loading-pulse neu-card" style={{ height: '200px', marginBottom: '1rem' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Feed</h2>
      {videos.length === 0 ? (
        <div className="neu-card-inset" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
          <p style={{ color: 'var(--text-muted)' }}>No videos yet. Be the first to post!</p>
        </div>
      ) : (
        videos.map(video => (
          <VideoCard key={video.id} video={video} onTrack={onTrack} user={user} />
        ))
      )}
    </div>
  );
}

function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/leaderboard`).then(res => {
      setLeaderboard(res.data.leaderboard);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getRankStyle = (rank) => {
    if (rank === 1) return { color: 'var(--gold)', textShadow: '0 0 15px rgba(255,215,0,0.3)' };
    if (rank === 2) return { color: 'var(--silver)', textShadow: '0 0 15px rgba(192,192,192,0.2)' };
    if (rank === 3) return { color: 'var(--bronze)', textShadow: '0 0 15px rgba(205,127,50,0.2)' };
    return { color: 'var(--text-muted)' };
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Leaderboard</h2>

      {/* Top 3 podium */}
      {leaderboard.length >= 3 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          {/* 2nd place */}
          <div className="neu-card" style={{
            padding: '1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '2rem',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥈</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{leaderboard[1]?.username}</div>
            <div className="rank-silver" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 900 }}>
              {leaderboard[1]?.total_points.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              points
            </div>
          </div>
          {/* 1st place */}
          <div className="neu-card glow-gold" style={{
            padding: '2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid rgba(255,215,0,0.15)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🥇</div>
            <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{leaderboard[0]?.username}</div>
            <div className="rank-gold" style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 900 }}>
              {leaderboard[0]?.total_points.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              points · #1
            </div>
          </div>
          {/* 3rd place */}
          <div className="neu-card" style={{
            padding: '1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '3rem',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥉</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{leaderboard[2]?.username}</div>
            <div className="rank-bronze" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 900 }}>
              {leaderboard[2]?.total_points.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              points
            </div>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="neu-card" style={{ padding: '1rem', overflow: 'hidden' }}>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Rank</th>
              <th>Username</th>
              <th style={{ textAlign: 'right' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => (
              <tr key={idx} style={{ animation: `fadeIn ${0.2 + idx * 0.02}s ease` }}>
                <td>
                  <span style={getRankStyle(entry.rank)}>
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{entry.username}</td>
                <td style={{
                  textAlign: 'right',
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: entry.rank <= 3 ? getRankStyle(entry.rank).color : 'var(--text-primary)',
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

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = Object.fromEntries(new FormData(e.target));

    try {
      if (mode === 'signup') {
        if (data.password.length < 6) {
          setError('Password must be at least 6 characters');
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

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 600 }}>
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="neu-input"
              style={{ width: '100%', padding: '0.875rem', fontSize: '0.9rem' }}
              placeholder="you@email.com"
            />
          </div>
        )}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 600 }}>
            Username
          </label>
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            className="neu-input"
            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9rem' }}
            placeholder="pick a username"
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 600 }}>
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="neu-input"
            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9rem' }}
            placeholder="min 6 characters"
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="neu-btn neu-btn-primary"
          style={{ width: '100%', padding: '0.875rem', fontSize: '0.85rem' }}
          disabled={loading}
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

function SubmitPage({ user }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasPostedToday, setHasPostedToday] = useState(false);

  useEffect(() => {
    axios.get(`${API}/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      setHasPostedToday(res.data.has_posted_today);
    }).catch(() => {});
  }, []);

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

  const platformHint = (() => {
    if (!url) return null;
    const { platform, icon } = parseVideoUrl(url);
    return { platform, icon };
  })();

  return (
    <div style={{ maxWidth: '500px', margin: '3rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Post a Video</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Share one link per day. Earn points when others watch it.
      </p>

      {hasPostedToday && (
        <div className="neu-card-inset" style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div>
          <div style={{ fontWeight: 700 }}>You've posted today</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Come back tomorrow to post again
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="neu-card" style={{ padding: '1.5rem' }}>
          <label style={{
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
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              className="neu-input"
              style={{ width: '100%', padding: '0.875rem', fontSize: '0.9rem', paddingRight: '3rem' }}
              placeholder="https://www.tiktok.com/@creator/video/..."
              disabled={hasPostedToday}
            />
            {platformHint && (
              <span style={{
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
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['TikTok', 'Instagram', 'YouTube', 'Twitter/X'].map(p => (
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
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: message.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.85rem',
          }}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          className="neu-btn neu-btn-primary"
          style={{
            width: '100%',
            padding: '0.875rem',
            fontSize: '0.85rem',
            marginTop: '1rem',
          }}
          disabled={loading || hasPostedToday}
        >
          {loading ? 'Posting...' : 'Post Video'}
        </button>
      </form>
    </div>
  );
}

function ProfilePage({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API}/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      setProfile(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  if (!user) return <AuthPage onLogin={() => {}} />;
  if (loading) return <div className="loading-pulse neu-card" style={{ height: '300px', margin: '2rem 0' }} />;

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="neu-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{profile?.user?.username}</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{profile?.user?.email}</div>
          </div>
          <div className="neu-card-inset" style={{
            padding: '0.5rem 1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Rank
            </div>
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
          <div className="points-display">
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
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { action: 'Click play', points: '+5', color: 'var(--accent)' },
            { action: 'Watch 50%', points: '+70', color: 'var(--success)' },
            { action: 'Full watch', points: '+100', color: 'var(--success)' },
            { action: 'Skip before 50%', points: '-5', color: 'var(--danger)' },
          ].map(item => (
            <div key={item.action} className="neu-card-inset" style={{
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

// ========== Main App ==========

export default function App() {
  const [page, setPage] = useState('feed');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setUser(res.data.user);
      }).catch(() => {
        localStorage.removeItem('token');
      });
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setPage('feed');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('feed');
  };

  const handleTrack = async (videoId, action) => {
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
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header page={page} setPage={setPage} user={user} onLogout={handleLogout} />

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {page === 'feed' && <FeedPage user={user} onTrack={handleTrack} />}
        {page === 'leaderboard' && <LeaderboardPage />}
        {page === 'submit' && user && <SubmitPage user={user} />}
        {page === 'profile' && (user ? <ProfilePage user={user} /> : <AuthPage onLogin={handleLogin} />)}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '3rem 1.5rem',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        borderTop: '1px solid rgba(255,255,255,0.03)',
        marginTop: '3rem',
      }}>
        <span className="logo" style={{ fontSize: '1rem' }}>out<span>scroll</span></span>
        <div style={{ marginTop: '0.5rem' }}>
          Free leaderboard for engagement · Post one link per day · Climb by watching others
        </div>
      </footer>
    </div>
  );
}
