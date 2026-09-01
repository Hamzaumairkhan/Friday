import { useState, useRef } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';

export default function HoverCardStack({
  tag = '// FEATURES',
  heading = 'Features',
  subheading = 'Hover & move cursor to reveal cards',
  description = '',
  items = [],
  className = '',
  cardWidth = 320,
  cardHeight = 380,
}) {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Fluid spring physics for the cursor-following floating card
  const springConfig = { damping: 22, stiffness: 240, mass: 0.25 };
  const cursorX = useSpring(0, springConfig);
  const cursorY = useSpring(0, springConfig);
  const tiltZ = useSpring(0, springConfig);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cursorX.set(x);
    cursorY.set(y);

    // Subtle tilt based on movement direction
    const normalizedX = (x - rect.width / 2) / (rect.width / 2);
    tiltZ.set(normalizedX * 12);

    // Calculate which single card to reveal based on mouse progression
    const ratio = Math.max(0, Math.min(0.999, x / rect.width));
    const targetIdx = Math.floor(ratio * items.length);
    if (targetIdx !== activeIndex && targetIdx >= 0 && targetIdx < items.length) {
      setActiveIndex(targetIdx);
    }
  };

  const handleMouseEnter = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cursorX.set(x);
    cursorY.set(y);

    const ratio = Math.max(0, Math.min(0.999, x / rect.width));
    setActiveIndex(Math.floor(ratio * items.length));
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const currentItem = items[activeIndex] || items[0];
  const Icon = currentItem?.icon;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full min-h-[520px] sm:min-h-[600px] flex items-center justify-center overflow-hidden rounded-[40px] select-none cursor-crosshair ${className}`}
    >
      {/* Center Fixed Typography (Always clean and visible) */}
      <div className="relative z-10 text-center max-w-3xl mx-auto px-4 space-y-4 pointer-events-none">
        {tag && (
          <span className="text-xs uppercase tracking-[0.25em] font-extrabold text-[#BBEAD5] block">
            {tag}
          </span>
        )}

        <h2
          className="text-5xl sm:text-7xl md:text-8xl font-normal italic text-white tracking-tight leading-[1.05]"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {heading}
        </h2>

        {description && (
          <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            {description}
          </p>
        )}

        <div className="pt-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#BBEAD5]/80 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{subheading}</span>
          </span>
        </div>

        {/* Dynamic Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-3">
          {items.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isHovered && i === activeIndex
                  ? 'w-8 bg-[#BBEAD5]'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Floating Single Card (Revealed One-by-One at Cursor Position) */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        <AnimatePresence>
          {isHovered && currentItem && (
            <motion.div
              style={{
                left: cursorX,
                top: cursorY,
                rotateZ: tiltZ,
              }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentItem.id || currentItem.step || activeIndex}
                  initial={{ opacity: 0, y: 12, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                  style={{
                    width: `${cardWidth}px`,
                    minHeight: `${cardHeight}px`,
                  }}
                  className="rounded-3xl p-7 flex flex-col justify-between bg-[#00261D]/95 text-white border-2 border-[#BBEAD5] shadow-[0_30px_70px_rgba(0,0,0,0.9)] ring-4 ring-[#BBEAD5]/30 backdrop-blur-2xl"
                >
                  <div className="space-y-4">
                    {/* Header: Icon / Step Number + Badge */}
                    <div className="flex items-center justify-between">
                      {Icon ? (
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#BBEAD5] text-[#00261D] shadow-md">
                          <Icon className="w-6 h-6" />
                        </div>
                      ) : (
                        <span
                          className="text-3xl font-bold text-[#BBEAD5]"
                          style={{ fontFamily: "'Instrument Serif', serif" }}
                        >
                          {currentItem.step || `0${activeIndex + 1}`}
                        </span>
                      )}

                      <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#BBEAD5] text-[#00261D] px-2.5 py-1 rounded-full shadow-xs">
                        {activeIndex + 1} of {items.length}
                      </span>
                    </div>

                    {/* Card Title */}
                    <h3 className="text-xl font-bold leading-snug text-white">
                      {currentItem.title}
                    </h3>

                    {/* Card Description */}
                    <p className="text-xs text-white/80 leading-relaxed">
                      {currentItem.desc}
                    </p>
                  </div>

                  {/* Footnote / Tag */}
                  {currentItem.footnote && (
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#BBEAD5] uppercase tracking-wider">
                        {currentItem.footnote}
                      </span>
                      <span className="text-white/50 text-[10px]">
                        Friday Intelligence
                      </span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
