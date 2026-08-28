import { Link } from 'react-router-dom';
import { ArrowRight, Compass, ShieldCheck, Sparkles, HeartHandshake, CheckCircle2, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-24 pb-24 text-[#191C1A]">
      {/* ─── Hero Section (Stitch 16_about_friday.html) ────────────────── */}
      <section className="relative w-full h-[580px] flex items-center justify-center overflow-hidden bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-75"
          style={{
            backgroundImage: `url('/images/stitch/hero_mountains.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto space-y-6 text-white">
          <p
            className="text-xs uppercase tracking-[0.3em] font-semibold text-[#FFDBD0]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            FRIDAY® / ETHOS & VISION
          </p>

          <h1
            className="text-5xl sm:text-7xl font-normal leading-tight italic"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Pakistan is bigger than a destination.
          </h1>

          <p className="text-base sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            An invitation to explore the raw beauty and untold stories of a land woven with history, culture, and untamed nature.
          </p>
        </div>
      </section>

      {/* ─── Asymmetric Editorial Section (Stitch 16_about_friday.html) ── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5 space-y-6">
            <span className="text-xs uppercase tracking-widest font-bold text-[#420E00] block">
              OUR MISSION
            </span>
            <h2
              className="text-4xl sm:text-5xl font-normal text-black leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Redefining the Journey.
            </h2>
            <p className="text-sm text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Friday® was born from a desire to move beyond the superficial checklist of travel. We believe in curated immersion—connecting travelers with the soul of Pakistan through intelligent AI itineraries and verified local expedition leaders.
            </p>
            <p className="text-sm text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Every rupee paid goes directly to your verified local organizer, creating an ethical, sustainable ecosystem for northern tourism.
            </p>

            <Link
              to="/explore"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black border-b border-black pb-1 hover:text-[#420E00] hover:border-[#420E00] transition-colors pt-2"
            >
              Explore our journeys <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="md:col-span-7 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-black/10">
              <img
                src="/images/stitch/discover_village.jpg"
                alt="Local community in Hunza Valley"
                className="w-full h-[460px] object-cover"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl hidden sm:block max-w-xs border border-black/10">
                <p className="text-lg italic text-black leading-snug" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  "True luxury is found in genuine human connection."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How Friday Works ─────────────────────────────────────────── */}
      <section className="bg-[#F0F2ED] py-20 border-y border-black/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-4xl sm:text-5xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              How Friday Works
            </h2>
            <p className="text-xs sm:text-sm text-[#6F6F6F]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Built at the intersection of generative AI and local grassroots expedition hosting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-black/10 space-y-4 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
                AI Trip Architect
              </h3>
              <p className="text-xs text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                State-of-the-art multimodal AI plans day-by-day travel routes, predicts real-time mountain weather, and tracks group expenses.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-black/10 space-y-4 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Verified Local Hosts
              </h3>
              <p className="text-xs text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                All tour organizers undergo manual identity, transport, and safety protocol verification before publishing expeditions.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-black/10 space-y-4 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Direct Fair Settlement
              </h3>
              <p className="text-xs text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Zero middleman commissions. Travelers pay organizers directly through official verified bank and mobile accounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Transparent Pricing Section (id="pricing") ───────────────── */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs uppercase tracking-widest font-bold text-[#420E00]">
            TRANSPARENT ECONOMY
          </span>
          <h2 className="text-4xl sm:text-5xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Simple, Transparent Pricing
          </h2>
          <p className="text-xs sm:text-sm text-[#6F6F6F]" style={{ fontFamily: 'Inter, sans-serif' }}>
            We believe in honest technology that supports travelers and empowers local businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Traveler Tier */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-black/10 space-y-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <h3 className="text-3xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  For Travelers
                </h3>
                <span className="text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Free
                </span>
              </div>
              <p className="text-xs text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Complete access to AI trip copilot, curated marketplace, and group trip management.
              </p>
              <ul className="space-y-3 text-xs text-[#191C1A] pt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Unlimited AI Trip Itinerary Planning</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Direct Organizer Booking with 0% Platform Fee</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real-time Weather & Road Safety Alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Shared Expense Tracking & WhatsApp Integration</span>
                </li>
              </ul>
            </div>

            <Link to="/explore" className="block pt-4">
              <button className="w-full py-3.5 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-transform hover:scale-105 cursor-pointer shadow-md">
                Start Exploring Free
              </button>
            </Link>
          </div>

          {/* Organizer Tier */}
          <div className="bg-[#00261D] text-white rounded-3xl p-8 sm:p-10 border border-black/10 space-y-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <h3 className="text-3xl font-normal text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  For Tour Operators
                </h3>
                <span className="text-3xl font-normal text-[#FFDBD0]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  0% Commission
                </span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Publish unlimited packages, receive direct bank transfers, and verify bookings seamlessly.
              </p>
              <ul className="space-y-3 text-xs text-white/90 pt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Publish Unlimited Curated Tour Packages</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% Direct Payments into Your Bank / Easypaisa</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Interactive Organizer Dashboard & Payment Proofs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automated WhatsApp & Email Notifications</span>
                </li>
              </ul>
            </div>

            <Link to="/register?role=ORGANIZER" className="block pt-4">
              <button className="w-full py-3.5 rounded-full bg-white text-[#00261D] text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-transform hover:scale-105 cursor-pointer shadow-md">
                Register as Host
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ──────────────────────────────────────────────── */}
      <section className="text-center max-w-3xl mx-auto px-6 space-y-6 pt-12">
        <h2 className="text-4xl sm:text-5xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Ready to experience the mountains?
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Link to="/explore">
            <button className="px-8 py-3.5 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-transform hover:scale-105 shadow-md cursor-pointer">
              Discover Journeys
            </button>
          </Link>
          <Link to="/register?role=ORGANIZER">
            <button className="px-8 py-3.5 rounded-full border border-black/20 text-black text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-transform hover:scale-105 cursor-pointer">
              Become an Organizer
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
