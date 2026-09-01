import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MoveHorizontal } from 'lucide-react';

export default function InteractiveHoverDeck({
  items = [],
  gridCols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  cardHeight = 'min-h-[260px]',
  theme = 'dark', // 'dark' or 'light'
}) {
  const containerRef = useRef(null);
  const [activeRevealIndex, setActiveRevealIndex] = useState(-1); // -1 means none or partial
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetIdx = Math.min(items.length - 1, Math.floor(relativeX * items.length));
    setActiveRevealIndex(targetIdx);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setActiveRevealIndex(-1);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full space-y-6 select-none"
    >
      {/* Interactive Cursor Scrub Indicator */}
      <div className="flex items-center justify-between text-xs text-[#BBEAD5] px-2">
        <div className="flex items-center gap-2 font-medium">
          <MoveHorizontal className="w-4 h-4 animate-pulse text-[#BBEAD5]" />
          <span>Move or drag cursor across to reveal cards</span>
        </div>
        <div className="flex items-center gap-1">
          {items.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= activeRevealIndex
                  ? 'w-6 bg-[#BBEAD5]'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className={`grid ${gridCols} gap-5 sm:gap-6`}>
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isRevealed = isHovered ? idx <= activeRevealIndex : idx === 0; // First card or revealed cards
          const isCurrentActive = isHovered && idx === activeRevealIndex;

          return (
            <motion.div
              key={item.id || idx}
              animate={{
                opacity: isRevealed ? 1 : 0.25,
                y: isRevealed ? (isCurrentActive ? -8 : 0) : 15,
                scale: isCurrentActive ? 1.03 : 1,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 ${cardHeight} ${
                isCurrentActive
                  ? 'bg-white text-[#00261D] shadow-2xl ring-4 ring-[#BBEAD5]/50 z-20'
                  : isRevealed
                  ? 'bg-white/90 backdrop-blur-md text-[#00261D] border border-white/30 shadow-lg'
                  : 'bg-white/5 backdrop-blur-sm border border-white/10 text-white/40'
              }`}
            >
              <div className="space-y-4">
                {/* Step / Icon Header */}
                <div className="flex items-center justify-between">
                  {Icon ? (
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        isCurrentActive
                          ? 'bg-[#00261D] text-[#BBEAD5]'
                          : isRevealed
                          ? 'bg-emerald-100 text-[#00261D]'
                          : 'bg-white/10 text-white/40'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  ) : (
                    <span
                      className={`text-3xl font-bold transition-colors ${
                        isCurrentActive
                          ? 'text-emerald-900'
                          : isRevealed
                          ? 'text-[#00261D]'
                          : 'text-white/30'
                      }`}
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {item.step || `0${idx + 1}`}
                    </span>
                  )}

                  {isCurrentActive && (
                    <span className="text-[10px] uppercase tracking-widest font-extrabold bg-[#BBEAD5] text-[#00261D] px-2.5 py-1 rounded-full animate-bounce">
                      Active
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  className={`text-xl font-bold transition-colors ${
                    isRevealed ? 'text-[#00261D]' : 'text-white/60'
                  }`}
                >
                  {item.title}
                </h3>

                {/* Description */}
                <p
                  className={`text-xs leading-relaxed transition-colors ${
                    isRevealed ? 'text-[#555E59]' : 'text-white/40'
                  }`}
                >
                  {item.desc}
                </p>
              </div>

              {/* Bottom Category or Footnote */}
              {item.footnote && (
                <div className="pt-3 border-t border-black/5 text-[11px] font-semibold text-emerald-800">
                  {item.footnote}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
