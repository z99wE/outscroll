import { useState, useEffect } from 'react';
import axios from 'axios';

const API = '/api';

export default function BusinessApprovalPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ business_name: '', business_website: '', business_description: '' });

  useEffect(() => {
    axios.get(`${API}/business/status`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      setStatus(res.data);
      if (res.data.business_name) {
        setForm({
          business_name: res.data.business_name || '',
          business_website: res.data.business_website || '',
          business_description: res.data.business_description || '',
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await axios.put(`${API}/business/submit`, form, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage({ type: 'success', text: 'Business profile submitted for review! We typically review within 24-48 hours.' });
      setStatus(prev => ({ ...prev, approval_status: 'pending', ...form }));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-pulse" style={{ height: '300px', margin: '2rem 0' }} role="status" aria-label="Loading" />;
  }

  const isApproved = status?.approval_status === 'approved';
  const isPending = status?.approval_status === 'pending';
  const isRejected = status?.approval_status === 'rejected';

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Business profile</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Submit your business website for review. Once approved, you can start posting video ads.
      </p>

      {/* Status banner */}
      {isApproved && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--success)' }}>
          <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem' }}>✓ Approved</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Your business is approved. You can post videos now!
          </div>
        </div>
      )}

      {isPending && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--warning)' }}>
          <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: '0.25rem' }}>⏳ Under review</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Your business profile is being reviewed. This usually takes 24-48 hours.
          </div>
        </div>
      )}

      {isRejected && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--danger)' }}>
          <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '0.25rem' }}>✗ Not approved</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {status.rejection_reason || 'Your business profile was not approved. Please update and resubmit.'}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>
              Business name *
            </label>
            <input
              type="text"
              value={form.business_name}
              onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
              required
              className="input"
              placeholder="Your business name"
              disabled={isApproved}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>
              Business website *
            </label>
            <input
              type="url"
              value={form.business_website}
              onChange={e => setForm(f => ({ ...f, business_website: e.target.value }))}
              required
              className="input"
              placeholder="https://yourbusiness.com"
              disabled={isApproved}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>
              Business description
            </label>
            <textarea
              value={form.business_description}
              onChange={e => setForm(f => ({ ...f, business_description: e.target.value }))}
              className="input"
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              placeholder="Brief description of your business (optional)"
              disabled={isApproved}
            />
          </div>

          {message && (
            <div role={message.type === 'success' ? 'status' : 'alert'}
              style={{
                padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem',
                background: message.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                border: `1px solid ${message.type === 'success' ? 'rgba(0,143,76,0.2)' : 'rgba(233,78,51,0.2)'}`,
                color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
              }}>
              {message.text}
            </div>
          )}

          {!isApproved && (
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.875rem' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : isPending || isRejected ? 'Resubmit for review' : 'Submit for review'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
