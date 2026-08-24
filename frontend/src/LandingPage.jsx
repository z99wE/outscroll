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
    <div
      ref={ref}
      className="reveal-on-scroll"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.8s ease-out ${delay}s, transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${delay}s`,
        ...(visible ? { transitionDelay: `${delay}s` } : {}),
      }}
    >
      {children}
    </div>
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ========== Thumbnail Helper ==========
function getVideoThumbnail(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId;
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get('v');
      }
      if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
  } catch {}
  return null;
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
  { image: 'https://picsum.photos/id/1060/300/400', title: 'Ad Campaign' },
  { image: 'https://picsum.photos/id/1067/300/400', title: 'Growth Story' },
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
      <div className="font-display text-xl mb-3 tracking-tight">Feed</div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-brand-cream border-2 border-brand-black p-2 mb-2" style={{ animation: `fadeSlideIn 0.3s ease ${i * 0.1}s both` }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center text-[8px] text-white font-bold">
              {['♪', '◎', '▶'][i - 1]}
            </div>
            <div>
              <div className="text-[10px] font-bold">{`biz_${i}`}</div>
              <div className="text-[8px] text-brand-black/50">{['TikTok', 'Reels', 'Shorts'][i - 1]}</div>
            </div>
          </div>
          <div className="bg-brand-yellow/20 border border-brand-yellow/30 py-1 text-center text-[8px] font-bold">
            ▶ Watch
          </div>
          <div className="grid grid-cols-4 gap-1 mt-1">
            {['▶+5', '50%+70', 'Full+100', 'Skip-5'].map((b, j) => (
              <div key={j} className="bg-brand-black/5 text-center py-0.5 text-[6px] font-bold">{b}</div>
            ))}
          </div>
        </div>
      ))}
    </div>,
    <div key="watch" style={{ padding: '1rem', animation: 'fadeSlideIn 0.4s ease' }}>
      <div className="font-display text-xl mb-2 tracking-tight">Watching...</div>
      <div className="bg-brand-cream border-2 border-brand-black p-2 mb-2">
        <div className="bg-brand-blue/10 border border-brand-blue/20 h-24 flex items-center justify-center relative overflow-hidden">
          <span className="text-2xl">▶</span>
          <div className="absolute bottom-0 left-0 h-1 bg-brand-green" style={{ width: '65%', animation: 'progressBar 3s ease-in-out infinite' }} />
        </div>
        <div className="text-center mt-1">
          <div className="text-[10px] font-bold">business_1&apos;s Reel</div>
          <div className="text-[8px] text-brand-black/50">65% watched...</div>
        </div>
      </div>
      <div className="bg-brand-green border-2 border-brand-black p-2 flex justify-between items-center" style={{ animation: 'fadeSlideIn 0.3s ease 0.2s both' }}>
        <span className="text-[10px] font-bold text-white">Points earned</span>
        <span className="font-display text-lg text-white font-bold">+70</span>
      </div>
    </div>,
    <div key="ranks" style={{ padding: '1rem', animation: 'fadeSlideIn 0.4s ease' }}>
      <div className="font-display text-xl mb-2 tracking-tight">Leaderboard</div>
      <div className="flex gap-1 mb-2">
        {[
          { rank: '🥈', name: 'alice', pts: '2.3K', mt: '0.5rem' },
          { rank: '🥇', name: 'you!', pts: '3.1K', mt: 0, glow: true },
          { rank: '🥉', name: 'bob', pts: '1.8K', mt: '0.75rem' },
        ].map((p, i) => (
          <div key={i} className={`flex-1 p-1 text-center border-2 ${p.glow ? 'border-brand-yellow bg-brand-yellow/10' : 'border-brand-black bg-brand-cream'}`} style={{ marginTop: p.mt }}>
            <div className="text-sm">{p.rank}</div>
            <div className="text-[9px] font-bold">{p.name}</div>
            <div className={`text-[8px] font-display font-bold ${p.glow ? 'text-brand-yellow' : 'text-brand-black/60'}`}>{p.pts}</div>
          </div>
        ))}
      </div>
      <div className="bg-brand-red border-2 border-brand-black p-2 text-white text-[10px] font-bold flex justify-between">
        <span>You climbed to #1!</span><span>🎉</span>
      </div>
    </div>,
  ];

  return (
    <div className="relative h-full">
      {screens[screen]}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: screen === i ? '16px' : '6px', height: '6px', borderRadius: '3px',
            background: screen === i ? 'var(--brand-red)' : 'rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
          }} />
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
            title: `${v.username}'s ad`,
            href: v.url,
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-brand-cream min-h-screen overflow-x-hidden font-secondary text-brand-black">

      {/* ===== TOP COLOR BAR ===== */}
      <div className="fixed top-0 left-0 w-full h-2 z-50 flex shadow-sm">
        <div className="h-full flex-1 bg-brand-blue" />
        <div className="h-full flex-1 bg-brand-red" />
        <div className="h-full flex-1 bg-brand-yellow" />
        <div className="h-full flex-1 bg-brand-green" />
      </div>

      {/* ===== HEADER ===== */}
      <header className="pt-28 pb-32 relative z-20 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full z-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-brand-red rounded-full flex items-center justify-center animate-spin-slow">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <path id="curve" d="M 25, 50 a 25,25 0 1,1 50,0 a 25,25 0 1,1 -50,0" fill="transparent" />
              <text className="text-[10px] font-bold fill-brand-red uppercase tracking-widest">
                <textPath href="#curve">Video Ads • Engagement • Leaderboard •</textPath>
              </text>
            </svg>
          </div>
          <div className="absolute bottom-10 right-10 transform rotate-12">
            <div className="w-40 h-10 border-2 border-brand-red flex items-center justify-between px-2">
              <div className="h-full w-1 bg-brand-red" />
              <div className="h-full w-2 bg-brand-red" />
              <div className="h-full w-0.5 bg-brand-red" />
              <div className="h-full w-4 bg-brand-red" />
              <div className="h-full w-1 bg-brand-red" />
              <span className="text-[10px] font-bold text-brand-red rotate-90 scale-75">2026</span>
            </div>
          </div>
        </div>

        {/* Top Nav */}
        <div className="header-animate-in relative z-20 flex justify-between items-start px-8 text-[10px] font-bold tracking-widest text-brand-red uppercase">
          <div className="leading-tight hover:text-brand-black transition-colors cursor-default border-l-2 border-brand-red pl-2">
            Available for<br />Businesses
          </div>
          <div className="flex gap-8">
            <a href="#how-it-works" className="hover:text-brand-black hover:scale-110 transition-all inline-block">How It Works</a>
            <a href="#features" className="hover:text-brand-black hover:scale-110 transition-all inline-block">Features</a>
            <a href="#pricing" className="hover:text-brand-black hover:scale-110 transition-all inline-block">Pricing</a>
          </div>
          <div className="flex gap-2">
            <span className="cursor-pointer hover:text-brand-black transition-colors">EN</span> / <span className="text-brand-black/50 cursor-pointer hover:text-black transition-colors">HI</span>
          </div>
        </div>

        {/* Main Logo Area — Diamond Frame */}
        <div className="flex justify-center mt-16 mb-24 relative">
          <div className="logo-animate-in relative w-80 h-40 md:w-[420px] md:h-48 border-2 border-brand-red transform scale-100 hover:scale-105 transition-transform duration-500 cursor-pointer bg-brand-cream z-10 shadow-[10px_10px_0px_rgba(233,78,51,0.2)]">
            {/* Decorative corners */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-brand-red" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-red" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-brand-red" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-brand-red" />

            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full h-full relative flex items-center justify-center">
                <div className="absolute inset-0 border border-brand-red rotate-3 opacity-20" />
                <div className="absolute inset-0 border border-brand-red -rotate-2 opacity-20" />
                <div className="relative z-10 text-center flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-brand-black tracking-[0.5em] mb-2 bg-brand-red text-brand-cream px-2">Free Engagement Leaderboard</span>
                  <h1 className="font-display text-6xl md:text-7xl text-brand-red tracking-tighter leading-none" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>
                    OUTSCROLL
                  </h1>
                  <div className="font-display text-xl text-brand-black tracking-widest mt-1">CLIMB THE LADDER</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Icons (Right Side) */}
        <div className="header-animate-in absolute bottom-4 right-8 flex gap-2">
          <button className="w-6 h-6 bg-brand-red rotate-45 flex items-center justify-center text-brand-cream text-[10px] hover:bg-brand-black transition-colors duration-300 group">
            <span className="-rotate-45 font-bold group-hover:rotate-0 transition-transform duration-300">▶</span>
          </button>
          <button className="w-6 h-6 bg-brand-red rotate-45 flex items-center justify-center text-brand-cream text-[10px] hover:bg-brand-black transition-colors duration-300 group">
            <span className="-rotate-45 font-bold group-hover:rotate-0 transition-transform duration-300">↗</span>
          </button>
        </div>
      </header>

      <main>
        {/* ===== SCROLLING MARQUEE ===== */}
        <div className="bg-brand-red py-3 overflow-hidden border-y-4 border-brand-black relative">
          <div className="flex w-max animate-marquee">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="inline-flex items-center gap-6 px-6 whitespace-nowrap font-display text-2xl md:text-3xl text-brand-cream tracking-tight uppercase">
                OUTSCROLL <span className="text-brand-yellow">●</span> YOUR COMPETITOR <span className="text-brand-yellow">●</span> CLIMB THE LADDER <span className="text-brand-yellow">●</span> FREE <span className="text-brand-yellow">●</span>
              </span>
            ))}
          </div>
        </div>

        {/* ===== HOW IT WORKS — Menu Style ===== */}
        <section id="how-it-works" className="flex flex-col md:flex-row min-h-[500px] relative bg-brand-cream overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute -top-6 left-16 w-12 h-12 bg-brand-green rounded-full flex items-center justify-center z-20 border-4 border-brand-black animate-spin-slow shadow-lg hover:scale-110 transition-transform cursor-pointer">
            <svg className="w-6 h-6 text-brand-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="absolute -top-6 left-32 w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center z-20 border-4 border-brand-cream opacity-90 animate-bounce-slow" style={{ animationDelay: '1s' }}>
            <div className="w-full h-full border border-dashed border-brand-black rounded-full" />
          </div>

          {/* Green Sidebar */}
          <ScrollReveal>
            <div className="w-full md:w-20 bg-brand-green relative flex md:flex-col items-center justify-between py-8 px-4 jagged-right-edge z-10 shrink-0">
              <h2 className="font-display text-4xl md:text-5xl text-brand-cream md:vertical-text tracking-tight uppercase hover:text-brand-yellow transition-colors cursor-default">Steps</h2>
              <div className="hidden md:block text-[9px] font-bold text-brand-cream uppercase vertical-text tracking-widest mt-8 animate-pulse">Free to join</div>
            </div>
          </ScrollReveal>

          {/* Content Area (Menu Style) */}
          <div className="flex-1 p-8 md:p-12 relative bg-brand-cream">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {/* Column 1: The Flow */}
              <ScrollReveal delay={0.1}>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-widest text-brand-green mb-4 border-b border-brand-green/20 pb-1">The Flow</h3>
                  <ul className="space-y-3 text-xs font-bold text-brand-black/80 uppercase">
                    {[
                      { label: 'Submit Business', desc: 'Sign up & submit website' },
                      { label: 'Get Approved', desc: 'We verify you\'re legit' },
                      { label: 'Post Reels/Shorts', desc: '1 video ad per day' },
                      { label: 'Watch Others', desc: 'Earn +5 to +100 points' },
                    ].map((item) => (
                      <li key={item.label} className="menu-item group hover:text-brand-red transition-colors cursor-pointer">
                        <span>{item.label}</span>
                        <span className="menu-dots group-hover:border-brand-red" />
                        <span className="text-brand-black/40 text-[9px] normal-case tracking-normal">{item.desc}</span>
                      </li>
                    ))}
                  </ul>

                  <h3 className="font-bold text-xs uppercase tracking-widest text-brand-green mb-4 mt-8 border-b border-brand-green/20 pb-1">Points</h3>
                  <ul className="space-y-3 text-xs font-bold text-brand-black/80 uppercase">
                    {[
                      { action: 'Play Video', points: '+5' },
                      { action: 'Watch 50%', points: '+70' },
                      { action: 'Full Watch', points: '+100' },
                      { action: 'Skip Early', points: '-5' },
                    ].map((item) => (
                      <li key={item.action} className="menu-item group hover:text-brand-red transition-colors cursor-pointer">
                        <span>{item.action}</span>
                        <span className="menu-dots group-hover:border-brand-red" />
                        <span className={`font-display font-bold ${item.points.startsWith('-') ? 'text-brand-red' : 'text-brand-green'}`}>{item.points}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>

              {/* Column 2: Platforms + CTA */}
              <ScrollReveal delay={0.2}>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-widest text-brand-green mb-4 border-b border-brand-green/20 pb-1">Supported Platforms</h3>
                  <ul className="space-y-3 text-xs font-bold text-brand-black/80 uppercase">
                    {[
                      { platform: 'TikTok', icon: '♪' },
                      { platform: 'Instagram Reels', icon: '◎' },
                      { platform: 'YouTube Shorts', icon: '▶' },
                      { platform: 'Snapchat Spotlight', icon: '👻' },
                    ].map((item) => (
                      <li key={item.platform} className="menu-item group hover:text-brand-red transition-colors cursor-pointer">
                        <span>{item.icon} {item.platform}</span>
                        <span className="menu-dots group-hover:border-brand-red" />
                        <span className="text-brand-green font-bold">✓</span>
                      </li>
                    ))}
                  </ul>

                  <h3 className="font-bold text-xs uppercase tracking-widest text-brand-green mb-4 mt-8 border-b border-brand-green/20 pb-1">Why OutScroll</h3>
                  <ul className="space-y-3 text-xs font-bold text-brand-black/80 uppercase">
                    {[
                      { item: 'Free forever', check: true },
                      { item: 'Verified businesses only', check: true },
                      { item: 'Engagement-based ranking', check: true },
                      { item: 'No ads, no pay-to-rank', check: true },
                    ].map((item) => (
                      <li key={item.item} className="menu-item group hover:text-brand-red transition-colors cursor-pointer">
                        <span>{item.item}</span>
                        <span className="menu-dots group-hover:border-brand-red" />
                        <span className="text-brand-green font-bold">{item.check ? '✓' : '—'}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Box */}
                  <div className="mt-8 bg-brand-red p-4 text-brand-cream transform -rotate-1 shadow-lg hover:rotate-0 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                    <p className="font-display text-xl mb-1 group-hover:scale-105 transition-transform origin-left">Ready to climb?</p>
                    <p className="text-[10px] leading-tight opacity-90 group-hover:opacity-100">Join free. Watch content. Rise to #1 on the leaderboard.</p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* Cheese Wedge Decoration at Bottom */}
          <div className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2 z-20 hover:translate-y-[-10px] transition-transform duration-300">
            <div className="w-16 h-16 bg-brand-yellow rotate-45 border-4 border-brand-black relative overflow-hidden">
              <div className="absolute top-2 left-2 w-2 h-2 bg-brand-black rounded-full" />
              <div className="absolute bottom-4 right-2 w-4 h-4 bg-brand-black rounded-full" />
            </div>
          </div>
          {/* Red Half Circle Decoration */}
          <div className="absolute bottom-[-15px] right-20 w-12 h-6 bg-brand-red rounded-t-full border-t-2 border-r-2 border-l-2 border-brand-black z-20 hover:scale-110 transition-transform origin-bottom" />

          {/* Bottom jagged edge */}
          <div className="absolute bottom-0 left-0 w-full h-4 bg-brand-cream" style={{ clipPath: 'polygon(0% 100%, 2% 0%, 4% 100%, 6% 0%, 8% 100%, 10% 0%, 12% 100%, 14% 0%, 16% 100%, 18% 0%, 20% 100%, 22% 0%, 24% 100%, 26% 0%, 28% 100%, 30% 0%, 32% 100%, 34% 0%, 36% 100%, 38% 0%, 40% 100%, 42% 0%, 44% 100%, 46% 0%, 48% 100%, 50% 0%, 52% 100%, 54% 0%, 56% 100%, 58% 0%, 60% 100%, 62% 0%, 64% 100%, 66% 0%, 68% 100%, 70% 0%, 72% 100%, 74% 0%, 76% 100%, 78% 0%, 80% 100%, 82% 0%, 84% 100%, 86% 0%, 88% 100%, 90% 0%, 92% 100%, 94% 0%, 96% 100%, 98% 0%, 100% 100%)' }} />
        </section>

        {/* ===== ANIMATED DEMO — Phone Mockup ===== */}
        <section className="bg-brand-blue py-20 relative overflow-hidden" id="demo">
          <div className="flex flex-col md:flex-row max-w-6xl mx-auto px-8 gap-12 items-center">
            {/* Left: Text */}
            <div className="flex-1 text-brand-cream">
              <ScrollReveal>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-yellow mb-4 border-l-2 border-brand-yellow pl-3">See It In Action</div>
                <h2 className="font-display text-5xl md:text-6xl tracking-tight leading-none mb-4">
                  POST.<br />WATCH.<br />CLIMB.
                </h2>
                <p className="text-brand-cream/70 text-sm leading-relaxed max-w-sm mb-8">
                  Post your business video ad. Watch other entrepreneurs' content. Earn points. Climb the leaderboard. It&apos;s that simple.
                </p>
              </ScrollReveal>
              <ScrollReveal delay={0.2}>
                <button
                  className="bg-brand-yellow text-brand-black font-display text-lg px-8 py-3 border-2 border-brand-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200 uppercase tracking-wider"
                  onClick={onEnter}
                >
                  Get Started Free
                </button>
              </ScrollReveal>
            </div>

            {/* Right: Phone Mockup */}
            <ScrollReveal delay={0.3}>
              <div className="relative">
                <div className="w-[280px] h-[560px] rounded-[32px] border-4 border-brand-black bg-brand-cream overflow-hidden shadow-[12px_12px_0px_rgba(0,0,0,0.3)]">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-brand-black rounded-b-xl z-10" />
                  {/* Status bar */}
                  <div className="pt-7 px-4 flex justify-between text-[8px] font-bold text-brand-black/40">
                    <span>9:41</span>
                    <span>●●●</span>
                  </div>
                  {/* Content */}
                  <AnimatedDemoScreens />
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand-red rounded-full border-2 border-brand-black flex items-center justify-center animate-spin-slow">
                  <span className="text-white font-bold text-xs">★</span>
                </div>
                <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-brand-yellow border-2 border-brand-black rotate-45" />
              </div>
            </ScrollReveal>
          </div>

          {/* Jagged bottom edge */}
          <div className="absolute bottom-0 left-0 w-full h-4 bg-brand-cream" style={{ clipPath: 'polygon(0% 100%, 2% 0%, 4% 100%, 6% 0%, 8% 100%, 10% 0%, 12% 100%, 14% 0%, 16% 100%, 18% 0%, 20% 100%, 22% 0%, 24% 100%, 26% 0%, 28% 100%, 30% 0%, 32% 100%, 34% 0%, 36% 100%, 38% 0%, 40% 100%, 42% 0%, 44% 100%, 46% 0%, 48% 100%, 50% 0%, 52% 100%, 54% 0%, 56% 100%, 58% 0%, 60% 100%, 62% 0%, 64% 100%, 66% 0%, 68% 100%, 70% 0%, 72% 100%, 74% 0%, 76% 100%, 78% 0%, 80% 100%, 82% 0%, 84% 100%, 86% 0%, 88% 100%, 90% 0%, 92% 100%, 94% 0%, 96% 100%, 98% 0%, 100% 100%)' }} />
        </section>

        {/* ===== DOOMSCROLL WALL ===== */}
        <section className="py-16 relative overflow-hidden bg-brand-cream">
          <ScrollReveal>
            <div className="text-center mb-6 relative z-3">
              <h2 className="font-display text-4xl md:text-5xl text-brand-red tracking-tight uppercase" style={{ textShadow: '2px 2px 0px #fdb913' }}>
                Always Watching
              </h2>
              <p className="text-brand-black/60 mt-2 text-sm font-bold uppercase tracking-wider">
                Businesses posting. Entrepreneurs engaging. The ladder moves.
              </p>
            </div>
          </ScrollReveal>
          <div style={{ height: '380px', position: 'relative', zIndex: 2 }}>
            <DriftWall
              items={wallItems}
              columns={8}
              tileWidth={100}
              tileHeight={140}
              gap={4}
              speed={25}
              direction="up"
              tilt={12}
              parallax={0.7}
              depth={80}
              fade={0.5}
              overlayColor="#f3efe0"
              pauseOnHover
            />
          </div>
        </section>

        {/* ===== FEATURE CARDS — Grid ===== */}
        <section id="features" className="bg-brand-cream pt-8 pb-16 relative">
          {/* Header */}
          <ScrollReveal>
            <div className="text-center mb-8 relative">
              <h2 className="font-display text-4xl md:text-5xl text-brand-yellow uppercase tracking-tight hover:text-brand-red transition-colors duration-500 cursor-default" style={{ textShadow: '2px 2px 0px #e94e33' }}>
                What You Get
              </h2>
            </div>
          </ScrollReveal>

          {/* Row 1 — 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 w-full max-w-6xl mx-auto">
            <ScrollReveal delay={0.1}>
              <div className="group relative bg-brand-green h-64 md:h-72 overflow-hidden border-r border-brand-cream cursor-pointer">
                <div className="absolute top-4 left-4 w-2 h-2 bg-brand-black rounded-full z-10" />
                <div className="h-4/5 flex items-center justify-center p-6">
                  <div className="w-32 h-32 bg-brand-cream border-4 border-brand-black flex flex-col items-center justify-center shadow-xl transform group-hover:scale-110 transition duration-500 rotate-3">
                    <span className="text-4xl">🏢</span>
                    <span className="font-display text-xs text-brand-black mt-1">BUSINESS</span>
                  </div>
                </div>
                <div className="absolute bottom-0 w-full bg-brand-green brightness-90 py-2 px-4 flex justify-between items-center group-hover:bg-brand-black transition-colors duration-300">
                  <span className="font-display text-brand-cream text-xl">Verified Only</span>
                  <span className="text-[10px] font-bold text-brand-yellow bg-brand-black px-2 py-0.5 group-hover:bg-brand-yellow group-hover:text-brand-black transition-colors">APPROVAL</span>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="group relative bg-[#d6cbb2] h-64 md:h-72 overflow-hidden border-r border-brand-cream cursor-pointer">
                <div className="absolute top-0 right-8 w-8 h-12 bg-brand-red flex items-end justify-center pb-2 shadow-sm group-hover:h-16 transition-all duration-300">
                  <div className="w-4 h-4 rounded-full bg-white" />
                </div>
                <div className="h-4/5 flex items-center justify-center p-6">
                  <div className="w-32 h-32 bg-white border-2 border-brand-red flex flex-col items-center justify-center shadow-xl transform group-hover:scale-110 transition duration-500 -rotate-3">
                    <span className="text-4xl">📱</span>
                    <span className="font-display text-xs text-brand-red mt-1">REELS</span>
                  </div>
                </div>
                <div className="absolute bottom-0 w-full bg-[#c5b99e] py-2 px-4 flex justify-between items-center group-hover:bg-brand-red transition-colors duration-300">
                  <span className="font-display text-brand-red text-xl group-hover:text-white">Vertical Video</span>
                  <span className="text-[10px] font-bold text-white bg-brand-red px-2 py-0.5 group-hover:bg-white group-hover:text-brand-red">SHORTS</span>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="group relative bg-brand-blue h-64 md:h-72 overflow-hidden cursor-pointer">
                <div className="absolute top-4 left-4 w-2 h-12 border-l-2 border-dashed border-white/50" />
                <div className="h-4/5 flex items-center justify-center p-6">
                  <div className="w-32 h-32 bg-brand-yellow border-4 border-brand-black flex flex-col items-center justify-center shadow-xl transform group-hover:scale-110 transition duration-500 rotate-2">
                    <span className="text-4xl">🏆</span>
                    <span className="font-display text-xs text-brand-black mt-1">#1</span>
                  </div>
                </div>
                <div className="absolute bottom-0 w-full bg-brand-blue brightness-90 py-2 px-4 flex justify-between items-center group-hover:bg-brand-yellow transition-colors duration-300">
                  <span className="font-display text-brand-yellow text-xl group-hover:text-blue-900">Leaderboard</span>
                  <span className="text-[10px] font-bold text-blue-900 bg-brand-yellow px-2 py-0.5 group-hover:bg-blue-900 group-hover:text-brand-yellow">RANKS</span>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Row 2 — 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 w-full max-w-6xl mx-auto">
            <ScrollReveal delay={0.1}>
              <div className="group relative bg-brand-blue h-64 md:h-64 overflow-hidden border-r border-t border-brand-cream cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                  <span className="font-display text-9xl text-white group-hover:rotate-180 transition-transform duration-700">★</span>
                </div>
                <div className="h-full flex items-center justify-center p-6 relative z-10">
                  <div className="w-24 h-24 bg-brand-red rounded-full border-4 border-brand-black flex items-center justify-center shadow-xl transform group-hover:scale-125 transition duration-500">
                    <span className="text-white font-display text-2xl">+100</span>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="font-display text-white text-lg">Points</span>
                </div>
                <div className="absolute bottom-4 right-4 text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                  Earn per watch
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="group relative bg-brand-green h-64 md:h-64 overflow-hidden border-r border-t border-brand-cream cursor-pointer">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[20px] border-t-brand-cream z-10 transition-transform group-hover:-translate-y-2" />
                <div className="h-full flex items-center justify-center p-6">
                  <div className="w-32 h-20 bg-brand-cream border-2 border-brand-black flex items-center justify-center shadow-lg transform group-hover:rotate-3 group-hover:scale-110 transition duration-300">
                    <span className="font-display text-2xl text-brand-black">FREE</span>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4">
                  <span className="font-display text-brand-cream text-lg">No Cost</span>
                </div>
                <div className="absolute top-4 right-4 text-brand-cream font-bold text-xs bg-brand-black px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">$0</div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="group relative bg-brand-red h-64 md:h-64 overflow-hidden border-t border-brand-cream cursor-pointer">
                <div className="absolute top-4 left-4 bg-white text-brand-red text-[10px] font-bold px-2 py-1 transform -rotate-12 group-hover:rotate-0 transition-transform">NEW</div>
                <div className="h-full flex items-center justify-center p-6">
                  <div className="w-40 h-24 bg-brand-cream border-2 border-brand-black flex items-center justify-center shadow-lg transform group-hover:rotate-3 group-hover:scale-110 transition duration-300">
                    <span className="font-display text-2xl text-brand-black">1/DAY</span>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="font-display text-brand-black text-lg">Post Limit</span>
                </div>
                <div className="absolute bottom-4 right-4 text-brand-black font-bold text-xs">1 daily</div>
              </div>
            </ScrollReveal>
          </div>

          {/* Footer Decorative Triangle */}
          <div className="absolute bottom-[-20px] left-1/2 transform -translate-x-1/2 w-full flex justify-center z-10">
            <div className="w-32 h-10 bg-brand-cream" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
          </div>
        </section>

        {/* ===== POINTS TABLE — Menu Style ===== */}
        <section id="pricing" className="bg-brand-cream py-16 relative">
          <div className="max-w-4xl mx-auto px-8">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="font-display text-5xl md:text-6xl text-brand-red uppercase tracking-tight" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>
                  The Points
                </h2>
                <p className="text-brand-black/60 mt-2 text-sm font-bold uppercase tracking-wider">Free for all · No hidden fees</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="bg-brand-black text-brand-cream p-8 shadow-[10px_10px_0px_rgba(233,78,51,0.3)] border-2 border-brand-red">
                {/* Table header */}
                <div className="grid grid-cols-3 gap-4 pb-4 border-b border-brand-cream/20 mb-4 text-[10px] font-bold uppercase tracking-widest text-brand-yellow">
                  <span>Action</span>
                  <span className="text-center">Points</span>
                  <span className="text-right">Note</span>
                </div>
                {/* Rows */}
                {[
                  { action: 'Click Play', points: '+5', note: 'Start watching', color: 'text-brand-yellow' },
                  { action: 'Watch 50%', points: '+70', note: 'Halfway through', color: 'text-brand-green' },
                  { action: 'Full Watch', points: '+100', note: 'Entire video', color: 'text-brand-green' },
                  { action: 'Skip Before 50%', points: '-5', note: 'Penalty', color: 'text-brand-red' },
                ].map((row, i) => (
                  <div key={row.action} className="menu-item py-3 border-b border-brand-cream/10 group hover:text-brand-yellow transition-colors">
                    <span className="font-bold text-sm uppercase tracking-wider">{row.action}</span>
                    <span className="menu-dots group-hover:border-brand-yellow" style={{ borderBottomColor: 'rgba(243,239,224,0.2)' }} />
                    <span className={`font-display text-2xl font-bold ${row.color}`}>{row.points}</span>
                  </div>
                ))}
                <div className="mt-4 text-[10px] text-brand-cream/50 uppercase tracking-wider">
                  Creator posting bonus: None · Prevents gaming
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className="bg-brand-yellow py-20 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            {[
              { value: 0, suffix: '', label: 'Cost to Users', sublabel: 'Free forever' },
              { value: 1, suffix: '/day', label: 'Post Limit', sublabel: '1 video ad daily' },
              { value: 100, suffix: '+', label: 'Max Leaderboard', sublabel: 'Top performers' },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.15}>
                <div className="bg-brand-cream border-4 border-brand-black p-8 shadow-[6px_6px_0px_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.2)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-300">
                  <div className="font-display text-5xl md:text-6xl text-brand-red mb-2">
                    <AnimatedCounter target={stat.value} />{stat.suffix}
                  </div>
                  <div className="font-bold text-xs uppercase tracking-widest text-brand-black/80 mb-1">{stat.label}</div>
                  <div className="text-[10px] text-brand-black/50 uppercase tracking-wider">{stat.sublabel}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ===== VS COMPARISON ===== */}
        <section className="bg-brand-cream py-16 relative">
          <div className="max-w-4xl mx-auto px-8">
            <ScrollReveal>
              <div className="text-center mb-8">
                <h2 className="font-display text-4xl md:text-5xl text-brand-red uppercase tracking-tight" style={{ textShadow: '2px 2px 0px #fdb913' }}>
                  OutScroll vs The Rest
                </h2>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="bg-brand-black text-brand-cream border-2 border-brand-red shadow-[8px_8px_0px_rgba(233,78,51,0.3)] overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-brand-red text-brand-cream text-[10px] font-bold uppercase tracking-widest">
                  <span>Feature</span>
                  <span className="text-center text-brand-yellow">OutScroll</span>
                  <span className="text-center">Others</span>
                </div>
                {/* Rows */}
                {[
                  { feature: 'Cost', outscroll: 'Free forever', other: 'Pay to rank' },
                  { feature: 'Leaderboard', outscroll: 'Engagement-based', other: 'Follower count' },
                  { feature: 'Content', outscroll: 'Reels, Shorts, TikTok', other: 'Limited formats' },
                  { feature: 'Approval', outscroll: 'Verified businesses', other: 'Anyone' },
                  { feature: 'Creator Bonus', outscroll: 'None (fair play)', other: 'Pay-to-rank' },
                ].map((row, i) => (
                  <div key={row.feature} className="grid grid-cols-3 gap-4 p-4 border-b border-brand-cream/10 group hover:bg-brand-cream/5 transition-colors">
                    <span className="font-bold text-sm uppercase tracking-wider">{row.feature}</span>
                    <span className="text-center text-brand-green font-bold text-sm">{row.outscroll}</span>
                    <span className="text-center text-brand-cream/40 text-sm">{row.other}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="bg-brand-red py-24 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-8 left-8 w-16 h-16 border-4 border-brand-cream/20 rotate-45" />
          <div className="absolute bottom-8 right-8 w-12 h-12 bg-brand-yellow rounded-full border-2 border-brand-black animate-bounce-slow" />
          <div className="absolute top-1/2 left-4 -translate-y-1/2 w-8 h-32 border-l-2 border-dashed border-brand-cream/20" />

          <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
            <ScrollReveal>
              <h2 className="font-display text-6xl md:text-8xl text-brand-cream tracking-tight leading-none mb-6">
                READY TO<br />CLIMB?
              </h2>
              <p className="text-brand-cream/70 text-lg mb-8 max-w-md mx-auto">
                Join free. Watch content. Rise to #1. Your competitors are already here.
              </p>
              <button
                className="bg-brand-yellow text-brand-black font-display text-2xl px-12 py-4 border-4 border-brand-black shadow-[8px_8px_0px_rgba(0,0,0,0.5)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-200 uppercase tracking-wider"
                onClick={onEnter}
              >
                Start Now
              </button>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-brand-black text-brand-cream pt-16 pb-8 px-8 md:px-12 relative z-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          {/* Left Info */}
          <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest space-y-2 opacity-70">
            <div>Open for Businesses</div>
            <div>Free Tier Available</div>
            <div className="pt-4">Remote / Global</div>
            <div>India · Worldwide</div>
          </div>

          {/* Center Logo */}
          <div className="mx-auto mb-8 md:mb-0">
            <div className="w-32 h-16 border border-brand-cream/30 flex items-center justify-center hover:border-brand-cream hover:bg-white/5 transition-all cursor-pointer">
              <div className="w-24 h-8 border border-brand-cream/30 flex items-center justify-center transform rotate-180">
                <span className="font-display text-sm tracking-widest">OUTSCROLL</span>
              </div>
            </div>
          </div>

          {/* Right Links */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest">
              <button onClick={onEnter} className="hover:text-brand-red transition">Get Started</button>
              <a href="#how-it-works" className="hover:text-brand-red transition">How It Works</a>
            </div>
            <div className="flex gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest">
              <a href="#features" className="hover:text-brand-red transition">Features</a>
              <a href="#pricing" className="hover:text-brand-red transition">Pricing</a>
            </div>
            <div className="flex gap-3 mt-4">
              <div className="w-6 h-6 border border-brand-cream rotate-45 flex items-center justify-center hover:bg-brand-cream hover:text-brand-black transition cursor-pointer group">
                <span className="-rotate-45 font-bold text-xs group-hover:rotate-0 transition-transform">▶</span>
              </div>
              <div className="w-6 h-6 border border-brand-cream rotate-45 flex items-center justify-center hover:bg-brand-cream hover:text-brand-black transition cursor-pointer group">
                <span className="-rotate-45 font-bold text-xs group-hover:rotate-0 transition-transform">↗</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
