import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  MapPin,
  Sparkles,
  ShieldCheck,
  Mountain,
  Sun,
  Users,
  CreditCard,
  Navigation,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export default function HeroVisual3D({ variant = 'home' }) {
  const containerRef = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateX(((y - centerY) / centerY) * -10);
    setRotateY(((x - centerX) / centerX) * 10);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[540px] mx-auto perspective-[1200px] select-none py-6"
    >
      {/* Ambient Gradient Glow Background */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#BBEAD5]/40 via-emerald-100/30 to-[#00261D]/10 blur-3xl pointer-events-none" />

      {/* Main 3D Card Stack Container */}
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative z-10 w-full space-y-4"
      >
        {/* Main Central Luxury Hero Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[32px] p-6 sm:p-7 border border-black/10 shadow-2xl space-y-5 relative overflow-hidden">
          {/* Top Destination Image with Film Matte */}
          <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-[#00261D]">
            <img
              src="/images/stitch/hero_mountains.jpg"
              alt="Hunza Valley Mountain Expedition"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Floating Live Altitude & Weather Badge */}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-bold text-[#00261D] shadow-sm">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>18°C Sunny • 2,438m</span>
            </div>

            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Expedition</span>
            </div>

            {/* Bottom Title Overlay */}
            <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#BBEAD5] block">
                Karakoram Highway Route
              </span>
              <h3 className="text-xl sm:text-2xl font-normal italic leading-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Hunza & Passu Cones Expedition
              </h3>
            </div>
          </div>

          {/* Quick Route Intelligence Breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
              <span className="text-[10px] uppercase font-bold text-[#717975] block">Duration</span>
              <span className="font-bold text-[#00261D]">5 Days</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
              <span className="text-[10px] uppercase font-bold text-[#717975] block">Group Cap</span>
              <span className="font-bold text-[#00261D]">8 Seats</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
              <span className="text-[10px] uppercase font-bold text-[#717975] block">Commission</span>
              <span className="font-bold text-emerald-800">0% Fee</span>
            </div>
          </div>

          {/* Host & Direct Payment Info Bar */}
          <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#00261D] text-[#BBEAD5] flex items-center justify-center font-bold text-xs">
                K
              </div>
              <div>
                <span className="text-[10px] text-[#717975] block font-semibold">Verified Operator</span>
                <span className="font-bold text-[#00261D] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 inline" />
                  <span>Karakoram Alpine Guides</span>
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                PKR 45,000
              </span>
              <span className="text-[10px] text-[#717975] block">direct to host</span>
            </div>
          </div>
        </div>

        {/* Floating Layer 1: Left Satellite Widget (Live Route GPS Node) */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transform: 'translateZ(30px)' }}
          className="absolute -bottom-4 -left-4 sm:-left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-black/10 shadow-xl max-w-[210px] space-y-1.5"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
            <Navigation className="w-3.5 h-3.5 text-emerald-700" />
            <span>Autonomous Route</span>
          </div>
          <p className="text-xs font-semibold text-[#00261D] leading-snug">
            Islamabad &rarr; Naran &rarr; Babusar &rarr; Hunza (680 km)
          </p>
          <span className="text-[10px] text-[#717975] block">✓ Clear Mountain Passes</span>
        </motion.div>

        {/* Floating Layer 2: Right Satellite Widget (Verified Direct 0% Commission) */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transform: 'translateZ(40px)' }}
          className="absolute -top-4 -right-4 sm:-right-6 bg-[#00261D] text-white p-4 rounded-2xl border border-white/10 shadow-2xl max-w-[200px] space-y-1"
        >
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#BBEAD5]">
            <Sparkles className="w-3.5 h-3.5 text-[#BBEAD5]" />
            <span>Direct Marketplace</span>
          </div>
          <p className="text-xs font-medium text-white/90">
            100% of payment reaches local drivers & lodges.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
