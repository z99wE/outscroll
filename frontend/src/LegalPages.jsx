import { useState } from 'react';

const sectionStyle = { color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 };
const h3Style = { fontSize: '1rem', marginBottom: '0.5rem', fontWeight: 700 };
const ulStyle = { paddingLeft: '1.5rem', marginTop: '0.5rem' };

// ========== FAQ Page ==========
export function FAQPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      q: 'What is OutScroll?',
      a: 'OutScroll is a free engagement leaderboard for entrepreneurs and businesses. Post your business video ads as vertical short-form content (Reels, Shorts, TikTok). Watch other businesses\' content to earn points and climb the ranks — no payment required, ever.',
    },
    {
      q: 'How do I get on the leaderboard?',
      a: 'Sign up with your email and create a password. Submit your business website and description for review. Our admin reviews submissions — you\'ll receive a notification once approved or rejected. You can only post videos after approval.',
    },
    {
      q: 'What kind of videos can I post?',
      a: 'Only vertical short-form video content: TikTok links, Instagram Reels, and YouTube Shorts. The system rejects any URL that doesn\'t match these platforms. No landscape videos, no podcasts, no regular YouTube links. Content must promote a legitimate business.',
    },
    {
      q: 'How does the points system work?',
      a: '+5 points for clicking play, +70 for watching 50% of a video, +100 for a full watch, and -5 for skipping before 50%. Your rank is determined purely by how much you watch others — not by followers, not by money.',
    },
    {
      q: 'Is it really free?',
      a: 'Yes. $0. No hidden fees, no premium tier, no pay-to-rank. The leaderboard is purely engagement-based. There is no way to buy a higher rank.',
    },
    {
      q: 'How does business approval work?',
      a: 'After signing up, go to your Business Profile and submit your business website URL and description. An admin reviews submissions. You\'ll receive a notification once approved or rejected with a reason. You can only post videos after approval.',
    },
    {
      q: 'How many videos can I post per day?',
      a: 'Up to 10 videos per day. The system tracks your daily count — once you hit 10, you\'ll need to wait until tomorrow.',
    },
    {
      q: 'What content is NOT allowed?',
      a: 'No pornography, gambling, weapons, drugs, hate speech, scams, violence, spam, non-vertical videos, or content infringing intellectual property. See our Content Policy for the complete list.',
    },
    {
      q: 'Can I delete my account and data?',
      a: 'Yes. Under DPDP (India) and GDPR (EU) you have the right to erasure. Go to My Data in the footer to request account deletion. All personal data is removed within 30 days.',
    },
    {
      q: 'How is OutScroll different from buying followers?',
      a: 'OutScroll ranks by engagement, not followers. The #1 person is whoever watches the most other businesses\' content. You can\'t buy your way up. You earn it by genuinely engaging with the community.',
    },
    {
      q: 'Is my data safe?',
      a: 'We comply with DPDP Act 2023 (India) and GDPR (EU). We don\'t sell your data. We never display your email or contact info publicly. Passwords are hashed with bcrypt. Data is encrypted in transit. See our Privacy Policy for full details.',
    },
    {
      q: 'What happens if someone posts bad content?',
      a: 'Every video has a Report button. Reports are reviewed by our admin. If content violates our Content Policy, the video is removed and the poster is notified. Repeated violations result in account suspension.',
    },
    {
      q: 'How do I contact support?',
      a: 'Use the Contact page to reach us. For DPDP/GDPR data requests, select the appropriate subject.',
    },
    {
      q: 'How long is my data kept?',
      a: 'Your account data is kept while your account is active. Posted video links and engagement data are automatically purged after 90 days. Notifications are purged after 30 days. Your business URL is auto-deleted every 7 days for privacy — you\'ll need to re-submit it to keep posting. If you delete your account, all personal data is removed within 30 days.',
    },
    {
      q: 'How does the leaderboard work?',
      a: 'Points decay by 50% every week. This keeps the leaderboard fresh — recent engagement matters more than old activity. Your rank reflects your current engagement, not historical totals.',
    },
    {
      q: 'Do I need to re-verify my business?',
      a: 'Yes. Your business URL is automatically deleted every 7 days for privacy. You\'ll need to re-submit your business profile to continue posting videos. This keeps the platform clean and ensures all listed businesses are still active.',
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
          <div key={i} className="card" style={{ overflow: 'hidden' }}>
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
        Last updated: August 23, 2026 · Applies to all content posted on OutScroll
      </p>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--success)' }}>✓ Allowed Content</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
          {[
            'Business promotion videos (vertical format: Reels, Shorts, TikTok)',
            'Product demos, showcases, and explainer videos',
            'Company culture, behind-the-scenes, and team content',
            'Service explanations, tutorials, and how-to content',
            'Customer testimonials and case studies (with consent)',
            'Industry thought leadership and educational content',
            'Event highlights and launch announcements',
          ].map(item => (
            <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--success)', flexShrink: 0 }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--danger)' }}>✗ Prohibited Content</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          The following content is strictly prohibited and will result in immediate suspension:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
          {[
            'Pornography, sexually explicit content, or adult material of any kind',
            'Gambling, betting, lottery, or casino-related content',
            'Weapons, firearms, ammunition, explosives, or military equipment',
            'Drugs, controlled substances, narcotics, or drug paraphernalia',
            'Hate speech, discrimination, or harassment of any group or individual',
            'Misinformation, fake news, or deliberately misleading content',
            'Scams, pyramid schemes, Ponzi schemes, or fraudulent business opportunities',
            'Content violating any applicable local, state, national, or international law',
            'Violence, graphic content, gore, or content promoting harm to self or others',
            'Spam, repeated identical submissions, bot activity, or engagement farming',
            'Non-vertical video content (landscape videos, audio-only, podcasts)',
            'Content infringing on third-party intellectual property or trademark rights',
            'Personal data of third parties without their explicit consent',
            'Content promoting discrimination based on race, religion, gender, disability, or age',
            'Political campaigning, lobbying, or election-related content',
          ].map(item => (
            <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--danger)', flexShrink: 0 }}>✗</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Reporting & Enforcement</h3>
        <div style={sectionStyle}>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>How to report:</strong> If you encounter content that violates this policy, use the Report button on the video or contact us through the Contact page.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Response time:</strong> All reports are reviewed within 24 hours.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>First violation:</strong> Content removal + written warning.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Second violation:</strong> 7-day account suspension.
          </p>
          <p>
            <strong>Repeated violations:</strong> Permanent account ban and removal from the leaderboard.
          </p>
        </div>
      </div>

      <div className="card-inset" style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> OutScroll reserves the right to remove any content at its sole discretion if it determines the content violates the spirit of this policy, even if not explicitly listed above.
      </div>
    </div>
  );
}

