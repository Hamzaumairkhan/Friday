import React, { useEffect, useRef } from 'react';

export function ImageTrail({
  items = [],
  itemWidth = 280,
  itemHeight = 340,
  threshold = 45,
  duration = 1.6,
}) {
  const containerRef = useRef(null);
  const itemsRef = useRef([]);
  const mousePos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const cachePos = useRef({ x: 0, y: 0 });
  const currentIndex = useRef(0);
  const zCounter = useRef(1);
  const rafId = useRef(null);
  const isInside = useRef(false);

  // Linear Interpolation for buttery smoothness
  const lerp = (a, b, n) => (1 - n) * a + n * b;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    itemsRef.current = Array.from(container.querySelectorAll('.trail-item'));

    const onMouseEnter = () => {
      isInside.current = true;
    };

    const onMouseLeave = () => {
      isInside.current = false;
    };

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      mousePos.current = { x, y };

      if (!isInside.current && x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        isInside.current = true;
        cachePos.current = { x, y };
        lastPos.current = { x, y };
      }
    };

    const tick = () => {
      if (isInside.current) {
        // Smooth coordinate lag/follow
        cachePos.current.x = lerp(cachePos.current.x, mousePos.current.x, 0.12);
        cachePos.current.y = lerp(cachePos.current.y, mousePos.current.y, 0.12);

        const dx = mousePos.current.x - lastPos.current.x;
        const dy = mousePos.current.y - lastPos.current.y;
        const dist = Math.hypot(dx, dy);

        // Spawn next card when threshold distance is travelled
        if (dist > threshold) {
          const el = itemsRef.current[currentIndex.current];
          if (el) {
            zCounter.current += 1;
            const cx = cachePos.current.x - itemWidth / 2;
            const cy = cachePos.current.y - itemHeight / 2;

            el.style.zIndex = zCounter.current;
            el.style.left = `${cx}px`;
            el.style.top = `${cy}px`;
            el.style.opacity = '1';
            el.style.transform = 'scale(1) rotate(' + ((Math.random() - 0.5) * 8) + 'deg)';
            el.style.transition = `opacity 0.12s ease, transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`;

            // Smooth fade out and slide down after delay
            setTimeout(() => {
              el.style.opacity = '0';
              el.style.transform = 'scale(0.92) translateY(35px)';
              el.style.transition = `opacity 0.8s ease, transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`;
            }, duration * 550);

            currentIndex.current = (currentIndex.current + 1) % itemsRef.current.length;
            lastPos.current = { ...mousePos.current };
          }
        }
      }

      rafId.current = requestAnimationFrame(tick);
    };

    container.addEventListener('mouseenter', onMouseEnter);
    container.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('mousemove', onMouseMove);
    rafId.current = requestAnimationFrame(tick);

    return () => {
      container.removeEventListener('mouseenter', onMouseEnter);
      container.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('mousemove', onMouseMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [threshold, itemWidth, itemHeight, duration]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-20"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id || item.step || index}
            className="trail-item absolute rounded-3xl p-7 flex flex-col justify-between select-none pointer-events-none"
            style={{
              width: `${itemWidth}px`,
              minHeight: `${itemHeight}px`,
              top: 0,
              left: 0,
              opacity: 0,
              willChange: 'transform, opacity',
              background: '#00261D',
              color: '#ffffff',
              border: '2px solid #BBEAD5',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(187, 234, 213, 0.25)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="space-y-4">
              {/* Top Header: Icon / Step Number + Badge */}
              <div className="flex items-center justify-between">
                {Icon ? (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#BBEAD5] text-[#00261D] shadow-md font-bold">
                    {React.isValidElement(Icon) ? (
                      Icon
                    ) : typeof Icon === 'function' || typeof Icon === 'object' ? (
                      React.createElement(Icon, { className: 'w-6 h-6' })
                    ) : null}
                  </div>
                ) : (
                  <span
                    className="text-3xl font-bold text-[#BBEAD5]"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {item.step || `0${index + 1}`}
                  </span>
                )}

                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#BBEAD5] text-[#00261D] px-2.5 py-1 rounded-full shadow-xs">
                  {item.step ? `Step ${item.step}` : `${index + 1} of ${items.length}`}
                </span>
              </div>

              {/* Title */}
              <h3
                className="text-xl font-bold leading-snug text-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {item.title}
              </h3>

              {/* Description */}
              <p
                className="text-xs text-white/80 leading-relaxed"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {item.desc}
              </p>
            </div>

            {/* Footnote / Tag */}
            {item.footnote && (
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#BBEAD5] uppercase tracking-wider">
                  {item.footnote}
                </span>
                <span className="text-white/40 text-[10px]">
                  Friday Intelligence
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ImageTrail;
