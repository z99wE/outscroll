import { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DriftWall from './DriftWall.jsx';

// ========== Scroll Reveal ==========
function ScrollReveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(entry.target); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(30px)',
      transition: `opacity 0.8s ease-out ${delay}s, transform 0.8s ease ${delay}s`,
    }}>{children}</div>
  );
}

// ========== Animated Counter ==========
function AnimatedCounter({ target, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function getVideoThumbnail(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let vid = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v');
      if (vid) return `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
    }
  } catch {} return null;
}

const FALLBACK_ITEMS = [
  { image: 'https://picsum.photos/id/1015/300/400', title: 'Startup Ad' },
  { image: 'https://picsum.photos/id/1025/300/400', title: 'Product Demo' },
  { image: 'https://picsum.photos/id/1039/300/400', title: 'Brand Story' },
  { image: 'https://picsum.photos/id/1042/300/400', title: 'Behind Scenes' },
  { image: 'https://picsum.photos/id/1043/300/400', title: 'Service Reel' },
  { image: 'https://picsum.photos/id/1047/300/400', title: 'Culture Vid' },
  { image: 'https://picsum.photos/id/1050/300/400', title: 'Testimonial' },
  { image: 'https://picsum.photos/id/1055/300/400', title: 'Launch Clip' },
];

// ========== Animated Demo Screens ==========
function AnimatedDemoScreens() {
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setScreen(s => (s + 1) % 3), 3500);
    return () => clearInterval(interval);
  }, []);
  const screens = [
    <div key="feed" style={{ padding: '1rem', animation: 'fadeSlideIn 0.4s ease' }}>
      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-heading)' }}>Feed</div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: 'white', border: '2px solid #1a1a1a', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: ['#005eb8', '#e94e33', '#008f4c'][i-1], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: 'white' }}>
              {['♪', '◎', '▶'][i-1]}
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1a1a1a' }}>biz_{i}</div>
              <div style={{ fontSize: '0.5rem', color: '#999' }}>{['TikTok', 'Reels', 'Shorts'][i-1]}</div>
            </div>
          </div>
          <div style={{ background: '#f5f1eb', border: '1px solid #e0dcd6', padding: '0.3rem', textAlign: 'center', fontSize: '0.6rem', fontWeight: 600, color: '#005eb8', borderRadius: '3px' }}>
            ▶ Watch
          </div>
        </div>
      ))}
    </div>,
    <div key="watch" style={{ padding: '1rem', animation: 'fadeSlideIn 0.4s ease' }}>
      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>Watching...</div>
      <div style={{ background: 'white', border: '2px solid #1a1a1a', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px' }}>
        <div style={{ background: '#f5f1eb', border: '1px solid #e0dcd6', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '3px' }}>
          <span style={{ fontSize: '1.5rem' }}>▶</span>
          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', background: '#008f4c', width: '65%', animation: 'progressBar 3s ease-in-out infinite', borderRadius: '0 0 3px 3px' }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: '0.4rem' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#1a1a1a' }}>business_1's Reel</div>
          <div style={{ fontSize: '0.5rem', color: '#999' }}>65% watched...</div>
        </div>
      </div>
      <div style={{ background: '#008f4c', border: '2px solid #1a1a1a', padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '4px' }}>
        <span style={{ fontSize: '0.65rem', color: 'white', fontWeight: 700 }}>Points earned</span>
        <span style={{ fontFamily: "'Anton', sans-serif", fontSize: '1rem', color: 'white' }}>+70</span>
      </div>
    </div>,
    <div key="ranks" style={{ padding: '1rem', animation: 'fadeSlideIn 0.4s ease' }}>
      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-heading)' }}>Leaderboard</div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
        {[
          { rank: '🥈', name: 'alice', pts: '2.3K', mt: '0.75rem', border: '#e0dcd6' },
          { rank: '🥇', name: 'you!', pts: '3.1K', mt: 0, border: '#c8960c' },
          { rank: '🥉', name: 'bob', pts: '1.8K', mt: '1rem', border: '#e0dcd6' },
        ].map((p, i) => (
          <div key={i} style={{ flex: 1, padding: '0.4rem', textAlign: 'center', marginTop: p.mt, border: `2px solid ${p.border}`, background: 'white', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.9rem' }}>{p.rank}</div>
            <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#1a1a1a' }}>{p.name}</div>
            <div style={{ fontSize: '0.5rem', fontFamily: "'Anton', sans-serif", color: i === 1 ? '#c8960c' : '#999' }}>{p.pts}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#e94e33', border: '2px solid #1a1a1a', padding: '0.5rem', color: 'white', fontSize: '0.65rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderRadius: '4px' }}>
        <span>You climbed to #1!</span><span>🎉</span>
      </div>
    </div>,
  ];
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {screens[screen]}
      <div style={{ position: 'absolute', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.4rem' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: screen === i ? '14px' : '5px', height: '5px', borderRadius: '3px', background: screen === i ? '#e94e33' : '#ccc', transition: 'all 0.3s ease' }} />
        ))}
      </div>
    </div>
  );
}

// ========== Main Landing Page ==========
export default function LandingPage({ onEnter }) {
  const [wallItems, setWallItems] = useState(FALLBACK_ITEMS);

  useEffect(() => {
    axios.get('/api/videos/feed', { params: { limit: 30, offset: 0 } })
      .then(res => {
        if (res.data.videos?.length > 0) {
          setWallItems(res.data.videos.map(v => ({
            image: getVideoThumbnail(v.url) || `https://picsum.photos/id/${1010 + (Math.abs(v.id?.charCodeAt?.(0) || 0) % 80)}/300/400`,
            title: `${v.username}'s ad`, href: v.url,
          })));
        }
      }).catch(() => {});
  }, []);

  return (
    <div style={{ background: '#f5f1eb', minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Roboto Condensed', 'Inter', sans-serif", color: '#1a1a1a' }}>

      {/* ===== TOP COLOR BAR ===== */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '4px', zIndex: 50, display: 'flex' }}>
        <div style={{ flex: 1, background: '#005eb8' }} />
        <div style={{ flex: 1, background: '#e94e33' }} />
        <div style={{ flex: 1, background: '#fdb913' }} />
        <div style={{ flex: 1, background: '#008f4c' }} />
      </div>

      {/* ===== HEADER ===== */}
      <header style={{ paddingTop: '5rem', paddingBottom: '4rem', position: 'relative', zIndex: 20, overflow: 'hidden' }}>
        {/* Nav */}
        <div style={{ position: 'relative', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 2rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', color: '#e94e33',  }}>
          <div style={{ lineHeight: 1.4, borderLeft: '2px solid #e94e33', paddingLeft: '0.5rem' }}>
            Available for<br />Businesses
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <a href="#how-it-works" style={{ color: '#e94e33', textDecoration: 'none' }}>How It Works</a>
            <a href="#features" style={{ color: '#e94e33', textDecoration: 'none' }}>Features</a>
            <a href="#pricing" style={{ color: '#e94e33', textDecoration: 'none' }}>Pricing</a>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ cursor: 'pointer' }}>EN</span> <span style={{ color: 'rgba(0,0,0,0.3)' }}>/</span> <span style={{ cursor: 'pointer' }}>HI</span>
          </div>
        </div>

        {/* Diamond Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem', marginBottom: '6rem', position: 'relative' }}>
          <div style={{
            width: '420px', height: '180px', border: '2px solid #e94e33', position: 'relative',
            background: '#f5f1eb', zIndex: 10, boxShadow: '10px 10px 0px rgba(233,78,51,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Corner dots */}
            {[['-8px', '-8px'], ['-8px', 'auto'], ['auto', '-8px'], ['auto', 'auto']].map(([t, l], i) => (
              <div key={i} style={{ position: 'absolute', top: t === 'auto' ? 'auto' : t, bottom: t === 'auto' ? '-8px' : 'auto', left: l === 'auto' ? 'auto' : l, right: l === 'auto' ? '-8px' : 'auto', width: '8px', height: '8px', background: '#e94e33' }} />
            ))}
            <div style={{ position: 'absolute', inset: '4px', border: '1px solid #e94e33', transform: 'rotate(1deg)', opacity: 0.15 }} />
            <div style={{ position: 'absolute', inset: '4px', border: '1px solid #e94e33', transform: 'rotate(-1deg)', opacity: 0.15 }} />
            <div style={{ textAlign: 'center' }}>
              <img src="/logo.svg" alt="OutScroll — Climb the Ladder" style={{ width: '320px', maxWidth: '90%', height: 'auto' }} />
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ===== SCROLLING MARQUEE ===== */}
        <div style={{ background: '#e94e33', padding: '0.75rem 0', overflow: 'hidden', borderTop: '3px solid #1a1a1a', borderBottom: '3px solid #1a1a1a' }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 20s linear infinite' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5rem', padding: '0 1.5rem', whiteSpace: 'nowrap', fontFamily: "'Anton', sans-serif", fontSize: '1.5rem', color: '#f5f1eb',  }}>
                OUTSCROLL <span style={{ color: '#fdb913' }}>●</span> YOUR COMPETITOR <span style={{ color: '#fdb913' }}>●</span> CLIMB THE LADDER <span style={{ color: '#fdb913' }}>●</span> FREE <span style={{ color: '#fdb913' }}>●</span>
              </span>
            ))}
          </div>
        </div>

        {/* ===== HOW IT WORKS — Wide Clean Layout ===== */}
        <section id="how-it-works" style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
          <ScrollReveal>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: '2.5rem', color: '#1a1a1a', marginBottom: '0.5rem' }}>How It Works</h2>
              <p style={{ color: '#666', fontSize: '1rem' }}>Four steps. Zero complexity.</p>
            </div>
          </ScrollReveal>

          {/* 4-Step Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.5rem' }}>
            {[
              { step: '01', title: 'Submit Business', desc: 'Sign up, submit your website. We verify you are a real business.', icon: '🏢', color: '#005eb8' },
              { step: '02', title: 'Get Approved', desc: 'Once reviewed, your profile goes live. You can now post video ads.', icon: '✅', color: '#008f4c' },
              { step: '03', title: 'Post & Watch', desc: 'Post one Reel/Short/TikTok per day. Watch others to earn points.', icon: '📱', color: '#e94e33' },
              { step: '04', title: 'Climb the Ladder', desc: 'Your engagement score ranks you. #1 has watched the most content.', icon: '🏆', color: '#c8960c' },
            ].map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 0.1}>
                <div style={{
                  background: 'white', border: '2px solid #e0dcd6', padding: '2rem 1.5rem',
                  position: 'relative', overflow: 'hidden', borderRadius: '4px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ position: 'absolute', top: '-0.25rem', right: '0.75rem', fontFamily: "'Anton', sans-serif", fontSize: '4rem', color: item.color, opacity: 0.08, lineHeight: 1 }}>{item.step}</div>
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{item.icon}</div>
                  <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: '1.25rem', color: '#1a1a1a', marginBottom: '0.5rem',  }}>{item.title}</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ===== ANIMATED DEMO ===== */}
        <section style={{ background: '#005eb8', padding: '5rem 2rem', overflow: 'hidden' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <ScrollReveal>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.3em', color: '#fdb913', marginBottom: '1rem', borderLeft: '2px solid #fdb913', paddingLeft: '0.75rem' }}>See It In Action</div>
                <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: '3rem', color: '#f5f1eb', lineHeight: 1.1, marginBottom: '1rem' }}>POST.<br />WATCH.<br />CLIMB.</h2>
                <p style={{ color: 'rgba(245,241,235,0.7)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                  Post your business video ad. Watch other entrepreneurs' content. Earn points. Climb the leaderboard.
                </p>
                <button onClick={onEnter} style={{
                  background: '#fdb913', color: '#1a1a1a', border: '2px solid #1a1a1a',
                  fontFamily: "'Anton', sans-serif", fontSize: '1rem', padding: '0.75rem 2rem',
                  cursor: 'pointer', letterSpacing: '0.08em',
                  boxShadow: '4px 4px 0px rgba(0,0,0,1)',
                  transition: 'all 0.15s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '2px 2px 0px rgba(0,0,0,1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0,0,0,1)'; }}
                >Get Started Free</button>
              </ScrollReveal>
            </div>
            <div style={{ flex: '0 0 300px' }}>
              <ScrollReveal delay={0.2}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '280px', height: '540px', borderRadius: '28px', border: '3px solid #1a1a1a',
                    background: '#f5f1eb', overflow: 'hidden', position: 'relative',
                    boxShadow: '12px 12px 0px rgba(0,0,0,0.3)',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '80px', height: '18px', background: '#1a1a1a', borderRadius: '0 0 10px 10px', zIndex: 10 }} />
                    <div style={{ padding: '2rem 0.75rem 0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#999', fontWeight: 600 }}>
                      <span>9:41</span><span>●●●</span>
                    </div>
                    <AnimatedDemoScreens />
                  </div>
                  <div style={{ position: 'absolute', top: '-12px', right: '-12px', width: '36px', height: '36px', background: '#e94e33', borderRadius: '50%', border: '2px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontSize: '0.7rem' }}>★</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ===== DOOMSCROLL WALL ===== */}
        <section style={{ padding: '3rem 0', background: '#f5f1eb' }}>
          <ScrollReveal>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: '2rem', color: '#e94e33',  }}>Always Watching</h2>
              <p style={{ color: '#999', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', marginTop: '0.5rem' }}>Businesses posting. Entrepreneurs engaging.</p>
            </div>
          </ScrollReveal>
          <div style={{ height: '350px', position: 'relative', zIndex: 2 }}>
            <DriftWall items={wallItems} columns={8} tileWidth={100} tileHeight={140} gap={4} speed={25} direction="up" tilt={12} parallax={0.7} depth={80} fade={0.5} overlayColor="#f5f1eb" pauseOnHover />
          </div>
        </section>

        {/* ===== WHAT YOU GET — Menu Style ===== */}
        <section id="features" style={{ padding: '4rem 2rem', background: '#f5f1eb' }}>
          <ScrollReveal>
            <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: '2.5rem', color: '#e94e33', textAlign: 'center', marginBottom: '0.5rem' }}>What you get</h2>
            <p style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', marginBottom: '2.5rem' }}>Free engagement leaderboard for entrepreneurs</p>
          </ScrollReveal>

          <div style={{ maxWidth: '700px', margin: '0 auto', display: 'grid', gap: '0' }}>
            {/* Green sidebar on desktop */}
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <div style={{
                width: '80px', background: '#008f4c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, borderRight: '2px solid #1a1a1a',
              }}>
                <span style={{ fontFamily: "'Anton', sans-serif", fontSize: '1.5rem', color: '#f5f1eb', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.15em' }}>FEATURES</span>
              </div>

              <div style={{ flex: 1, padding: '1.5rem 2rem' }}>
                {[
                  { icon: '🏢', title: 'Verified businesses only', note: 'Every account is approved by our team. No spam, no bots, no fakes.' },
                  { icon: '📱', title: 'Vertical video only', note: 'TikTok, Instagram Reels, YouTube Shorts. No landscape. No podcasts.' },
                  { icon: '🏆', title: 'Engagement-based ranking', note: 'Your rank is determined by how much you watch others. Not followers. Not money.' },
                  { icon: '⚡', title: '+100 points per full watch', note: '+5 play, +70 halfway, +100 full, -5 skip. Fair points. No gaming.' },
                  { icon: '💰', title: '$0 forever', note: 'No premium tier. No pay-to-rank. No hidden fees. Ever.' },
                  { icon: '📅', title: '1 video per day', note: 'Keeps the feed fresh. Prevents spam. Equal opportunity for all.' },
                ].map((item, i) => (
                  <ScrollReveal key={item.title} delay={i * 0.08}>
                    <div style={{
                      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                      padding: '1rem 0',
                      borderBottom: i < 5 ? '2px dotted rgba(26,26,26,0.15)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a' }}>{item.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.15rem' }}>{item.note}</div>
                        </div>
                      </div>
                      <div style={{
                        fontFamily: "'Anton', sans-serif", fontSize: '1.5rem', color: '#008f4c',
                        flexShrink: 0, marginLeft: '1rem',
                      }}>
                        {['✓', '✓', '✓', '+100', '$0', '1'][i]}
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>

          {/* CTA box */}
          <ScrollReveal delay={0.5}>
            <div style={{
              maxWidth: '700px', margin: '2rem auto 0',
              background: '#e94e33', padding: '1.25rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: '2px solid #1a1a1a', borderRadius: '4px',
              transform: 'rotate(-0.5deg)',
              transition: 'transform 0.3s',
              cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'rotate(0deg) scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'rotate(-0.5deg)'}
              onClick={() => window.dispatchEvent(new CustomEvent('outscroll-navigate', { detail: 'feed' }))}
            >
              <div>
                <div style={{ fontFamily: "'Anton', sans-serif", fontSize: '1.5rem', color: '#f5f1eb' }}>Ready to start?</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(245,241,235,0.8)', marginTop: '0.25rem' }}>Sign up and submit your business in 2 minutes</div>
              </div>
              <span style={{ fontFamily: "'Anton', sans-serif", fontSize: '2rem', color: '#fdb913' }}>→</span>
            </div>
          </ScrollReveal>
        </section>

        {/* ===== POINTS TABLE ===== */}
        <section id="pricing" style={{ padding: '4rem 2rem', maxWidth: '700px', margin: '0 auto' }}>
          <ScrollReveal>
            <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: '2.5rem', color: '#1a1a1a', textAlign: 'center', marginBottom: '0.5rem' }}>The points</h2>
            <p style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', marginBottom: '2rem' }}>Free for all · No hidden fees</p>
          </ScrollReveal>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { action: 'Click play', points: '+5', note: 'Start watching', color: '#005eb8', bg: '#e8f0fe' },
              { action: 'Watch 50%', points: '+70', note: 'Halfway through', color: '#008f4c', bg: '#e6f7ee' },
              { action: 'Full watch', points: '+100', note: 'Entire video', color: '#008f4c', bg: '#e6f7ee' },
              { action: 'Skip before 50%', points: '-5', note: 'Penalty', color: '#e94e33', bg: '#fef0ee' },
            ].map((row, i) => (
              <ScrollReveal key={row.action} delay={i * 0.08}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem', background: row.bg,
                  borderRadius: '8px', border: `2px solid ${row.color}20`,
                  transition: 'transform 0.2s', cursor: 'default',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>{row.action}</div>
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.15rem' }}>{row.note}</div>
                  </div>
                  <div style={{
                    fontFamily: "'Anton', sans-serif", fontSize: '2rem', color: row.color,
                    lineHeight: 1,
                  }}>{row.points}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal delay={0.4}>
            <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#999' }}>
              Creator posting bonus: None · Prevents gaming
            </div>
          </ScrollReveal>
        </section>

        {/* ===== STATS ===== */}
        <section style={{ background: '#fdb913', padding: '4rem 2rem' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            {[
              { value: 0, suffix: '', label: 'Cost to Users', sub: 'Free forever' },
              { value: 1, suffix: '/day', label: 'Post Limit', sub: '1 video ad daily' },
              { value: 100, suffix: '+', label: 'Max Leaderboard', sub: 'Top performers' },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.1}>
                <div style={{ background: '#f5f1eb', border: '2px solid #1a1a1a', padding: '2rem', boxShadow: '4px 4px 0px rgba(0,0,0,0.15)' }}>
                  <div style={{ fontFamily: "'Anton', sans-serif", fontSize: '3rem', color: '#e94e33' }}>
                    <AnimatedCounter target={stat.value} />{stat.suffix}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em', color: '#1a1a1a', marginTop: '0.5rem' }}>{stat.label}</div>
                  <div style={{ fontSize: '0.65rem', color: '#999', letterSpacing: '0.05em' }}>{stat.sub}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ===== VS COMPARISON ===== */}
        <section style={{ padding: '4rem 2rem', maxWidth: '700px', margin: '0 auto' }}>
          <ScrollReveal>
            <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: '2rem', color: '#1a1a1a', textAlign: 'center', marginBottom: '2rem' }}>OutScroll vs The Rest</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div style={{ background: '#fdb913', overflow: 'hidden', border: '2px solid #1a1a1a', boxShadow: '6px 6px 0px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.75rem 1rem', background: '#1a1a1a', color: '#fdb913', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                <span>Feature</span><span style={{ textAlign: 'center', color: '#008f4c' }}>OutScroll</span><span style={{ textAlign: 'center' }}>Others</span>
              </div>
              {[
                { feature: 'Cost', outscroll: 'Free forever', other: 'Pay to rank' },
                { feature: 'Leaderboard', outscroll: 'Engagement-based', other: 'Follower count' },
                { feature: 'Content', outscroll: 'Reels, Shorts, TikTok', other: 'Limited formats' },
                { feature: 'Approval', outscroll: 'Verified businesses', other: 'Anyone' },
                { feature: 'Creator Bonus', outscroll: 'None (fair play)', other: 'Pay-to-rank' },
              ].map((row, i) => (
                <div key={row.feature} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.65rem 1rem', borderBottom: i < 4 ? '1px solid rgba(26,26,26,0.12)' : 'none' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1a1a1a' }}>{row.feature}</span>
                  <span style={{ textAlign: 'center', color: '#008f4c', fontWeight: 700, fontSize: '0.8rem' }}>{row.outscroll}</span>
                  <span style={{ textAlign: 'center', color: 'rgba(26,26,26,0.45)', fontSize: '0.8rem' }}>{row.other}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section style={{ background: '#e94e33', padding: '6rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '2rem', left: '2rem', width: '50px', height: '50px', border: '2px solid rgba(245,241,235,0.15)', transform: 'rotate(45deg)' }} />
          <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', width: '36px', height: '36px', background: '#fdb913', borderRadius: '50%', border: '2px solid #1a1a1a' }} />
          <ScrollReveal>
            <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: '4rem', color: '#f5f1eb', lineHeight: 1, marginBottom: '1rem' }}>READY TO<br />CLIMB?</h2>
            <p style={{ color: 'rgba(245,241,235,0.7)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>Join free. Watch content. Rise to #1. Your competitors are already here.</p>
            <button onClick={onEnter} style={{
              background: '#fdb913', color: '#1a1a1a', border: '3px solid #1a1a1a',
              fontFamily: "'Anton', sans-serif", fontSize: '1.25rem', padding: '1rem 3rem',
              cursor: 'pointer', letterSpacing: '0.08em',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
              transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translate(3px, 3px)'; e.currentTarget.style.boxShadow = '3px 3px 0px rgba(0,0,0,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0,0,0,0.5)'; }}
            >Start Now</button>
          </ScrollReveal>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: '#1a1a1a', padding: '3rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ fontSize: '0.65rem', color: 'rgba(245,241,235,0.6)', fontWeight: 700, letterSpacing: '0.1em', lineHeight: 2 }}>
          <div>Open for Businesses</div>
          <div>Free Tier Available</div>
          <div style={{ marginTop: '0.5rem' }}>India · Worldwide</div>
        </div>
        <div style={{ textAlign: 'center' }}>                <img src="/logo.svg" alt="OutScroll" style={{ width: '120px', height: 'auto', filter: 'invert(1) brightness(2)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em' }}>
            <button onClick={onEnter} style={{ background: 'none', border: 'none', color: '#f5f1eb', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.1em', fontWeight: 700 }}>Get Started</button>
            <a href="#how-it-works" style={{ color: '#f5f1eb', textDecoration: 'none' }}>How It Works</a>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em' }}>
            <a href="#features" style={{ color: '#f5f1eb', textDecoration: 'none' }}>Features</a>
            <a href="#pricing" style={{ color: '#f5f1eb', textDecoration: 'none' }}>Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
