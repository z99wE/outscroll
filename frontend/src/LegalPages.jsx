import { useState } from 'react';

// ========== FAQ Page ==========
export function FAQPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      q: 'What is OutScroll?',
      a: 'OutScroll is a free engagement leaderboard for entrepreneurs. Post your business video ads as vertical content (Reels, Shorts, TikTok). Watch other businesses climb the ranks. The more you engage, the higher you rank — no payment required.',
    },
    {
      q: 'How do I get on the leaderboard?',
      a: 'Sign up, submit your business website for approval, and once approved, start posting vertical video ads. Watch other businesses\' content to earn points. Your total engagement score determines your rank.',
    },
    {
      q: 'What kind of videos can I post?',
      a: 'Only vertical short-form video content: TikTok links, Instagram Reels, and YouTube Shorts. No landscape videos, no podcasts, no regular YouTube links. Your content must be a business promotion — product demos, company culture, service explainers, etc.',
    },
    {
      q: 'How does the points system work?',
      a: '+5 for playing a video, +70 for watching 50%, +100 for full watch, -5 for skipping before 50%. Creator posting bonus: none — your content earning views doesn\'t earn YOU points (prevents gaming).',
    },
    {
      q: 'Is it really free?',
      a: 'Yes. $0. No hidden fees, no premium tier, no pay-to-rank. The leaderboard is purely engagement-based.',
    },
    {
      q: 'How do I get approved?',
      a: 'After signing up, submit your business website URL and a brief description. Our team reviews submissions within 24-48 hours. Once approved, you can start posting and climbing.',
    },
    {
      q: 'What content is NOT allowed?',
      a: 'No porn/sexually explicit content, no gambling/betting, no weapons/firearms, no drugs, no hate speech, no scams/pyramid schemes, no violence, no spam, no non-vertical videos. See our full Content Policy for details.',
    },
    {
      q: 'Can I post multiple times per day?',
      a: 'No. One video per day per account. This keeps the feed fresh and prevents spam.',
    },
    {
      q: 'What makes OutScroll different from buying followers?',
      a: 'OutScroll ranks by engagement, not followers. The #1 person is whoever watches the most other businesses\' content. You can\'t buy your way up. You earn it by genuinely engaging with the community.',
    },
    {
      q: 'Is my data safe?',
      a: 'We comply with DPDP (India) and GDPR (EU). We don\'t sell your data. We don\'t show your email or contact info publicly. See our Privacy Policy for full details.',
    },
  ];

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Frequently Asked Questions</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Everything you need to know about OutScroll.
      </p>

      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {faqs.map((faq, i) => (
          <div key={i} className="neu-card" style={{ overflow: 'hidden' }}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              style={{
                width: '100%',
                padding: '1.1rem 1.25rem',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
              aria-expanded={openIndex === i}
            >
              {faq.q}
              <span style={{
                fontSize: '1.2rem',
                transition: 'transform 0.2s',
                transform: openIndex === i ? 'rotate(45deg)' : 'rotate(0)',
                color: 'var(--accent)',
              }}>+</span>
            </button>
            {openIndex === i && (
              <div style={{
                padding: '0 1.25rem 1.1rem',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                animation: 'fadeIn 0.2s ease',
              }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== Content Policy Page ==========
export function ContentPolicyPage() {
  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Content Policy</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.8rem' }}>
        Last updated: August 23, 2026
      </p>

      <div className="neu-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--success)' }}>✓ Allowed Content</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
          {[
            'Business promotion videos (vertical format: Reels, Shorts, TikTok)',
            'Product demos and showcases',
            'Company culture and behind-the-scenes content',
            'Service explanations and tutorials',
            'Customer testimonials (with consent)',
          ].map(item => (
            <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--success)', flexShrink: 0 }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="neu-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--danger)' }}>✗ Prohibited Content</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
          {[
            'Pornography, sexually explicit content, or adult material of any kind',
            'Gambling, betting, or casino-related content',
            'Weapons, firearms, ammunition, or military equipment sales',
            'Drugs, controlled substances, or drug paraphernalia',
            'Hate speech, discrimination, or harassment of any group',
            'Misinformation, fake news, or deliberately misleading content',
            'Scams, pyramid schemes, or fraudulent business opportunities',
            'Content violating any applicable local, state, or international law',
            'Violence, graphic content, or content promoting harm',
            'Spam, repeated identical submissions, or engagement farming',
            'Non-vertical video content (landscape videos, podcasts, etc.)',
            'Content infringing on third-party intellectual property rights',
          ].map(item => (
            <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--danger)', flexShrink: 0 }}>✗</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="neu-card-inset" style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Enforcement:</strong> Violations result in immediate account suspension and content removal. Repeated violations result in permanent ban. All reports are reviewed within 24 hours.
      </div>
    </div>
  );
}

// ========== Privacy Policy (DPDP + GDPR) ==========
export function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Privacy Policy</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.8rem' }}>
        Last updated: August 23, 2026 · Compliant with DPDP Act 2023 (India) and GDPR (EU)
      </p>

      <div style={{ display: 'grid', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>1. Data We Collect</h3>
          <p>We collect only what is necessary to operate the platform:</p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li><strong>Account data:</strong> Username, email (internal only, never displayed publicly), password (hashed)</li>
            <li><strong>Business data:</strong> Business name, website URL, description (submitted for approval)</li>
            <li><strong>Usage data:</strong> Videos posted, engagement actions (watch/skip), points earned</li>
            <li><strong>Technical data:</strong> IP address (for rate limiting and fraud prevention), browser type</li>
          </ul>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>2. How We Use Your Data</h3>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>To operate the leaderboard and engagement system</li>
            <li>To verify your business identity for approval</li>
            <li>To prevent fraud, spam, and abuse</li>
            <li>To send notifications about engagement on your content</li>
          </ul>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>3. What We Don't Do</h3>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>We never sell your data to third parties</li>
            <li>We never display your email or contact information publicly</li>
            <li>We never run targeted advertisements on your data</li>
            <li>We never share your data with other users beyond your username</li>
          </ul>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>4. Your Rights</h3>
          <p>Under DPDP and GDPR, you have the right to:</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
            <li><strong>Erasure:</strong> Request deletion of your account and all associated data</li>
            <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
            <li><strong>Objection:</strong> Object to processing of your data for specific purposes</li>
          </ul>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>5. Data Retention</h3>
          <p>We retain your data for as long as your account is active. Upon account deletion, all personal data is permanently removed within 30 days. Aggregated, anonymized usage statistics may be retained.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>6. Security</h3>
          <p>We implement industry-standard security measures including encrypted data transmission (HTTPS), hashed passwords (bcrypt), rate limiting, and regular security audits.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>7. Contact for Data Requests</h3>
          <p>To exercise your rights under DPDP/GDPR, submit a request through the platform. All requests are processed within 30 days as required by law.</p>
        </section>
      </div>
    </div>
  );
}

// ========== Terms of Service ==========
export function TermsPage() {
  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Terms of Service</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.8rem' }}>
        Last updated: August 23, 2026
      </p>

      <div style={{ display: 'grid', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>1. Acceptance</h3>
          <p>By using OutScroll, you agree to these Terms. If you do not agree, do not use the platform.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>2. Eligibility</h3>
          <p>OutScroll is for businesses and entrepreneurs. You must be at least 18 years old and have a legitimate business to register. One account per business.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>3. Business Approval</h3>
          <p>All businesses must submit their website for review before posting content. Approval is at our sole discretion. We may reject or revoke approval for any business that violates our Content Policy.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>4. Content Rules</h3>
          <p>You may only post vertical short-form video content (TikTok, Instagram Reels, YouTube Shorts) that promotes your legitimate business. See our Content Policy for full details. Violations result in immediate suspension.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>5. Fair Play</h3>
          <p>Manipulating the engagement system (bot watches, engagement farming, account farming, or any automated interaction) is strictly prohibited and results in permanent ban.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>6. No Warranty</h3>
          <p>OutScroll is provided "as is" without warranties. We do not guarantee specific rankings, traffic, or business outcomes from using the platform.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>7. Limitation of Liability</h3>
          <p>OutScroll shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>8. Termination</h3>
          <p>We reserve the right to suspend or terminate any account at our discretion, particularly for Content Policy violations, fraud, or abuse.</p>
        </section>
      </div>
    </div>
  );
}

// ========== Legacy Disclaimer ==========
export function LegacyDisclaimerPage() {
  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Legacy Disclaimer</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.8rem' }}>
        Last updated: August 23, 2026
      </p>

      <div style={{ display: 'grid', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No Business Guarantees</h3>
          <p>OutScroll is an engagement platform, not a business growth guarantee. Your position on the leaderboard reflects community engagement metrics only. We make no representations about the impact on your business revenue, customer acquisition, or brand awareness.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Third-Party Content</h3>
          <p>Videos on OutScroll are hosted on third-party platforms (TikTok, Instagram, YouTube). We are not responsible for the availability, accuracy, or content of these external platforms. Clicking external links is at your own risk.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Points & Rankings</h3>
          <p>Points and rankings are calculated algorithmically and may be subject to adjustment for fairness. We reserve the right to correct point totals in cases of system errors, abuse, or policy violations. Rankings are not permanent and change as engagement patterns evolve.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No Financial Transactions</h3>
          <p>OutScroll is completely free. No payments are required or accepted. Any third party claiming to sell OutScroll rankings or positions is fraudulent and not affiliated with us.</p>
        </section>

        <section>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Platform Changes</h3>
          <p>We may modify, update, or discontinue features at any time. We will provide reasonable notice for significant changes. Continued use constitutes acceptance of modifications.</p>
        </section>
      </div>
    </div>
  );
}
