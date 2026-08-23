import { useRef, useEffect, useMemo } from 'react';

/**
 * DriftWall — A continuously scrolling wall of video thumbnail tiles
 * that creates a doomscrolling / "always watching" effect.
 * Pure CSS + requestAnimationFrame, no heavy 3D libraries.
 */
export default function DriftWall({
  items = [],
  columns = 6,
  tileWidth = 120,
  tileHeight = 160,
  gap = 4,
  speed = 30,
  direction = 'up',
  tilt = 8,
  parallax = 0.5,
  overlayColor = '#060010',
  pauseOnHover = true,
}) {
  const containerRef = useRef(null);
  const scrollRef = useRef(0);
  const rafRef = useRef(null);
  const pausedRef = useRef(false);

  // Generate enough items to fill the wall (at least 3x columns worth)
  const wallItems = useMemo(() => {
    const minItems = columns * 6;
    const result = [];
    while (result.length < minItems) {
      result.push(...items.map((item, i) => ({ ...item, _key: `${result.length}-${i}` })));
    }
    return result;
  }, [items, columns]);

  const totalHeight = useMemo(() => {
    const rows = Math.ceil(wallItems.length / columns);
    return rows * (tileHeight + gap);
  }, [wallItems.length, columns, tileHeight, gap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onEnter = () => { pausedRef.current = true; };
    const onLeave = () => { pausedRef.current = false; };

    if (pauseOnHover) {
      container.addEventListener('mouseenter', onEnter);
      container.addEventListener('mouseleave', onLeave);
    }

    let lastTime = performance.now();

    const animate = (now) => {
      if (!pausedRef.current) {
        const dt = (now - lastTime) / 1000;
        const dir = direction === 'up' ? -1 : 1;
        scrollRef.current += dir * speed * dt;

        // Loop seamlessly
        if (Math.abs(scrollRef.current) >= totalHeight / 2) {
          scrollRef.current = 0;
        }
      }
      lastTime = now;

      // Apply transform to all tile groups
      const tiles = container.querySelectorAll('[data-drift-tile]');
      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      tiles.forEach((tile) => {
        const rect = tile.getBoundingClientRect();
        const tileCenterY = rect.top + rect.height / 2;
        const distFromCenter = (tileCenterY - centerY) / containerRect.height;

        // Parallax: tiles closer to center appear closer
        const parallaxOffset = distFromCenter * parallax * 20;

        // Tilt based on vertical position
        const tiltDeg = distFromCenter * tilt;

        // Fade at edges
        const absDist = Math.abs(distFromCenter);
        const fadeAmount = Math.max(0, 1 - absDist * 1.5);

        tile.style.transform = `translateY(${scrollRef.current % totalHeight}px) translateY(${parallaxOffset}px) rotateX(${tiltDeg}deg)`;
        tile.style.opacity = fadeAmount;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (pauseOnHover) {
        container.removeEventListener('mouseenter', onEnter);
        container.removeEventListener('mouseleave', onLeave);
      }
    };
  }, [direction, speed, totalHeight, tilt, parallax, pauseOnHover, columns]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        perspective: '800px',
      }}
      aria-hidden="true"
    >
      {/* Top/bottom gradient fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '20%',
        background: `linear-gradient(to bottom, ${overlayColor}, transparent)`,
        zIndex: 2, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
        background: `linear-gradient(to top, ${overlayColor}, transparent)`,
        zIndex: 2, pointerEvents: 'none',
      }} />

      {/* Tile grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, ${tileWidth}px)`,
        gap: `${gap}px`,
        justifyContent: 'center',
        transformStyle: 'preserve-3d',
      }}>
        {wallItems.map((item, i) => (
          <div
            key={item._key || i}
            data-drift-tile
            style={{
              width: tileWidth,
              height: tileHeight,
              borderRadius: '8px',
              overflow: 'hidden',
              position: 'relative',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transformStyle: 'preserve-3d',
            }}
          >
            <img
              src={item.image}
              alt=""
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            {/* Overlay with title */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              padding: '6px 8px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              fontSize: '0.6rem',
              fontWeight: 600,
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {item.title}
            </div>
            {/* Play icon */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '28px', height: '28px',
              borderRadius: '50%',
              background: 'rgba(91, 141, 239, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              opacity: 0.8,
            }}>
              ▶
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