// ========== Privacy Policy (DPDP + GDPR Compliant) ==========
export function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Privacy Policy</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.8rem' }}>
        Last updated: August 23, 2026 · Effective: August 23, 2026
      </p>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Data Fiduciary:</strong> OutScroll ("we", "us", "our") is the Data Fiduciary as defined under the Digital Personal Data Protection Act, 2023 (India).
        </p>
        <p>
          <strong style={{ color: 'var(--text-secondary)' }}>Data Protection:</strong> For any queries regarding this Privacy Policy or your personal data, use the Contact page.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>

        <section>
          <h3 style={h3Style}>1. Purpose of This Policy</h3>
          <p>This Privacy Policy describes how OutScroll collects, uses, stores, and protects your personal data when you use our platform. We comply with:</p>
          <ul style={ulStyle}>
            <li><strong>India:</strong> Digital Personal Data Protection Act, 2023 (DPDP Act) and DPDP Rules, 2025</li>
            <li><strong>European Union:</strong> General Data Protection Regulation (GDPR) — Regulation (EU) 2016/679</li>
            <li><strong>Other jurisdictions:</strong> We apply GDPR-level protections globally as our baseline standard</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>2. Legal Basis for Processing (GDPR Article 6)</h3>
          <p>We process your personal data based on the following legal bases:</p>
          <ul style={ulStyle}>
            <li><strong>Consent:</strong> When you create an account and submit your business profile, you provide explicit consent for us to process your data for the purposes described in this policy.</li>
            <li><strong>Contractual necessity:</strong> Processing is necessary to perform our contract with you (providing the OutScroll platform and leaderboard services).</li>
            <li><strong>Legitimate interest:</strong> Processing to prevent fraud, abuse, and ensure platform integrity.</li>
            <li><strong>Legal obligation:</strong> Retaining data as required by applicable law.</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>3. Categories of Personal Data We Collect</h3>
          <p>We collect only what is necessary to operate the platform (data minimization principle):</p>
          <ul style={ulStyle}>
            <li><strong>Account Data:</strong> Username, email address (internal only — never displayed publicly), hashed password</li>
            <li><strong>Business Data:</strong> Business name, website URL, business description (submitted for approval)</li>
            <li><strong>Platform Activity:</strong> Videos posted, engagement actions (play, watch, skip), points earned, leaderboard rank</li>
            <li><strong>Technical Data:</strong> IP address (for rate limiting and fraud prevention), browser user-agent, device type</li>
            <li><strong>Notification Data:</strong> Engagement notifications sent to you about your posted content</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>4. How We Use Your Data (DPDP Purpose Limitation)</h3>
          <p>We use your personal data solely for the following purposes:</p>
          <ul style={ulStyle}>
            <li>Operating the leaderboard and engagement tracking system</li>
            <li>Verifying your business identity during the approval process</li>
            <li>Preventing fraud, spam, bot activity, and gaming of the points system</li>
            <li>Sending you notifications about engagement on your content</li>
            <li>Complying with legal obligations and responding to lawful requests</li>
            <li>Communicating important platform updates and policy changes</li>
          </ul>
          <p style={{ marginTop: '0.75rem', fontStyle: 'italic', fontSize: '0.85rem' }}>
            We do not use your data for targeted advertising, profiling, or automated decision-making that produces legal effects.
          </p>
        </section>

        <section>
          <h3 style={h3Style}>5. What We Never Do</h3>
          <ul style={ulStyle}>
            <li>We <strong>never sell</strong> your personal data to third parties</li>
            <li>We <strong>never display</strong> your email address or contact information publicly</li>
            <li>We <strong>never run</strong> targeted advertisements based on your data</li>
            <li>We <strong>never share</strong> your personal data with other users beyond your username</li>
            <li>We <strong>never knowingly collect</strong> data from children under 18</li>
            <li>We <strong>never use</strong> your data for purposes incompatible with the original collection purpose</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>6. Data Sharing and Third Parties</h3>
          <p>We may share limited data with the following categories of recipients:</p>
          <ul style={ulStyle}>
            <li><strong>Infrastructure providers:</strong> Database hosting (Supabase/PostgreSQL) — data encrypted at rest and in transit</li>
            <li><strong>Legal authorities:</strong> Only when required by valid legal process or to protect our rights</li>
            <li><strong>Service providers:</strong> Hosting providers who process data on our behalf under strict data processing agreements</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            We use infrastructure providers that maintain compliance with applicable data protection standards.
          </p>
        </section>

        <section>
          <h3 style={h3Style}>7. Your Rights</h3>
          <p>Under DPDP (India) and GDPR (EU), you have the following rights:</p>
          <ul style={ulStyle}>
            <li><strong>Right to Access (DPDP §5, GDPR Art.15):</strong> Request a copy of all personal data we hold about you</li>
            <li><strong>Right to Correction (DPDP §6, GDPR Art.16):</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Right to Erasure (DPDP §6, GDPR Art.17):</strong> Request deletion of your account and all associated personal data</li>
            <li><strong>Right to Data Portability (GDPR Art.20):</strong> Request your data in a structured, machine-readable format</li>
            <li><strong>Right to Withdraw Consent (DPDP §6, GDPR Art.7):</strong> Withdraw consent at any time (account deletion)</li>
            <li><strong>Right to Grievance Redressal (DPDP §8):</strong> File a complaint through the Contact page if your rights are violated</li>
            <li><strong>Right to Nominate (DPDP §6(1)):</strong> Nominate a person to exercise your rights in case of death or incapacity</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            <strong>To exercise your rights:</strong> Use the Contact page. All requests are processed within <strong>30 days</strong> as required by law.
          </p>
        </section>

        <section>
          <h3 style={h3Style}>8. Data Retention</h3>
          <ul style={ulStyle}>
            <li><strong>Active accounts:</strong> Data retained while your account is active</li>
            <li><strong>Account deletion:</strong> All personal data permanently removed within <strong>30 days</strong> of deletion request</li>
            <li><strong>Video data:</strong> Posted video links and associated engagement data are automatically purged after <strong>90 days</strong> to maintain platform efficiency</li>
            <li><strong>Notifications:</strong> Older than <strong>30 days</strong> are automatically purged</li>
            <li><strong>Aggregated data:</strong> Anonymized, non-identifiable usage statistics may be retained for platform improvement</li>
            <li><strong>Legal hold:</strong> Data may be retained longer if required by applicable law or ongoing legal proceedings</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>9. Security Measures</h3>
          <ul style={ulStyle}>
            <li>Passwords hashed with bcrypt (12 salt rounds) — we cannot read your password</li>
            <li>All data transmitted over encrypted HTTPS connections (TLS 1.3)</li>
            <li>JWT authentication with short-lived access tokens (15 minutes)</li>
            <li>Rate limiting on all API endpoints to prevent abuse</li>
            <li>Input validation and parameterized queries to prevent injection attacks</li>
            <li>Security headers via Helmet (CSP, X-Frame-Options, HSTS, etc.)</li>
            <li>Periodic security reviews of code and infrastructure</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>10. Cookies and Tracking</h3>
          <p>We use only essential cookies:</p>
          <ul style={ulStyle}>
            <li><strong>Authentication token:</strong> Stored in httpOnly cookie for session management</li>
            <li><strong>No analytics cookies:</strong> We do not use Google Analytics, Facebook Pixel, or any third-party tracking</li>
            <li><strong>No advertising cookies:</strong> We do not serve or track advertisements</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>11. Children's Privacy</h3>
          <p>
            OutScroll is not intended for users under 18 years of age. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us through the Contact page and we will delete it within 48 hours.
          </p>
        </section>

        <section>
          <h3 style={h3Style}>12. Changes to This Policy</h3>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be communicated via platform notification and/or email (if provided). Continued use after notification constitutes acceptance.
          </p>
        </section>

        <section>
          <h3 style={h3Style}>13. Data Protection Contact (DPDP §8(9))</h3>
          <p>For any privacy-related queries, data requests, or complaints:</p>
          <ul style={ulStyle}>
            <li><strong>Contact:</strong> Use the Contact page on the platform</li>
            <li><strong>Response time:</strong> Within 72 hours for acknowledgment, 30 days for resolution</li>
            <li><strong>Escalation:</strong> If unresolved, you may file a complaint with the Data Protection Board of India (DPB) or the relevant EU supervisory authority</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>14. Governing Law</h3>
          <p>
            This Privacy Policy is governed by the laws of India for Indian users and the GDPR for users in the European Economic Area. Disputes shall be subject to the exclusive jurisdiction of courts in New Delhi, India.
          </p>
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
        Last updated: August 23, 2026 · Effective: August 23, 2026
      </p>

      <div style={{ display: 'grid', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>

        <section>
          <h3 style={h3Style}>1. Acceptance of Terms</h3>
          <p>By accessing or using OutScroll ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Platform. These Terms constitute a legally binding agreement between you and OutScroll.</p>
        </section>

        <section>
          <h3 style={h3Style}>2. Eligibility</h3>
          <ul style={ulStyle}>
            <li>You must be at least <strong>18 years of age</strong> to use OutScroll</li>
            <li>You must have a <strong>legitimate business</strong> to register an account</li>
            <li>One account per business. Multiple accounts for the same business are prohibited</li>
            <li>You must provide accurate, current, and complete information during registration</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>3. Business Approval Process</h3>
          <ul style={ulStyle}>
            <li>All businesses must submit their website and business details for review before posting content</li>
            <li>Approval is at OutScroll's sole discretion based on our Content Policy</li>
            <li>Approval typically occurs within 24-48 hours but is not guaranteed</li>
            <li>We may reject or revoke approval for any business that violates our Content Policy or Terms</li>
            <li>You will be notified of approval/rejection decisions via the Platform</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>4. Content Rules</h3>
          <ul style={ulStyle}>
            <li>You may only post <strong>vertical short-form video content</strong> (TikTok, Instagram Reels, YouTube Shorts)</li>
            <li>Content must promote a legitimate business — product demos, service explainers, company culture, etc.</li>
            <li>One video per day per account</li>
            <li>You must own or have rights to all content you post</li>
            <li>See our <strong>Content Policy</strong> for the complete list of allowed and prohibited content</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>5. Fair Play & Anti-Gaming</h3>
          <p>The following activities are strictly prohibited and result in <strong>immediate permanent ban</strong>:</p>
          <ul style={ulStyle}>
            <li>Bot watches, automated engagement, or any non-human interaction</li>
            <li>Engagement farming (coordinated groups watching each other)</li>
            <li>Account farming (multiple accounts for artificial engagement)</li>
            <li>Using VPNs or proxies to manipulate engagement metrics</li>
            <li>Selling, buying, or trading ranks or positions</li>
            <li>Any attempt to manipulate the points system</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>6. Intellectual Property</h3>
          <ul style={ulStyle}>
            <li>You retain ownership of all content you post</li>
            <li>By posting, you grant OutScroll a non-exclusive, worldwide license to display, distribute, and promote your content on the Platform</li>
            <li>You represent that you have all necessary rights and permissions for content you post</li>
            <li>OutScroll's name, logo, and design are our intellectual property and may not be used without written permission</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>7. No Warranty & Limitation of Liability</h3>
          <ul style={ulStyle}>
            <li>OutScroll is provided "as is" and "as available" without warranties of any kind</li>
            <li>We do not guarantee specific rankings, traffic, business outcomes, or revenue</li>
            <li>We do not guarantee uninterrupted or error-free operation</li>
            <li>In no event shall OutScroll be liable for indirect, incidental, special, or consequential damages</li>
            <li>Our total liability shall not exceed the amount you paid us (which is $0)</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>8. Indemnification</h3>
          <p>You agree to indemnify and hold OutScroll harmless from any claims, losses, or damages arising from your use of the Platform, your violation of these Terms, or your violation of any rights of a third party.</p>
        </section>

        <section>
          <h3 style={h3Style}>9. Termination</h3>
          <ul style={ulStyle}>
            <li>You may delete your account at any time from your Profile page</li>
            <li>We may suspend or terminate your account at our discretion for Terms violations, fraud, or abuse</li>
            <li>Upon termination, your right to use the Platform ceases immediately</li>
            <li>We may retain data as required by law after termination</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>10. Dispute Resolution</h3>
          <p>Any disputes arising from these Terms shall be resolved through:</p>
          <ul style={ulStyle}>
            <li><strong>Informal resolution:</strong> Contact us through the Contact page first</li>
            <li><strong>Mediation:</strong> If informal resolution fails, we agree to mediate before any legal proceedings</li>
            <li><strong>Governing law:</strong> These Terms are governed by the laws of India</li>
            <li><strong>Jurisdiction:</strong> Exclusive jurisdiction of courts in New Delhi, India</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>11. Changes to Terms</h3>
          <p>We reserve the right to modify these Terms at any time. Material changes will be communicated via the Platform with at least 30 days' notice. Continued use after the effective date constitutes acceptance of the modified Terms.</p>
        </section>

        <section>
          <h3 style={h3Style}>12. Severability</h3>
          <p>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>
        </section>
      </div>
    </div>
  );
}

