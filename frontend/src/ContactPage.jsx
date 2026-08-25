import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

export default function ContactPage({ user }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState(null); // { type: 'success'|'error', text: '' }
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await axios.post(`${API}/api/contact`, form);
      setStatus({ type: 'success', text: res.data.message || 'Message sent!' });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.error || 'Failed to send message' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '0 1rem' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Contact us</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        For data requests, account deletion, complaints, or general inquiries.
        We respond within 72 hours.
      </p>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="contact-name" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
            Name *
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={100}
            value={form.name}
            onChange={handleChange}
            className="input"
            placeholder="Your name"
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="contact-email" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
            Email (optional)
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            maxLength={255}
            value={form.email}
            onChange={handleChange}
            className="input"
            placeholder="you@example.com"
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Only if you want a reply. Not displayed publicly.
          </p>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="contact-subject" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
            Subject *
          </label>
          <select
            id="contact-subject"
            name="subject"
            required
            value={form.subject}
            onChange={handleChange}
            className="input"
          >
            <option value="">Select a reason</option>
            <option value="Account deletion">Request account deletion</option>
            <option value="Data access request">Request my data (DPDP/GDPR)</option>
            <option value="Data correction">Correct my personal data</option>
            <option value="Report content">Report content violation</option>
            <option value="Complaint">File a complaint</option>
            <option value="General inquiry">General question</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="contact-message" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
            Message *
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            maxLength={2000}
            rows={5}
            value={form.message}
            onChange={handleChange}
            className="input"
            placeholder="Describe your request..."
            style={{ resize: 'vertical', minHeight: '100px' }}
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {form.message.length}/2000 characters
          </p>
        </div>

        {status && (
          <div
            role="alert"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              background: status.type === 'success' ? 'var(--success-light, #e6f9ee)' : 'var(--danger-light, #fde8e8)',
              color: status.type === 'success' ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)',
              border: `1px solid ${status.type === 'success' ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)'}20`,
            }}
          >
            {status.text}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', padding: '0.875rem', fontSize: '0.95rem' }}
        >
          {loading ? 'Sending...' : 'Send message'}
        </button>
      </form>

      <div className="card-inset" style={{ padding: '1.25rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>DPDP/GDPR requests:</strong> Use the subject "Request my data" or "Request account deletion" for data-related requests under the Digital Personal Data Protection Act 2023 (India) or GDPR (EU). We process all data requests within 30 days.
      </div>
    </div>
  );
}
