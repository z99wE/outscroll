import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = '/api';

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('admin_key') || '');
  const [authenticated, setAuthenticated] = useState(false);
  const [pending, setPending] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

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
    } catch {
      setMessage({ type: 'error', text: 'Invalid admin key' });
    }
  }, [adminKey, headers]);

  useEffect(() => {
    if (adminKey) authenticate();
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

  // Login form
  if (!authenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '3rem auto' }}>
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Admin Access</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Enter your admin key to access the dashboard.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="password"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            className="neu-input"
            style={{ flex: 1, padding: '0.875rem', fontSize: '0.9rem' }}
            placeholder="Admin key"
            onKeyDown={e => e.key === 'Enter' && authenticate()}
          />
          <button
            className="neu-btn neu-btn-primary"
            onClick={authenticate}
            style={{ padding: '0.875rem 1.5rem', fontSize: '0.85rem' }}
          >
            Enter
          </button>
        </div>
        {message && (
          <div role="alert" style={{
            marginTop: '1rem', padding: '0.75rem 1rem', fontSize: '0.85rem',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
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
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Admin Dashboard</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Review business submissions and monitor platform activity.
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
            <div key={stat.label} className="neu-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 900, color: stat.color, marginTop: '0.25rem' }}>
                {stat.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'pending', label: `Pending Review (${pending.length})` },
          { id: 'all', label: 'All Users' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ background: 'none', border: 'none' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div role="status" style={{
          marginBottom: '1rem', padding: '0.75rem 1rem', fontSize: '0.85rem',
          background: message.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
        }}>
          {message.text}
        </div>
      )}

      {/* Pending reviews */}
      {activeTab === 'pending' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {pending.length === 0 ? (
            <div className="neu-card-inset" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              <p style={{ color: 'var(--text-muted)' }}>No pending reviews</p>
            </div>
          ) : (
            pending.map(u => (
              <div key={u.id} className="neu-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{u.business_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '0.25rem' }}>
                      <a href={u.business_website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                        {u.business_website}
                      </a>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      @{u.username} · Submitted {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{
                    padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                    borderRadius: '2px',
                    background: u.approval_status === 'pending' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
                    color: u.approval_status === 'pending' ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {u.approval_status}
                  </div>
                </div>
                {u.business_description && (
                  <div className="neu-card-inset" style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
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
                    className="neu-btn neu-btn-success"
                    onClick={() => handleReview(u.id, 'approve')}
                    disabled={loading}
                    style={{ padding: '0.6rem 1.5rem', fontSize: '0.8rem' }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="neu-btn neu-btn-danger"
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason !== null) handleReview(u.id, 'reject', reason);
                    }}
                    disabled={loading}
                    style={{ padding: '0.6rem 1.5rem', fontSize: '0.8rem' }}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* All users */}
      {activeTab === 'all' && (
        <div className="neu-card" style={{ padding: '1rem', overflow: 'hidden' }}>
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
                    <span style={{
                      padding: '0.15rem 0.4rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                      borderRadius: '2px',
                      background: u.approval_status === 'approved' ? 'rgba(74,222,128,0.15)' : u.approval_status === 'pending' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
                      color: u.approval_status === 'approved' ? 'var(--success)' : u.approval_status === 'pending' ? 'var(--warning)' : 'var(--danger)',
                    }}>
                      {u.approval_status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>
                    {u.total_points.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <button className="neu-btn" onClick={() => { fetchStats(); fetchPending(); fetchAllUsers(); }} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
