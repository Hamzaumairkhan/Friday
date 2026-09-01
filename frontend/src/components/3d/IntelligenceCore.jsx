import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Compass, MapPin, CloudSun, ShieldCheck, Users, CreditCard, ArrowRight, CheckCircle2 } from 'lucide-react';

const NODES = [
  { id: 'ask', label: 'Ask', sub: 'Natural language intention', icon: Sparkles, color: '#BBEAD5' },
  { id: 'research', label: 'Research', sub: 'Climate & route intelligence', icon: CloudSun, color: '#90D5B5' },
  { id: 'plan', label: 'Plan', sub: 'Day-by-day structured itinerary', icon: Compass, color: '#68BE95' },
  { id: 'discover', label: 'Discover', sub: 'Verified marketplace packages', icon: MapPin, color: '#4BAA7C' },
  { id: 'connect', label: 'Connect', sub: 'Group chat & WhatsApp briefings', icon: Users, color: '#2F9364' },
  { id: 'book', label: 'Book', sub: '100% direct 0% commission', icon: CreditCard, color: '#105A44' },
];

export default function IntelligenceCore() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % NODES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto py-12 px-4 sm:px-6">
      {/* Central Ambient Glow & Concentric Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] rounded-full bg-[#00261D]/5 blur-3xl animate-pulse" />
        <div className="absolute w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] rounded-full border border-[#00261D]/10 animate-[spin_60s_linear_infinite]" />
        <div className="absolute w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] rounded-full border border-dashed border-[#00261D]/15 animate-[spin_40s_linear_infinite_reverse]" />
      </div>

      {/* Responsive Grid / Radial Node Flow */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {NODES.map((node, index) => {
          const Icon = node.icon;
          const isActive = activeStep === index;
          const isPassed = activeStep > index;

          return (
            <motion.div
              key={node.id}
              onClick={() => setActiveStep(index)}
              whileHover={{ scale: 1.04, y: -4 }}
              className={`p-4 sm:p-5 rounded-3xl transition-all duration-300 cursor-pointer border flex flex-col justify-between min-h-[160px] ${
                isActive
                  ? 'bg-[#00261D] text-white border-[#00261D] shadow-xl ring-2 ring-[#BBEAD5]/30'
                  : isPassed
                  ? 'bg-white text-[#00261D] border-[#00261D]/20 shadow-xs'
                  : 'bg-white/80 backdrop-blur-sm text-[#414845] border-black/10 hover:border-black/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold tracking-widest uppercase ${isActive ? 'text-[#BBEAD5]' : 'text-[#717975]'}`}>
                  0{index + 1}
                </span>
                <div
                  className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-white/20 text-[#BBEAD5]'
                      : 'bg-[#F8FAF6] text-[#00261D]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1 mt-4">
                <h4 className="text-base font-bold tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {node.label}
                </h4>
                <p className={`text-[11px] leading-snug line-clamp-2 ${isActive ? 'text-white/80' : 'text-[#717975]'}`}>
                  {node.sub}
                </p>
              </div>

              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="h-1 w-8 bg-[#BBEAD5] rounded-full mt-3"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Dynamic Visual Feedback Console */}
      <div className="mt-8 bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00261D] text-[#BBEAD5] flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Stage 0{activeStep + 1} • {NODES[activeStep].label}
              </span>
              <span className="text-xs text-[#717975]">Autonomous Intelligence</span>
            </div>
            <h3 className="text-lg sm:text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {activeStep === 0 && "“Tell Friday your raw thought: 'A 4-day retreat to Fairy Meadows with 3 friends for 80k.'”"}
              {activeStep === 1 && "Live real-time web scan of mountain passes, Babusar road conditions & high-altitude weather."}
              {activeStep === 2 && "Calculates optimal driving legs, sunrise photo stops, recommended homestays & per-person expense."}
              {activeStep === 3 && "Correlates local certified mountain guides and available open expedition group departures."}
              {activeStep === 4 && "Generates dedicated companion invite codes and automated WhatsApp briefing dispatches."}
              {activeStep === 5 && "Direct 100% settlement with local hosts via Nayapay, Sadapay, Raast or bank slips with zero fees."}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveStep((prev) => (prev > 0 ? prev - 1 : NODES.length - 1))}
            className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-slate-100 text-[#00261D] transition-colors cursor-pointer"
          >
            &larr;
          </button>
          <button
            onClick={() => setActiveStep((prev) => (prev + 1) % NODES.length)}
            className="w-10 h-10 rounded-full bg-[#00261D] text-white flex items-center justify-center hover:bg-[#00261D]/90 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
