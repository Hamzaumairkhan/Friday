import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MapPin, Sun, Calendar, DollarSign, Users, ShieldCheck, Check, ArrowRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

const STEPS = [
  { text: 'Finding destinations across Gilgit-Baltistan & Swat...', detail: 'Matched Hunza Valley & Passu Cones' },
  { text: 'Checking live mountain weather & snow conditions...', detail: '18°C Sunny, Clear Babusar Pass' },
  { text: 'Planning day-by-day scenic route & driving hours...', detail: 'Islamabad → Naran → Hunza Expressway' },
  { text: 'Calculating detailed expense & per-person budget...', detail: 'PKR 48,000 total estimated (within 50k budget)' },
  { text: 'Finding boutique riverside hotels & guest cottages...', detail: '3 verified riverside stays found' },
  { text: 'Checking open group departures & co-travelers...', detail: 'Autumn Colors Expedition (4 seats left)' },
  { text: 'Verifying licensed local mountain guides...', detail: 'Alpine Mountain Guides (4.9 ★ Rating)' },
];

export default function LiveAiConversationDemo() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    if (currentStepIndex < STEPS.length) {
      const timer = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setIsCompleted(true);
    }
  }, [currentStepIndex]);

  const handleReplay = () => {
    setIsRestarting(true);
    setIsCompleted(false);
    setCurrentStepIndex(0);
    setTimeout(() => setIsRestarting(false), 100);
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-12 bg-white rounded-3xl sm:rounded-[36px] border border-black/10 shadow-xl overflow-hidden">
      {/* Top Console Bar */}
      <div className="bg-[#00261D] text-white px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
          </div>
          <span className="text-xs font-mono tracking-wider text-[#BBEAD5] uppercase">
            Friday Core Intelligence Engine • v2.4 Live Session
          </span>
        </div>
        <button
          onClick={handleReplay}
          className="text-[11px] font-bold uppercase tracking-wider text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          Replay AI Thinking ↺
        </button>
      </div>

      <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-[#F8FAF6]">
        {/* Left Column: Natural Language Input & Thinking Stream */}
        <div className="lg:col-span-6 space-y-6">
          {/* User Chat Bubble */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#717975] block">Traveler Prompt</span>
            <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs inline-block max-w-md">
              <p className="text-sm font-semibold text-[#00261D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                “Mere paas 50k budget hai aur Northern Areas jana hai.”
              </p>
            </div>
          </div>

          {/* Friday AI Processing Stream */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
              <span>Multi-Source Reasoning Steps</span>
            </span>

            <div className="space-y-2">
              {STEPS.map((step, idx) => {
                const isStepActive = currentStepIndex === idx;
                const isStepDone = currentStepIndex > idx;

                if (currentStepIndex < idx) return null;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                      isStepActive
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-medium shadow-2xs'
                        : isStepDone
                        ? 'bg-white border-black/5 text-[#00261D]'
                        : 'opacity-40'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isStepDone ? (
                        <div className="w-4 h-4 rounded-full bg-[#00261D] text-[#BBEAD5] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="font-semibold">{step.text}</p>
                      {isStepDone && (
                        <p className="text-[11px] text-emerald-700 font-medium">✓ {step.detail}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Synthesized Itinerary Result Card */}
        <div className="lg:col-span-6">
          <AnimatePresence>
            {isCompleted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-3xl p-6 border border-emerald-900/20 shadow-xl space-y-5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-[#00261D] text-[#BBEAD5] text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                  AI Synthesized Itinerary
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    4 Days • 3 Nights
                  </span>
                  <h3
                    className="text-2xl sm:text-3xl font-normal text-[#00261D] italic leading-tight"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    Hunza Valley Autumn Expedition
                  </h3>
                  <p className="text-xs text-[#717975] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Islamabad &rarr; Karimabad, Altit Fort & Attabad Lake</span>
                  </p>
                </div>

                {/* Day-by-Day Highlight Mini-Timeline */}
                <div className="space-y-2 pt-2 border-t border-black/5 text-xs">
                  <div className="flex items-center gap-2 text-[#00261D]">
                    <span className="w-5 h-5 rounded-full bg-[#00261D]/10 font-bold text-[10px] flex items-center justify-center">1</span>
                    <span className="font-semibold">Islamabad to Naran via Hazara Motorway</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#00261D]">
                    <span className="w-5 h-5 rounded-full bg-[#00261D]/10 font-bold text-[10px] flex items-center justify-center">2</span>
                    <span className="font-semibold">Cross Babusar Pass &rarr; Sunset at Rakaposhi Viewpoint</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#00261D]">
                    <span className="w-5 h-5 rounded-full bg-[#00261D]/10 font-bold text-[10px] flex items-center justify-center">3</span>
                    <span className="font-semibold">Attabad Lake Boating & Historic Baltit Fort Exploration</span>
                  </div>
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                    <span className="text-[10px] uppercase font-bold text-[#717975] block">Calculated Total</span>
                    <span className="text-lg font-bold text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                      PKR 48,000
                    </span>
                    <span className="text-[10px] text-emerald-700 block font-medium">✓ Fits 50k budget</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                    <span className="text-[10px] uppercase font-bold text-[#717975] block">Verified Host</span>
                    <span className="text-xs font-bold text-[#00261D] flex items-center gap-1 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 inline" />
                      <span>Alpine Mountain Treks</span>
                    </span>
                    <span className="text-[10px] text-[#717975]">4.9 ★ (18 reviews)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link to="/plan-trip">
                    <button className="w-full py-3.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:scale-101 cursor-pointer">
                      <span>Customize in Friday Copilot</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[380px] rounded-3xl border border-dashed border-black/15 bg-white/50 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center animate-bounce">
                  <Compass className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[#00261D]">Friday Reasoning in Progress...</h4>
                <p className="text-xs text-[#717975] max-w-xs">
                  Connecting climate forecasts, topographical maps, local homestays & driver routes.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
