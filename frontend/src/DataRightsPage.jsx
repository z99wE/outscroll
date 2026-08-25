import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = '/api';

export default function DataRightsPage({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const authHeaders = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    if (!user) return;
    axios.get(`${API}/me`, { headers: authHeaders }).then(res => {
      setProfile(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  // Export all user data (GDPR Art. 20, DPDP §6)
  const handleExport = useCallback(async () => {
    setExporting(true);
    setMessage(null);
    try {
      const [meRes, videosRes, notifRes] = await Promise.all([
        axios.get(`${API}/me`, { headers: authHeaders }),
        axios.get(`${API}/videos/feed`, { params: { limit: 100, offset: 0 } }),
        axios.get(`${API}/notifications`, { headers: authHeaders }),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        platform: 'OutScroll',
        legalBasis: 'DPDP Act 2023 §6 / GDPR Art. 20 — Right to Data Portability',
        personalData: {
          id: meRes.data.user.id,
          username: meRes.data.user.username,
          totalPoints: meRes.data.user.total_points,
          rank: meRes.data.rank,
          businessName: meRes.data.user.business_name,
          businessWebsite: meRes.data.user.business_website,
          businessDescription: meRes.data.user.business_description,
          approvalStatus: meRes.data.user.approval_status,
          memberSince: meRes.data.user.created_at,
        },
        videosPosted: meRes.data.videos || [],
        notifications: notifRes.data.notifications || [],
        engagementData: {
          note: 'Individual watch actions are tracked for platform integrity but are anonymized. Your username is not linked to other users\' watch history.',
        },
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `outscroll-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Your data has been exported. Check your downloads folder.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    } finally {
      setExporting(false);
    }
  }, [authHeaders]);

  // Delete account (GDPR Art. 17, DPDP §6 — Right to Erasure)
  const handleDelete = useCallback(async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    setMessage(null);
    try {
      await axios.delete(`${API}/me`, { headers: authHeaders });
      setMessage({ type: 'success', text: 'Account deleted. All personal data has been permanently removed. Redirecting...' });
      setTimeout(() => {
        localStorage.removeItem('token');
        onLogout();
      }, 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete account. Please contact grievance@outscroll.com' });
      setDeleting(false);
    }
  }, [confirmText, authHeaders, onLogout]);

  if (!user) {
    return (
      <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Data Rights</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Sign in to access your data rights under DPDP & GDPR.
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            You can also contact our Grievance Officer at grievance@outscroll.com
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-pulse" style={{ height: '300px', margin: '2rem 0' }} role="status" aria-label="Loading data rights" />;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Data Rights</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.8rem' }}>
        Exercise your rights under the Digital Personal Data Protection Act, 2023 (India) and GDPR (EU).
      </p>

      {message && (
        <div
          role="status"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: message.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.85rem',
          }}
        >
          {message.text}
        </div>
      )}

      {/* What data we hold */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Your Data on OutScroll</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { label: 'Username', value: profile?.user?.username },
            { label: 'Business Name', value: profile?.user?.business_name || 'Not submitted' },
            { label: 'Business Website', value: profile?.user?.business_website || 'Not submitted' },
            { label: 'Approval Status', value: profile?.user?.approval_status || 'pending' },
            { label: 'Total Points', value: profile?.user?.total_points?.toLocaleString() },
            { label: 'Rank', value: `#${profile?.rank}` },
            { label: 'Videos Posted', value: profile?.videos?.length || 0 },
            { label: 'Member Since', value: new Date(profile?.user?.created_at).toLocaleDateString() },
          ].map(item => (
            <div key={item.label} className="card-inset" style={{
              padding: '0.6rem 0.875rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
            }}>
              <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
              <span style={{ fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          Your email is stored securely and <strong>never displayed publicly</strong>.
        </p>
      </div>

      {/* Export Data */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Export Your Data</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Download all your personal data in JSON format. This includes your profile, videos posted, and notifications.
          Required under GDPR Art. 20 (Data Portability) and DPDP §6.
        </p>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={exporting}
          style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem' }}
        >
          {exporting ? 'Exporting...' : '📥 Export All Data'}
        </button>
      </div>

      {/* Delete Account */}
      <div className="card" style={{ padding: '1.5rem', borderLeft: '3px solid var(--danger)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>Delete Account</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Permanently delete your account and all associated personal data. This action is <strong>irreversible</strong>.
          Required under GDPR Art. 17 (Right to Erasure) and DPDP §6.
        </p>

        <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <strong>What gets deleted:</strong> Your username, email, password hash, business profile, all engagement history, all notifications, and all points data. Your posted videos remain on their original platforms (TikTok/Instagram/YouTube) but are removed from OutScroll's feed.
          </p>
        </div>

        {!confirmDelete ? (
          <button
            className="btn btn-danger"
            onClick={() => setConfirmDelete(true)}
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem' }}
          >
            Delete My Account
          </button>
        ) : (
          <div>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Type <strong style={{ color: 'var(--danger)' }}>DELETE</strong> to confirm:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                className="input"
                style={{ flex: 1, padding: '0.75rem', fontSize: '0.85rem' }}
                placeholder="Type DELETE"
                autoFocus
              />
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem' }}
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
            <button
              onClick={() => { setConfirmDelete(false); setConfirmText(''); }}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: '0.75rem', marginTop: '0.5rem', padding: 0,
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Grievance Officer */}
      <div className="card-inset" style={{ padding: '1.25rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Need help?</strong> Contact our Grievance Officer at{' '}
        <span style={{ color: 'var(--accent)' }}>grievance@outscroll.com</span> for any data-related requests.
        We respond within 30 days as required by law.
      </div>
    </div>
  );
}
