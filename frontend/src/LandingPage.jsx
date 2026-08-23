import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ========== 3D Particle Field ==========
function ParticleField({ count = 2000 }) {
  const mesh = useRef();
  const { viewport, mouse } = useThree();
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const prevMouse = useRef({ x: 0, y: 0 });

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      sizes[i] = Math.random() * 0.03 + 0.01;
      speeds[i] = Math.random() * 0.3 + 0.1;
      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions, sizes, speeds, phases };
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;

    const time = state.clock.elapsedTime;

    // Mouse velocity for motion blur effect
    const dx = mouse.x - prevMouse.current.x;
    const dy = mouse.y - prevMouse.current.y;
    prevMouse.current = { x: mouse.x, y: mouse.y };
    setVelocity({ x: dx * 2, y: dy * 2 });

    const positions = mesh.current.geometry.attributes.position.array;
    const sizes = mesh.current.geometry.attributes.size.array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Gentle floating motion
      positions[i3 + 1] += Math.sin(time * particles.speeds[i] + particles.phases[i]) * 0.002;
      positions[i3] += Math.cos(time * particles.speeds[i] * 0.5 + particles.phases[i]) * 0.001;

      // Parallax effect based on mouse
      const depth = (positions[i3 + 2] + 10) / 20;
      positions[i3] += mouse.x * depth * 0.3 - velocity.x * depth * 0.1;
      positions[i3 + 1] += mouse.y * depth * 0.3 - velocity.y * depth * 0.1;

      // Motion blur effect — increase size when mouse moves fast
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
      const blurFactor = 1 + speed * 3;
      sizes[i] = (particles.sizes[i] || 0.02) * blurFactor;

      // Wrap around
      if (positions[i3] > 15) positions[i3] = -15;
      if (positions[i3] < -15) positions[i3] = 15;
      if (positions[i3 + 1] > 15) positions[i3 + 1] = -15;
      if (positions[i3 + 1] < -15) positions[i3 + 1] = 15;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.geometry.attributes.size.needsUpdate = true;

    // Rotate entire field slowly
    mesh.current.rotation.z = time * 0.02;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={particles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#5b8def"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ========== Glowing Lines ==========
function GlowLines() {
  const group = useRef();
  const { mouse } = useThree();

  const lines = useMemo(() => {
    const result = [];
    for (let i = 0; i < 8; i++) {
      const points = [];
      const y = (i - 4) * 2;
      for (let j = 0; j < 50; j++) {
        const x = (j - 25) * 0.6;
        points.push(new THREE.Vector3(x, y, -5 + Math.random() * 2));
      }
      result.push(points);
    }
    return result;
  }, []);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.x = mouse.y * 0.1;
      group.current.rotation.y = mouse.x * 0.1;
    }
  });

  return (
    <group ref={group}>
      {lines.map((points, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#5b8def" transparent opacity={0.08} />
        </line>
      ))}
    </group>
  );
}

// ========== Scroll Section with Reveal Animation ==========
function ScrollReveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
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

