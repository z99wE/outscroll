import { useRef, useEffect, useMemo } from 'react';

/**
 * DriftWall — Continuously scrolling wall of video thumbnail tiles.
 * Uses simple CSS transform on a duplicated column for seamless infinite scroll.
 */
export default function DriftWall({
  items = [],
  columns = 6,
  tileWidth = 120,
  tileHeight = 160,
  gap = 4,
  speed = 25,
  overlayColor = '#f5f1eb',
}) {
  const wallRef = useRef(null);
  const offsetRef = useRef(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const pausedRef = useRef(false);

  // Generate enough items for seamless looping
  const wallItems = useMemo(() => {
    const minItems = columns * 8;
    const result = [];
    while (result.length < minItems) {
      result.push(...items.map((item, i) => ({ ...item, _key: `${result.length}-${i}` })));
    }
    return result;
  }, [items, columns]);

  const halfHeight = useMemo(() => {
    const rows = Math.ceil(wallItems.length / columns);
    return rows * (tileHeight + gap);
  }, [wallItems.length, columns, tileHeight, gap]);

  useEffect(() => {
    const container = wallRef.current;
    if (!container) return;

    const onEnter = () => { pausedRef.current = true; };
    const onLeave = () => { pausedRef.current = false; };
    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);

    const animate = (now) => {
      if (lastTimeRef.current === null) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (!pausedRef.current) {
        offsetRef.current += speed * dt;
        if (offsetRef.current >= halfHeight) {
          offsetRef.current -= halfHeight;
        }
      }

      // Apply transform to all scrollable groups
      const groups = container.querySelectorAll('[data-scroll-group]');
      groups.forEach(group => {
        group.style.transform = `translateY(${-offsetRef.current}px)`;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      container.removeEventListener('mouseenter', onEnter);
      container.removeEventListener('mouseleave', onLeave);
    };
  }, [speed, halfHeight]);

  // Split items into columns
  const columnItems = useMemo(() => {
    const cols = Array.from({ length: columns }, () => []);
    wallItems.forEach((item, i) => {
      cols[i % columns].push(item);
    });
    return cols;
  }, [wallItems, columns]);

  return (
    <div
      ref={wallRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
      aria-hidden="true"
    >
      {/* Top gradient fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '15%',
        background: `linear-gradient(to bottom, ${overlayColor}, transparent)`,
        zIndex: 2, pointerEvents: 'none',
      }} />
      {/* Bottom gradient fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '15%',
        background: `linear-gradient(to top, ${overlayColor}, transparent)`,
        zIndex: 2, pointerEvents: 'none',
      }} />

      {/* Scrolling columns */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: `${gap}px`,
        height: '100%',
      }}>
        {columnItems.map((col, colIdx) => (
          <div
            key={colIdx}
            data-scroll-group
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: `${gap}px`,
              willChange: 'transform',
            }}
          >
            {/* First set */}
            {col.map((item, i) => (
              <Tile key={item._key || `a-${i}`} item={item} width={tileWidth} height={tileHeight} />
            ))}
            {/* Duplicate set for seamless loop */}
            {col.map((item, i) => (
              <Tile key={item._key || `b-${i}`} item={item} width={tileWidth} height={tileHeight} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ item, width, height }) {
  return (
    <div style={{
      width, height, borderRadius: '6px', overflow: 'hidden',
      position: 'relative', background: '#ebe7e0',
      border: '1px solid #e0dcd6',
      flexShrink: 0,
    }}>
      <img
        src={item.image}
        alt=""
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '4px 6px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        fontSize: '0.55rem', fontWeight: 600, color: 'white',
      }}>
        {item.title}
      </div>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '24px', height: '24px', borderRadius: '50%',
        background: 'rgba(0, 94, 184, 0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6rem', color: 'white',
      }}>▶</div>
    </div>
  );
}
