import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = '/api';

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('admin_key') || '');
  const [authenticated, setAuthenticated] = useState(false);
  const [pending, setPending] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [recentVideos, setRecentVideos] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const keyRef = useRef(null);

  const headers = { 'x-admin-key': adminKey };

  const authenticate = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await axios.get(`${API}/admin/stats`, { headers });
      setStats(res.data);
      setAuthenticated(true);
      localStorage.setItem('admin_key', adminKey);
      fetchPending();
      fetchAllUsers();
      fetchVideos();
    } catch {
      setMessage({ type: 'error', text: 'Invalid admin key' });
    }
  }, [adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (adminKey) authenticate();
    else if (keyRef.current) keyRef.current.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPending = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/pending`, { headers });
      setPending(res.data.users);
    } catch {}
  }, [headers]);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/users`, { headers });
      setAllUsers(res.data.users);
    } catch {}
  }, [headers]);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/videos`, { headers });
      setRecentVideos(res.data.videos);
    } catch {}
  }, [headers]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/stats`, { headers });
      setStats(res.data);
    } catch {}
  }, [headers]);

  const handleReview = async (userId, action, reason) => {
    setLoading(true);
    setMessage(null);
    try {
      await axios.put(`${API}/admin/review`, {
        user_id: userId,
        action,
        rejection_reason: reason || undefined,
      }, { headers });
      setMessage({ type: 'success', text: action === 'approve' ? 'Business approved!' : 'Business rejected' });
      fetchPending();
      fetchStats();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = () => {
    fetchStats();
    fetchPending();
    fetchAllUsers();
    fetchVideos();
  };

  // Login form
  if (!authenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '3rem auto' }}>
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Admin access</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Enter your admin key to access the dashboard.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            ref={keyRef}
            type="password"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            className="input"
            style={{ flex: 1 }}
            placeholder="Admin key"
            onKeyDown={e => e.key === 'Enter' && authenticate()}
          />
          <button className="btn btn-primary" onClick={authenticate} style={{ padding: '0.75rem 1.5rem' }}>
            Enter
          </button>
        </div>
        {message && (
          <div role="alert" style={{
            marginTop: '1rem', padding: '0.75rem 1rem', fontSize: '0.85rem',
            background: 'var(--danger-light)', border: '1px solid rgba(233,78,51,0.2)',
            color: 'var(--danger)',
          }}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Admin dashboard</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Review business submissions, monitor videos, and track platform activity.
      </p>

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
          {[
            { label: 'Users', value: stats.total_users, color: 'var(--accent)' },
            { label: 'Videos', value: stats.total_videos, color: 'var(--success)' },
            { label: 'Pending', value: stats.pending_review, color: 'var(--warning)' },
            { label: 'Engagements', value: stats.total_engagements, color: 'var(--text-muted)' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: "'Anton', sans-serif", fontSize: '1.5rem', fontWeight: 900, color: stat.color }}>
                {stat.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'pending', label: `Pending (${pending.length})` },
          { id: 'videos', label: `Recent videos (${recentVideos.length})` },
          { id: 'all', label: 'All users' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div role="status" style={{
          marginBottom: '1rem', padding: '0.75rem 1rem', fontSize: '0.85rem',
          background: message.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
          border: `1px solid ${message.type === 'success' ? 'rgba(0,143,76,0.2)' : 'rgba(233,78,51,0.2)'}`,
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
        }}>
          {message.text}
        </div>
      )}

      {/* Pending reviews */}
      {activeTab === 'pending' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {pending.length === 0 ? (
            <div className="card-inset" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              <p style={{ color: 'var(--text-secondary)' }}>No pending reviews</p>
            </div>
          ) : (
            pending.map(u => (
              <div key={u.id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-heading)' }}>{u.business_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '0.25rem' }}>
                      <a href={u.business_website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                        {u.business_website}
                      </a>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      @{u.username} · Submitted {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`badge ${u.approval_status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                    {u.approval_status}
                  </span>
                </div>
                {u.business_description && (
                  <div className="card-inset" style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    {u.business_description}
                  </div>
                )}
                {u.rejection_reason && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '1rem' }}>
                    Previous rejection: {u.rejection_reason}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-success"
                    onClick={() => handleReview(u.id, 'approve')}
                    disabled={loading}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason !== null) handleReview(u.id, 'reject', reason);
                    }}
                    disabled={loading}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Recent videos */}
      {activeTab === 'videos' && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {recentVideos.length === 0 ? (
            <div className="card-inset" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <p style={{ color: 'var(--text-secondary)' }}>No videos submitted yet</p>
            </div>
          ) : (
            recentVideos.map(v => {
              const platform = v.url.includes('tiktok.com') ? 'TikTok' : v.url.includes('instagram.com') ? 'Reels' : 'Shorts';
              const icon = platform === 'TikTok' ? '♪' : platform === 'Reels' ? '◎' : '▶';
              return (
                <div key={v.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '6px',
                    background: platform === 'TikTok' ? '#000' : platform === 'Reels' ? 'var(--danger)' : 'var(--danger)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '1rem', flexShrink: 0,
                  }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                      {v.business_name || v.username}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      @{v.username} · {platform} · {new Date(v.created_at).toLocaleString()}
                    </div>
                    <a href={v.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.7rem', color: 'var(--accent)', wordBreak: 'break-all', display: 'block', marginTop: '0.25rem' }}>
                      {v.url}
                    </a>
                  </div>
                  <span className="badge badge-neutral" style={{ flexShrink: 0 }}>
                    {v.watch_count || 0} watches
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* All users */}
      {activeTab === 'all' && (
        <div className="card" style={{ padding: '1rem', overflow: 'hidden' }}>
          <table className="leaderboard-table" aria-label="All users">
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Business</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: 'right' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>@{u.username}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.business_name || '—'}</td>
                  <td>
                    <span className={`badge ${u.approval_status === 'approved' ? 'badge-success' : u.approval_status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {u.approval_status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: "'Anton', sans-serif" }}>
                    {u.total_points.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <button className="btn btn-secondary" onClick={refreshAll} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Donation config */}
      <DonationConfig headers={headers} />
    </div>
  );
}

// ========== Donation Config (admin only) ==========
function DonationConfig({ headers }) {
  const [config, setConfig] = useState({ kofi_url: '', bmc_url: '', donation_enabled: 'false' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    axios.get(`${API}/admin/donation-config`, { headers })
      .then(res => setConfig(prev => ({ ...prev, ...res.data })))
      .catch(() => {});
  }, [headers]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      await axios.put(`${API}/admin/donation-config`, config, { headers });
      setMsg({ type: 'success', text: 'Donation config saved' });
    } catch { setMsg({ type: 'error', text: 'Failed to save' }); }
    finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-heading)' }}>Donation buttons</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Configure Ko-fi and Buy Me a Coffee links. These appear in the footer for all users.
      </p>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>Ko-fi URL</label>
          <input type="url" className="input" value={config.kofi_url || ''}
            onChange={e => setConfig(c => ({ ...c, kofi_url: e.target.value }))}
            placeholder="https://ko-fi.com/yourname" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>Buy Me a Coffee URL</label>
          <input type="url" className="input" value={config.bmc_url || ''}
            onChange={e => setConfig(c => ({ ...c, bmc_url: e.target.value }))}
            placeholder="https://buymeacoffee.com/yourname" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" id="donation-enabled"
            checked={config.donation_enabled === 'true'}
            onChange={e => setConfig(c => ({ ...c, donation_enabled: e.target.checked ? 'true' : 'false' }))}
          />
          <label htmlFor="donation-enabled" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Show donation buttons in footer</label>
        </div>
      </div>
      {msg && (
        <div role="status" style={{
          marginTop: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem',
          background: msg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
          color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
        }}>{msg.text}</div>
      )}
      <button className="btn btn-primary" onClick={save} disabled={saving}
        style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}>
        {saving ? 'Saving...' : 'Save config'}
      </button>
    </div>
  );
}
