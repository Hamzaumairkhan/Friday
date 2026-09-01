import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import {
  Sparkles,
  Compass,
  MapPin,
  ShieldCheck,
  Users,
  CreditCard,
  ArrowRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export default function WheelCarousel({
  items = [],
  radius = 240,
  spacing = 28, // degrees between items
  className = '',
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const currentRotation = useRef(0);
  const targetRotation = useRef(0);
  const containerRef = useRef(null);

  // Rotation spring for smooth physics
  const springRot = useSpring(0, { damping: 26, stiffness: 220, mass: 0.4 });

  const totalItems = items.length || 6;

  // Snap to specific index
  const selectIndex = useCallback((idx) => {
    const clamped = (idx + totalItems) % totalItems;
    setActiveIndex(clamped);
    targetRotation.current = -clamped * spacing;
    springRot.set(-clamped * spacing);
  }, [totalItems, spacing, springRot]);

  // Pointer drag controls
  const handlePointerDown = (e) => {
    isDragging.current = true;
    startY.current = e.clientY;
    currentRotation.current = springRot.get();
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.clientY - startY.current;
    const rotDelta = deltaY * 0.18;
    const newRot = currentRotation.current + rotDelta;
    springRot.set(newRot);

    // Calculate nearest active index during drag
    const approxIdx = Math.round(-newRot / spacing);
    const normalizedIdx = ((approxIdx % totalItems) + totalItems) % totalItems;
    if (normalizedIdx !== activeIndex) {
      setActiveIndex(normalizedIdx);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const currentR = springRot.get();
    const nearestIdx = Math.round(-currentR / spacing);
    const normalized = ((nearestIdx % totalItems) + totalItems) % totalItems;
    selectIndex(normalized);
  };

  // Wheel scroll control
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY > 20) {
      selectIndex(activeIndex + 1);
    } else if (e.deltaY < -20) {
      selectIndex(activeIndex - 1);
    }
  };

  const activeItem = items[activeIndex] || items[0];
  const Icon = activeItem?.icon;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative w-full max-w-6xl mx-auto rounded-[36px] bg-white border border-black/10 shadow-xl p-6 sm:p-10 lg:p-12 overflow-hidden select-none ${className}`}
    >
      {/* Background Topographic Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#BBEAD5]/25 blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[460px]">
        {/* Left Column: Active Stage Feature Card (Crossfades smoothly on spin) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: -20, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#00261D] text-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10 space-y-6 relative overflow-hidden"
            >
              {/* Top Pill / Stage Indicator */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#BBEAD5] border border-white/15 text-xs font-bold uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-[#BBEAD5]" />
                  <span>{activeItem?.stageTag || `STAGE 0${activeIndex + 1}`}</span>
                </div>
                <span
                  className="text-4xl font-bold text-[#BBEAD5]/30"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  0{activeIndex + 1}
                </span>
              </div>

              {/* Title & Headline */}
              <div className="space-y-2">
                <h3
                  className="text-3xl sm:text-4xl md:text-5xl font-normal italic text-white leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {activeItem?.title}
                </h3>
                <p className="text-sm sm:text-base text-white/80 leading-relaxed font-sans">
                  {activeItem?.desc}
                </p>
              </div>

              {/* Feature Highlights List */}
              {activeItem?.highlights && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/10">
                  {activeItem.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#BBEAD5] shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#BBEAD5]">
                  {activeItem?.footnote || 'Autonomous Travel Engine'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectIndex(activeIndex - 1)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                    aria-label="Previous stage"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => selectIndex(activeIndex + 1)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                    aria-label="Next stage"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Column: Rotating Wheel Picker with Curved Labels */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="lg:col-span-5 relative h-[380px] sm:h-[440px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        >
          {/* Central Active Selection Marker */}
          <div className="absolute left-4 sm:left-8 flex items-center gap-3 z-30 pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-[#00261D] ring-4 ring-[#BBEAD5] shadow-lg animate-pulse" />
            <div className="h-0.5 w-10 bg-gradient-to-r from-[#00261D] to-transparent" />
          </div>

          {/* Rotating Curved Label Array */}
          <div className="relative w-full h-full flex items-center justify-center">
            {items.map((item, idx) => {
              const ItemIcon = item.icon;
              const isSelected = idx === activeIndex;

              return (
                <WheelLabel
                  key={idx}
                  item={item}
                  index={idx}
                  totalItems={totalItems}
                  activeIndex={activeIndex}
                  spacing={spacing}
                  radius={radius}
                  springRot={springRot}
                  isSelected={isSelected}
                  onClick={() => selectIndex(idx)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function WheelLabel({
  item,
  index,
  totalItems,
  activeIndex,
  spacing,
  radius,
  springRot,
  isSelected,
  onClick,
}) {
  const [transformStyle, setTransformStyle] = useState({});

  useEffect(() => {
    return springRot.on('change', (currentRot) => {
      // Calculate angular position relative to current rotation
      const rawAngle = index * spacing + currentRot;
      // Normalize angle to -180 to 180
      let normalizedAngle = ((rawAngle % 360) + 540) % 360 - 180;

      // Calculate 3D cylindrical coordinates
      const rad = (normalizedAngle * Math.PI) / 180;
      const y = Math.sin(rad) * radius;
      const x = (1 - Math.cos(rad)) * 45; // Curved horizontal inset
      const scale = Math.max(0.7, 1 - Math.abs(normalizedAngle) / 130);
      const opacity = Math.max(0, 1 - Math.abs(normalizedAngle) / 75);

      setTransformStyle({
        transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        opacity: Math.abs(normalizedAngle) > 80 ? 0 : opacity,
        zIndex: Math.round(100 - Math.abs(normalizedAngle)),
      });
    });
  }, [springRot, index, spacing, radius]);

  const ItemIcon = item.icon;

  return (
    <div
      onClick={onClick}
      style={transformStyle}
      className={`absolute left-16 sm:left-24 transition-colors duration-200 cursor-pointer flex items-center gap-3.5 px-5 py-3 rounded-2xl ${
        isSelected
          ? 'bg-[#00261D] text-white shadow-xl ring-2 ring-[#BBEAD5]/50 scale-105'
          : 'bg-[#F8FAF6]/90 text-[#00261D]/70 hover:text-[#00261D] hover:bg-emerald-50 border border-black/5'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
          isSelected
            ? 'bg-[#BBEAD5] text-[#00261D]'
            : 'bg-black/5 text-[#00261D]'
        }`}
      >
        0{index + 1}
      </div>

      <div className="space-y-0.5 text-left">
        <h4
          className={`text-base font-bold whitespace-nowrap ${
            isSelected ? 'text-white' : 'text-[#00261D]'
          }`}
        >
          {item.label || item.title}
        </h4>
        <p
          className={`text-[11px] whitespace-nowrap ${
            isSelected ? 'text-[#BBEAD5]' : 'text-[#717975]'
          }`}
        >
          {item.category || item.stageTag}
        </p>
      </div>
    </div>
  );
}
