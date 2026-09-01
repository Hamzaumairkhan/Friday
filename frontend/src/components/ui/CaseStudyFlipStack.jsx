import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, ArrowDown } from 'lucide-react';

/**
 * CaseStudyFlipStack: An editorial scroll-driven case study stack where
 * each full-width card folds upward to reveal the next story beneath it.
 */
export default function CaseStudyFlipStack({
  items = [],
  heading = 'Design That Delivers.',
  hint = 'Scroll Down',
  endLabel = 'The End',
  className = '',
}) {
  const containerRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);

  return (
    <div ref={containerRef} className={`relative w-full py-16 space-y-12 ${className}`}>
      {/* Header & Hint */}
      <div className="text-center space-y-3">
        <h2
          className="text-4xl sm:text-6xl font-normal text-[#00261D] italic"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {heading}
        </h2>
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#717975]">
          <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          <span>{hint}</span>
        </div>
      </div>

      {/* Cards Stack Container */}
      <div className="max-w-5xl mx-auto space-y-8 px-4">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            style={{
              backgroundColor: item.background || '#00261D',
              color: item.foreground || '#ffffff',
            }}
            className="rounded-[36px] p-8 sm:p-12 shadow-2xl border border-black/10 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-8 items-center sticky top-24"
          >
            <div className="md:col-span-7 space-y-4">
              <span className="text-xs uppercase tracking-[0.25em] font-extrabold text-[#BBEAD5] block">
                {item.eyebrow}
              </span>
              <h3
                className="text-3xl sm:text-4xl md:text-5xl font-normal italic leading-tight"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {item.title}
              </h3>
              <p className="text-sm sm:text-base opacity-90 leading-relaxed max-w-lg">
                {item.description}
              </p>
            </div>

            {item.image && (
              <div className="md:col-span-5 h-64 sm:h-72 rounded-2xl overflow-hidden shadow-lg bg-black/20">
                <img
                  src={item.image}
                  alt={item.imageAlt || item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* End Label */}
      <div className="text-center pt-6">
        <span className="text-xs font-bold uppercase tracking-widest text-[#717975]">
          {endLabel}
        </span>
      </div>
    </div>
  );
}
