import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users,
  Compass,
  Zap,
  HelpCircle,
} from 'lucide-react';
import TopographicCanvas from '../../components/3d/TopographicCanvas';
import PakistanMap3D from '../../components/3d/PakistanMap3D';
import TextRepel from '../../components/ui/TextRepel';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const { isAuthenticated, role, backendUser } = useAuth();
  const navigate = useNavigate();

  const isYearly = billingCycle === 'yearly';
  const travelerPrice = isYearly ? 2399 : 2999;
  const organizerPrice = isYearly ? 6000 : 7500;

  const handlePlanSelect = (planType) => {
    if (!isAuthenticated) {
      navigate(`/register?redirect=/pricing`);
      return;
    }
    toast.success(`Selected ${planType} plan. Redirecting to workspace...`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAF6] text-[#191C1A] overflow-x-hidden selection:bg-[#BBEAD5] selection:text-[#00261D]">
      {/* ════════════════════════════════════════════════════════════════════
          1. PRICING HERO (2-Column Left Content + Right Pakistan Map)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <TopographicCanvas variant="hero" className="opacity-70" />
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] rounded-full bg-[#BBEAD5]/35 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Left-Aligned Editorial Headline & Billing Switcher */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-black/10 shadow-2xs text-[#00261D]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">
                  FRIDAY® • TRANSPARENT PRICING
                </span>
              </div>

              <TextRepel
                text="Choose how you travel."
                as="h1"
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal italic text-[#00261D] tracking-tight leading-[1.05]"
                style={{ fontFamily: "'Instrument Serif', serif" }}
                force={35}
                radius={85}
              />

              <p className="text-base sm:text-xl text-[#555E59] max-w-xl leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Start free. Upgrade as your trips and tour groups grow across Pakistan.
              </p>

              {/* Billing Cycle Switcher */}
              <div className="pt-2 flex items-center gap-3">
                <div className="bg-[#E7E9E5] p-1 rounded-full flex items-center border border-black/5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      !isYearly
                        ? 'bg-[#00261D] text-white shadow-xs'
                        : 'text-[#555E59] hover:text-black'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      isYearly
                        ? 'bg-[#00261D] text-white shadow-xs'
                        : 'text-[#555E59] hover:text-black'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="text-[10px] font-extrabold bg-[#BBEAD5] text-[#00261D] px-2 py-0.5 rounded-full">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Pakistan Map */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <PakistanMap3D variant="pricing" />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          2. PRICING 3-CARD GRID: PLAN 00 (FREE) • PLAN 01 (TRAVELER) • PLAN 02 (ORGANIZER)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* ── PLAN 00: FREE STARTER ── */}
          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl sm:rounded-[36px] p-7 sm:p-9 border border-black/10 shadow-lg flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#717975] bg-[#F8FAF6] px-3 py-1 rounded-full border border-black/5">
                  Plan 00 • Starter
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  Free Forever
                </span>
              </div>

              <div>
                <h3 className="text-3xl font-normal text-[#00261D] italic" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Free Starter Plan
                </h3>
                <p className="text-xs text-[#717975] mt-1">
                  Perfect for first-time trip planners and testing Friday's intelligence.
                </p>
              </div>

              {/* Price Tag */}
              <div className="pt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Rs. 0
                  </span>
                  <span className="text-xs text-[#717975] font-semibold">/ lifetime</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-3 pt-4 border-t border-black/5 text-xs text-[#00261D]">
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>2 Full Trips</strong> (Traveler lifetime allowance)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>1 Active Tour Package</strong> (Organizer allowance)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>Conversational AI trip planning & research</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>Day-by-day itineraries & budget splits</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>Seamless role switching between traveler & organizer</span>
                </div>
              </div>
            </div>

            <Link to="/plan-trip" className="block">
              <button
                className="w-full py-3.5 rounded-full bg-[#F3F4F0] hover:bg-[#E7E9E5] text-[#00261D] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </motion.div>

          {/* ── PLAN 01: TRAVELER SUBSCRIPTION ── */}
          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl sm:rounded-[36px] p-7 sm:p-9 border border-emerald-800/20 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden ring-1 ring-emerald-800/10"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-900 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-800/10">
                  Plan 01 • Traveler
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  5 Trips / Month
                </span>
              </div>

              <div>
                <h3 className="text-3xl font-normal text-[#00261D] italic" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Traveler Pro
                </h3>
                <p className="text-xs text-[#717975] mt-1">
                  For frequent explorers, friends & family trips across Pakistan.
                </p>
              </div>

              {/* Price Tag */}
              <div className="pt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Rs. {travelerPrice.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#717975] font-semibold">/ month</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-3 pt-4 border-t border-black/5 text-xs text-[#00261D]">
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>5 Full Custom Trips</strong> every month</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>AI Trip Planner:</strong> multi-stage reasoning & routing</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>Personalized day itineraries</strong> with map waypoints</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>Live Mountain Climate alerts</strong> & road condition scanner</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>1-Click Community Trip Cloning</strong> & sharing</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePlanSelect('Traveler')}
              className="w-full py-3.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:scale-101 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Upgrade to Traveler</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>

          {/* ── PLAN 02: ORGANIZER SUBSCRIPTION ── */}
          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.3 }}
            className="bg-[#00261D] text-white rounded-3xl sm:rounded-[36px] p-7 sm:p-9 border border-[#BBEAD5]/30 shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            {/* Top Accent Gradient Ribbon */}
            <div className="absolute top-0 right-0 bg-[#BBEAD5] text-[#00261D] text-[10px] font-extrabold px-3.5 py-1 rounded-bl-2xl uppercase tracking-widest shadow-sm">
              Featured For Operators
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#BBEAD5] bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  Plan 02 • Organizer
                </span>
                <span className="text-xs font-bold text-[#BBEAD5]">
                  10 Packages / Month
                </span>
              </div>

              <div>
                <h3 className="text-3xl font-normal text-white italic" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Organizer Pro
                </h3>
                <p className="text-xs text-white/70 mt-1">
                  For tour companies, mountain guides & grassroots organizers.
                </p>
              </div>

              {/* Price Tag */}
              <div className="pt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-normal text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Rs. {organizerPrice.toLocaleString()}
                  </span>
                  <span className="text-xs text-white/70 font-semibold">/ month</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-white/90">
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#BBEAD5] text-[#00261D] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>Up to 10 Active Tour Packages</strong> per month</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#BBEAD5] text-[#00261D] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>0% Commission Guarantee:</strong> 100% direct payments</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#BBEAD5] text-[#00261D] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>Passenger Manifest & Capacity:</strong> seat management</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#BBEAD5] text-[#00261D] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>Direct Payment Slip Verification:</strong> instant approval</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#BBEAD5] text-[#00261D] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span><strong>Dedicated Trip Groups:</strong> with automated WhatsApp alerts</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePlanSelect('Organizer')}
              className="w-full py-3.5 rounded-full bg-[#BBEAD5] hover:bg-white text-[#00261D] text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:scale-101 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Upgrade to Organizer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          3. FEATURE COMPARISON MATRIX TABLE
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-800 block">
            Transparent Breakdown
          </span>
          <TextRepel
            text="Compare Free vs Subscriptions"
            as="h2"
            className="text-3xl sm:text-5xl font-normal text-[#00261D] leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
            force={25}
            radius={75}
          />
        </div>

        <div className="bg-white rounded-3xl border border-black/10 shadow-lg overflow-hidden">
          <div className="grid grid-cols-4 p-5 bg-[#F8FAF6] border-b border-black/10 text-xs font-bold uppercase tracking-wider text-[#00261D]">
            <div className="col-span-1">Platform Capability</div>
            <div className="text-center">Free Starter</div>
            <div className="text-center">Traveler Pro</div>
            <div className="text-center">Organizer Pro</div>
          </div>

          <div className="divide-y divide-black/5 text-xs">
            <div className="grid grid-cols-4 p-4 items-center">
              <div className="font-semibold text-[#00261D]">Custom Trips Allowed</div>
              <div className="text-center text-[#717975]">2 Lifetime</div>
              <div className="text-center font-bold text-emerald-800">5 / Month</div>
              <div className="text-center text-[#717975]">Unlimited</div>
            </div>

            <div className="grid grid-cols-4 p-4 items-center bg-[#F8FAF6]/50">
              <div className="font-semibold text-[#00261D]">Marketplace Packages</div>
              <div className="text-center text-[#717975]">1 Package</div>
              <div className="text-center text-[#717975]">—</div>
              <div className="text-center font-bold text-emerald-800">Up to 10 / Month</div>
            </div>

            <div className="grid grid-cols-4 p-4 items-center">
              <div className="font-semibold text-[#00261D]">Platform Booking Fee</div>
              <div className="text-center font-bold text-emerald-800">0% Commission</div>
              <div className="text-center font-bold text-emerald-800">0% Commission</div>
              <div className="text-center font-bold text-emerald-800">0% Commission</div>
            </div>

            <div className="grid grid-cols-4 p-4 items-center bg-[#F8FAF6]/50">
              <div className="font-semibold text-[#00261D]">AI Trip Planning Engine</div>
              <div className="text-center">Included</div>
              <div className="text-center font-bold text-emerald-800">Full Priority</div>
              <div className="text-center font-bold text-emerald-800">Full Priority</div>
            </div>

            <div className="grid grid-cols-4 p-4 items-center">
              <div className="font-semibold text-[#00261D]">Dedicated Trip Group Chat</div>
              <div className="text-center">Included</div>
              <div className="text-center">Included</div>
              <div className="text-center font-bold text-emerald-800">Priority Hub</div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          4. PRICING FINAL CTA (Pure White Text Verified)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32 bg-[#00261D] text-white px-4 sm:px-6 lg:px-8 overflow-hidden text-center">
        <TopographicCanvas variant="dark" className="opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <span className="text-xs uppercase tracking-[0.3em] font-bold text-[#BBEAD5] block">
            ELEVATE YOUR HORIZONS
          </span>

          <TextRepel
            text="Ready to plan more?"
            as="h2"
            className="text-5xl sm:text-7xl md:text-8xl font-normal italic text-white leading-[1.05]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
            force={30}
            radius={80}
          />

          <p className="text-base sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            Whether you're planning your next escape or organizing the next big expedition, Friday grows with you.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/plan-trip">
              <button
                className="px-9 py-4 rounded-full text-xs font-bold uppercase tracking-widest bg-[#BBEAD5] text-[#00261D] hover:bg-white transition-all shadow-2xl hover:scale-105 cursor-pointer flex items-center gap-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span>Start Planning →</span>
              </button>
            </Link>

            <Link to="/explore">
              <button
                className="px-9 py-4 rounded-full text-xs font-bold uppercase tracking-widest bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all shadow-lg hover:scale-105 cursor-pointer"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span>Explore Trips</span>
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