// ========== Main Landing Page ==========
export default function LandingPage({ onEnter }) {
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const heroOpacity = Math.max(0, 1 - scrollY / 600);
  const heroScale = 1 + scrollY * 0.0003;

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflow: 'hidden' }}>
      {/* 3D Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <ParticleField count={2500} />
          <GlowLines />
        </Canvas>
      </div>

      {/* Gradient overlay for depth */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, transparent 0%, var(--bg-primary) 70%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ===== HERO ===== */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
          opacity: heroOpacity,
          transform: `scale(${heroScale})`,
        }}>
          {/* Top badge */}
          <ScrollReveal delay={0}>
            <div style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              background: 'rgba(91, 141, 239, 0.1)',
              border: '1px solid rgba(91, 141, 239, 0.2)',
              borderRadius: '2px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--accent)',
              marginBottom: '2rem',
            }}>
              Free · No Payments · Just Engagement
            </div>
          </ScrollReveal>

          {/* Main headline */}
          <ScrollReveal delay={0.15}>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              fontWeight: 900,
              lineHeight: 0.95,
              marginBottom: '1.5rem',
              letterSpacing: '-0.03em',
            }}>
              <span style={{ color: 'var(--text-primary)' }}>climb the</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, #a78bfa 50%, var(--success) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(91, 141, 239, 0.3))',
              }}>
                ladder
              </span>
            </h1>
          </ScrollReveal>

          {/* Subtitle */}
          <ScrollReveal delay={0.3}>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.3rem)',
              color: 'var(--text-secondary)',
              maxWidth: '520px',
              lineHeight: 1.6,
              marginBottom: '3rem',
            }}>
              Post your business video ads. Watch other entrepreneurs.
              Earn points. Climb the leaderboard.
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>
                Free for businesses. No payment. No complexity. Just engagement.
              </span>
            </p>
          </ScrollReveal>

          {/* CTA buttons */}
          <ScrollReveal delay={0.45}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="neu-btn neu-btn-primary"
                onClick={onEnter}
                style={{
                  padding: '1.1rem 3rem',
                  fontSize: '1rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Get Started — It's Free
              </button>
              <button
                className="neu-btn"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  padding: '1.1rem 2.5rem',
                  fontSize: '0.85rem',
                }}
              >
                How It Works ↓
              </button>
            </div>
          </ScrollReveal>

          {/* Scroll indicator */}
          <div style={{
            position: 'absolute',
            bottom: '3rem',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: heroOpacity * 0.5,
          }}>
            <div style={{
              width: '24px',
              height: '40px',
              border: '2px solid var(--text-muted)',
              borderRadius: '12px',
              position: 'relative',
            }}>
              <div style={{
                width: '4px',
                height: '8px',
                background: 'var(--accent)',
                borderRadius: '2px',
                position: 'absolute',
                left: '50%',
                top: '8px',
                transform: 'translateX(-50%)',
                animation: 'scrollPulse 2s ease-in-out infinite',
              }} />
            </div>
          </div>
        </section>

        {/* ===== DOOMSCROLL WALL ===== */}
        <section style={{
          padding: '4rem 0',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, var(--bg-primary) 0%, #060010 30%, #060010 70%, var(--bg-primary) 100%)',
        }}>
          <ScrollReveal>
            <h2 style={{
              textAlign: 'center',
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              marginBottom: '0.5rem',
              position: 'relative',
              zIndex: 3,
            }}>
              always watching
            </h2>
            <p style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              marginBottom: '1.5rem',
              fontSize: '0.95rem',
              position: 'relative',
              zIndex: 3,
            }}>
              Businesses posting. Entrepreneurs engaging. The ladder moves.
            </p>
          </ScrollReveal>
          <div style={{ height: '400px', position: 'relative', zIndex: 2 }}>
            <DriftWall
              items={[
                { image: 'https://picsum.photos/id/1015/300/400', title: 'Startup Ad' },
                { image: 'https://picsum.photos/id/1025/300/400', title: 'Product Demo' },
                { image: 'https://picsum.photos/id/1039/300/400', title: 'Brand Story' },
                { image: 'https://picsum.photos/id/1042/300/400', title: 'Behind Scenes' },
                { image: 'https://picsum.photos/id/1043/300/400', title: 'Service Reel' },
                { image: 'https://picsum.photos/id/1047/300/400', title: 'Culture Vid' },
                { image: 'https://picsum.photos/id/1050/300/400', title: 'Testimonial' },
                { image: 'https://picsum.photos/id/1055/300/400', title: 'Launch Clip' },
              ]}
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
              overlayColor="#060010"
              pauseOnHover
            />
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section id="how-it-works" style={{ padding: '8rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
          <ScrollReveal>
            <h2 style={{
              textAlign: 'center',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              marginBottom: '1rem',
            }}>
              how it works
            </h2>
            <p style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              marginBottom: '4rem',
              fontSize: '1.1rem',
            }}>
              Four steps. Zero complexity.
            </p>
          </ScrollReveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
          }}>
            {[
              {
                step: '01',
                title: 'Submit Your Business',
                desc: "Sign up, submit your website for approval. We verify you're a legitimate business.",
                icon: '🏢',
                color: 'var(--accent)',
              },
              {
                step: '02',
                title: 'Post Your Ad',
                desc: "Once approved, post one TikTok, Reel, or Short per day showcasing your business.",
                icon: '📱',
                color: 'var(--success)',
              },
              {
                step: '03',
                title: 'Watch & Earn',
                desc: 'Watch other businesses\' content. Earn +5 to +100 points per video. Engagement is everything.',
                icon: '⚡',
                color: 'var(--accent)',
              },
              {
                step: '04',
                title: 'Climb the Ladder',
                desc: 'Your engagement score ranks you against every business. #1 watches the most content.',
                icon: '🏆',
                color: 'var(--gold)',
              },
            ].map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 0.15}>
                <div className="neu-card" style={{
                  padding: '2.5rem 2rem',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Step number */}
                  <div style={{
                    position: 'absolute',
                    top: '-0.5rem',
                    right: '1rem',
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '5rem',
                    fontWeight: 900,
                    color: item.color,
                    opacity: 0.06,
                    lineHeight: 1,
                  }}>
                    {item.step}
                  </div>

                  <div style={{
                    fontSize: '2rem',
                    marginBottom: '1rem',
                  }}>
                    {item.icon}
                  </div>
                  <h3 style={{
                    fontSize: '1.5rem',
                    marginBottom: '0.75rem',
                    fontFamily: "'Playfair Display', serif",
                  }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ===== POINTS SYSTEM ===== */}
        <section style={{ padding: '6rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
          <ScrollReveal>
            <h2 style={{
              textAlign: 'center',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginBottom: '3rem',
            }}>
              the points system
            </h2>
          </ScrollReveal>

          <div className="neu-card" style={{ padding: '2rem', overflow: 'hidden' }}>
            <table className="leaderboard-table" aria-label="Points system">
              <thead>
                <tr>
                  <th scope="col">Action</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Points</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { action: 'Click Play', points: '+5', note: 'Start watching', color: 'var(--accent)' },
                  { action: 'Watch 50%', points: '+70', note: 'Halfway through', color: 'var(--success)' },
                  { action: 'Full Watch', points: '+100', note: 'Entire video', color: 'var(--success)' },
                  { action: 'Skip before 50%', points: '-5', note: 'Penalty', color: 'var(--danger)' },
                ].map((row, i) => (
                  <ScrollReveal key={row.action} delay={i * 0.1}>
                    <tr>
                      <td style={{ fontWeight: 600 }}>{row.action}</td>
                      <td style={{
                        textAlign: 'center',
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 900,
                        fontSize: '1.2rem',
                        color: row.color,
                      }}>
                        {row.points}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{row.note}</td>
                    </tr>
                  </ScrollReveal>
                ))}
              </tbody>
            </table>
          </div>

          <ScrollReveal delay={0.4}>
            <div className="neu-card-inset" style={{
              padding: '1.25rem',
              marginTop: '1.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Creator posting bonus: None.</strong>{' '}
              Your content earning views doesn't earn YOU points. This prevents gaming.
            </div>
          </ScrollReveal>
        </section>

        {/* ===== STATS ===== */}
        <section style={{
          padding: '8rem 2rem',
          background: 'linear-gradient(180deg, transparent 0%, rgba(91, 141, 239, 0.03) 50%, transparent 100%)',
        }}>
          <div style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            textAlign: 'center',
          }}>
            {[
              { value: 0, suffix: '', label: 'Cost to users' },
              { value: 1, suffix: '/day', label: 'Post limit' },
              { value: 100, suffix: '', label: 'Max leaderboard' },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.15}>
                <div>
                  <div style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, var(--accent), var(--success))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    <AnimatedCounter target={stat.value} />{stat.suffix}
                  </div>
                  <div style={{
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontSize: '0.8rem',
                    marginTop: '0.5rem',
                  }}>
                    {stat.label}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ===== VS COMPARISON ===== */}
        <section style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
          <ScrollReveal>
            <h2 style={{
              textAlign: 'center',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginBottom: '3rem',
            }}>
              outscroll vs the rest
            </h2>
          </ScrollReveal>

          <div className="neu-card" style={{ padding: '2rem', overflow: 'hidden' }}>
            <table className="leaderboard-table" aria-label="Feature comparison">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col" style={{ textAlign: 'center', color: 'var(--accent)' }}>OutScroll</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Others</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Cost', outscroll: 'Free forever', other: 'Pay to rank' },
                  { feature: 'Leaderboard', outscroll: 'Engagement-based', other: 'Follower count' },
                  { feature: 'Content', outscroll: 'Reels, Shorts, TikTok', other: 'Limited formats' },
                  { feature: 'Approval', outscroll: 'Verified businesses only', other: 'Anyone' },
                ].map((row, i) => (
                  <ScrollReveal key={row.feature} delay={i * 0.1}>
                    <tr>
                      <td style={{ fontWeight: 600 }}>{row.feature}</td>
                      <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>{row.outscroll}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.other}</td>
                    </tr>
                  </ScrollReveal>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section style={{
          padding: '10rem 2rem',
          textAlign: 'center',
        }}>
          <ScrollReveal>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              fontWeight: 900,
              marginBottom: '1.5rem',
              lineHeight: 1,
            }}>
              <span style={{ color: 'var(--text-primary)' }}>ready to</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, var(--accent), var(--success))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                climb?
              </span>
            </h2>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '1.1rem',
              marginBottom: '3rem',
            }}>
              Join for free. Watch content. Rise to #1.
            </p>
            <button
              className="neu-btn neu-btn-primary"
              onClick={onEnter}
              style={{
                padding: '1.25rem 4rem',
                fontSize: '1.1rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              Start Now
            </button>
          </ScrollReveal>
        </section>

        {/* ===== FOOTER ===== */}
        <footer
          role="contentinfo"
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            borderTop: '1px solid rgba(255,255,255,0.03)',
          }}
        >
          <span className="logo" style={{ fontSize: '1rem' }}>out<span>scroll</span></span>
          <div style={{ marginTop: '0.5rem' }}>
            Free leaderboard for engagement · Post one link per day · Climb by watching others
          </div>
        </footer>
      </div>
    </div>
  );
}