// ========== Legacy Disclaimer ==========
export function LegacyDisclaimerPage() {
  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Disclaimer</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.8rem' }}>
        Last updated: August 23, 2026
      </p>

      <div style={{ display: 'grid', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>

        <section>
          <h3 style={h3Style}>No Business Guarantees</h3>
          <p>OutScroll is an engagement platform, not a business growth guarantee. Your position on the leaderboard reflects community engagement metrics only. We make no representations or warranties about the impact on your business revenue, customer acquisition, brand awareness, or any other business outcome.</p>
        </section>

        <section>
          <h3 style={h3Style}>Third-Party Content & Links</h3>
          <p>Videos posted on OutScroll are hosted on third-party platforms (TikTok, Instagram, YouTube). We are not responsible for:</p>
          <ul style={ulStyle}>
            <li>The availability, accuracy, or content of external platforms</li>
            <li>Any data collected by these third-party platforms when you view their embedded content</li>
            <li>The security or privacy practices of third-party platforms</li>
            <li>Clicking external links is at your own risk</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>Points & Rankings</h3>
          <ul style={ulStyle}>
            <li>Points and rankings are calculated algorithmically</li>
            <li>We reserve the right to correct point totals in cases of system errors, abuse, or policy violations</li>
            <li>Rankings are not permanent and change as engagement patterns evolve</li>
            <li>We do not guarantee the accuracy of real-time rankings</li>
            <li>Points have no monetary value and cannot be redeemed, transferred, or exchanged</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>No Financial Transactions</h3>
          <p>OutScroll is completely free. No payments are required, accepted, or processed through the Platform. Any third party claiming to sell OutScroll rankings, positions, or access is fraudulent and not affiliated with us. Report such attempts through the Contact page.</p>
        </section>

        <section>
          <h3 style={h3Style}>User-Generated Content</h3>
          <p>All videos and business descriptions are posted by users and do not reflect the views or opinions of OutScroll. We do not endorse any user-generated content. Users are solely responsible for the content they post.</p>
        </section>

        <section>
          <h3 style={h3Style}>Platform Availability</h3>
          <ul style={ulStyle}>
            <li>We may modify, update, or discontinue features at any time with reasonable notice</li>
            <li>We do not guarantee 100% uptime or uninterrupted service</li>
            <li>Scheduled maintenance will be communicated in advance when possible</li>
            <li>We are not liable for any downtime or service interruptions</li>
          </ul>
        </section>

        <section>
          <h3 style={h3Style}>Limitation of Liability</h3>
          <p>To the fullest extent permitted by applicable law, OutScroll, its directors, employees, and partners shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, arising from your use of the Platform.</p>
        </section>

        <section>
          <h3 style={h3Style}>Contact</h3>
          <p>For any questions about this Disclaimer, use the Contact page.</p>
        </section>
      </div>
    </div>
  );
}
