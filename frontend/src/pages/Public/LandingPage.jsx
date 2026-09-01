import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Compass,
  Sparkles,
  ShieldCheck,
  MapPin,
  Mountain,
  Users,
  CreditCard,
  MessageSquare,
  Navigation,
  CloudSun,
  DollarSign,
  CheckCircle2,
  Calendar,
  Send,
  Search,
} from 'lucide-react';
import TopographicCanvas from '../../components/3d/TopographicCanvas';
import PakistanMap3D from '../../components/3d/PakistanMap3D';
import WheelCarousel from '../../components/ui/WheelCarousel';
import LiveAiConversationDemo from '../../components/home/LiveAiConversationDemo';
import PixelCanvas from '../../components/ui/PixelCanvas';
import ImageTrail from '../../components/ui/ImageTrail';
import TextRepel from '../../components/ui/TextRepel';
import { useAuth } from '../../context/AuthContext';

const QUICK_PROMPTS = [
  'Mere paas weekend hai aur mountains jana hain...',
  '3-day family trip to Swat under 40k',
  'Skardu adventure with Shangrila & Deosai',
  'Fairy Meadows trekking for 2 friends',
];

const TRAVELER_PROBLEM_CARDS = [
  {
    id: 1,
    icon: Compass,
    title: 'Where to go?',
    desc: 'Endless Instagram reels and conflicting blog posts leave you guessing which spots are actually worth visiting.',
    footnote: 'Destination Clarity',
  },
  {
    id: 2,
    icon: Navigation,
    title: "What's the route?",
    desc: 'Juggling mountain pass openings, road advisories, and driving times across multiple maps and search tabs.',
    footnote: 'Autonomous Routing',
  },
  {
    id: 3,
    icon: DollarSign,
    title: 'How much will it cost?',
    desc: 'Manually calculating 4x4 jeep hire, fuel, hotel rooms, and per-person splits on messy spreadsheet notes.',
    footnote: 'PKR Cost Engine',
  },
  {
    id: 4,
    icon: MessageSquare,
    title: 'Where are the details?',
    desc: 'Important trip notes, itinerary days, and payment confirmations get lost in endless WhatsApp messages.',
    footnote: 'Unified Workspace',
  },
];

const ARCHITECTURE_STAGES = [
  {
    stage: '01',
    stageTag: 'STAGE 01 • ASK',
    title: 'Natural Prompting',
    label: '01 • Natural Ask',
    category: 'Natural Language Intention',
    desc: 'Describe your destination, group count, vehicle preference, and PKR budget in everyday conversational English or Urdu.',
    footnote: 'Multimodal AI Reasoner',
    icon: Sparkles,
    highlights: [
      'Multi-day reasoning engine',
      'Urdu & English prompt parsing',
      'Group size & budget boundary limits',
      'Vehicle suitability checks (4x4 vs Sedan)',
    ],
  },
  {
    stage: '02',
    stageTag: 'STAGE 02 • RESEARCH',
    title: 'Climate & Pass Intelligence',
    label: '02 • Climate Intel',
    category: 'Live Pass & Weather Scanner',
    desc: 'Autonomous cross-referencing of high-altitude mountain pass conditions, seasonal snow advisories, and Babusar road timings.',
    footnote: 'Real-time Pass Monitoring',
    icon: Compass,
    highlights: [
      'Babusar / Lowari pass opening status',
      'High-altitude temperature predictions',
      'Landslide & road blockage advisories',
      'Jeep track requirement indicators',
    ],
  },
  {
    stage: '03',
    stageTag: 'STAGE 03 • PLAN',
    title: 'Day-by-Day Structured Itinerary',
    label: '03 • Day Itinerary',
    category: 'Structured Stops & Maps',
    desc: 'Generates day-wise timing, scenic photography waypoints, stay recommendations, fuel estimates, and per-person cost splits.',
    footnote: 'Visual Routing Engine',
    icon: MapPin,
    highlights: [
      'Hour-by-hour driving schedules',
      'Curated scenic photo waypoints',
      'Authentic local cuisine suggestions',
      'Custom day reordering & live edits',
    ],
  },
  {
    stage: '04',
    stageTag: 'STAGE 04 • DISCOVER',
    title: 'Verified Operator Marketplace',
    label: '04 • Discover Trips',
    category: 'Verified Grassroots Tours',
    desc: 'Connect with certified mountain guides and grassroots expedition operators offering transparent fixed-date packages.',
    footnote: '0% Middleman Platform',
    icon: ShieldCheck,
    highlights: [
      'Verified tour operator profiles',
      'Seat capacity & manifest tracking',
      'Transparent PKR inclusions & pricing',
      '100% direct host payments',
    ],
  },
  {
    stage: '05',
    stageTag: 'STAGE 05 • CONNECT',
    title: 'Dedicated Trip Group Hub',
    label: '05 • Dedicated Group',
    category: 'Co-travelers & WhatsApp Sync',
    desc: 'Keep all companions in one dedicated workspace with automated WhatsApp briefings, shared packing lists, and departure alerts.',
    footnote: 'Unified Trip Hub',
    icon: Users,
    highlights: [
      'Centralized departure briefings',
      'Automated WhatsApp sync',
      'Shared packing checklist generator',
      'Real-time organizer announcements',
    ],
  },
  {
    stage: '06',
    stageTag: 'STAGE 06 • BOOK',
    title: 'Direct 0% Commission Booking',
    label: '06 • Direct Booking',
    category: 'Transparent PKR Settlements',
    desc: 'Secure your seats with direct bank transfers, automated payment slip verification, and zero hidden platform cuts.',
    footnote: '0% Commission Guarantee',
    icon: CreditCard,
    highlights: [
      'Direct-to-host bank transfer',
      'Instant slip upload & review',
      'Automated payment confirmations',
      '100% money goes to local economy',
    ],
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Tell Friday what you want',
    desc: 'Describe your desired vibe, group count, and budget in plain English or Urdu.',
    footnote: 'Natural Prompting',
  },
  {
    step: '02',
    title: 'Friday researches possibilities',
    desc: 'AI cross-references live weather, mountain routes, vehicle requirements, and photo spots.',
    footnote: 'Live Pass Intel',
  },
  {
    step: '03',
    title: 'Your itinerary takes shape',
    desc: 'Review structured day-wise activities, map waypoints, stay suggestions, and budget splits.',
    footnote: 'Interactive Day Plan',
  },
  {
    step: '04',
    title: 'Connect with opportunities',
    desc: 'Discover verified local tour packages or invite companions with automated WhatsApp briefings.',
    footnote: 'Co-traveler Hub',
  },
  {
    step: '05',
    title: 'Turn plan into real journey',
    desc: 'Direct 100% transparent payment to local hosts with zero middleman fees.',
    footnote: '0% Commission Booking',
  },
];

export default function LandingPage() {
  const [userPrompt, setUserPrompt] = useState('');
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const handleStartPlanning = (e) => {
    e?.preventDefault();
    const query = userPrompt.trim();
    if (isAuthenticated) {
      if (role === 'ORGANIZER') {
        navigate('/organizer/dashboard');
      } else {
        navigate(query ? `/plan-trip?prompt=${encodeURIComponent(query)}` : '/plan-trip');
      }
    } else {
      navigate(query ? `/register?redirect=${encodeURIComponent(`/plan-trip?prompt=${encodeURIComponent(query)}`)}` : '/register?redirect=/plan-trip');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAF6] text-[#191C1A] overflow-x-hidden selection:bg-[#BBEAD5] selection:text-[#00261D]">
      {/* ════════════════════════════════════════════════════════════════════
          1. CINEMATIC HERO SECTION (2-Column Left Content + Right Pakistan Map)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full min-h-[calc(100vh-72px)] flex items-center justify-center py-12 sm:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Crisp Topographic Mesh Canvas */}
        <TopographicCanvas variant="hero" className="opacity-70" />

        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] rounded-full bg-[#BBEAD5]/35 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Left-Aligned Editorial Headline, Input & CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6 sm:space-y-7">
              {/* Top Brand Pill */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-black/10 shadow-2xs text-[#00261D]"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  FRIDAY® • YOUR TRIP. ONE WORKSPACE.
                </span>
              </motion.div>

              {/* Main Cinematic Editorial Headline with TextRepel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <TextRepel
                  text="Where do you want to go?"
                  as="h1"
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-[#00261D] font-normal italic tracking-tight leading-[1.05]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                  force={35}
                  radius={85}
                />
              </motion.div>

              {/* Supporting Copy */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-base sm:text-lg text-[#555E59] max-w-xl leading-relaxed"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Instead of juggling Instagram reels, Google Maps, notes, calculators, and scattered WhatsApp chats — Friday brings your trip planning, itinerary, budget, group, and bookings into one dedicated workspace.
              </motion.p>

              {/* Interactive Conversational AI Input Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="w-full max-w-xl bg-white/95 backdrop-blur-md rounded-3xl p-3 sm:p-4 border border-black/10 shadow-xl space-y-3"
              >
                <form onSubmit={handleStartPlanning} className="flex flex-col sm:flex-row items-center gap-2.5">
                  <div className="relative flex-1 w-full flex items-center">
                    <Search className="w-4 h-4 text-[#717975] absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="“Mere paas weekend hai aur mountains jana hain...”"
                      className="w-full pl-10 pr-3 py-3 rounded-2xl bg-[#F8FAF6] border border-black/5 text-xs sm:text-sm text-[#00261D] placeholder-[#717975] focus:outline-none focus:ring-2 focus:ring-[#00261D]/20 transition-all font-medium"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-102 cursor-pointer shrink-0"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <span>Start Planning</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Quick Prompt Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-left scrollbar-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] shrink-0">
                    Try:
                  </span>
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setUserPrompt(prompt)}
                      className="px-2.5 py-1 rounded-full bg-[#F3F4F0] hover:bg-[#E7E9E5] text-[#00261D] text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer border border-black/5 shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Primary & Secondary CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3.5 items-center pt-1"
              >
                <Link to="/plan-trip">
                  <button
                    className="px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#00261D] text-white hover:bg-[#00261D]/90 transition-all shadow-lg hover:scale-105 cursor-pointer flex items-center gap-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <Sparkles className="w-4 h-4 text-[#BBEAD5]" />
                    <span>Plan Your Trip</span>
                  </button>
                </Link>

                <Link to="/explore">
                  <button
                    className="px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-[#00261D] border border-black/15 hover:bg-slate-50 transition-all shadow-xs hover:scale-105 cursor-pointer flex items-center gap-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <Compass className="w-4 h-4 text-[#00261D]" />
                    <span>Explore Trips</span>
                  </button>
                </Link>
              </motion.div>
            </div>

            {/* Right Column: 3D Interactive Pakistan Map Visual */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <PakistanMap3D variant="home" />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          2A. THE TRAVELER REALITY (IMAGE TRAIL MOUSE INTERPOLATION)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full min-h-[580px] sm:min-h-[660px] flex items-center justify-center bg-[#00261D] text-white overflow-hidden border-t border-black/10 select-none">
        {/* Interactive Pixel Grid Canvas Background */}
        <PixelCanvas colors={['#BBEAD5', '#10B981', '#34D399', '#059669']} speed={0.04} variant="glow" />

        {/* Centered Typography Overlay with TextRepel */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none p-6 text-center space-y-4 max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-[0.25em] font-extrabold text-[#BBEAD5] block">
            // THE TRAVELER REALITY
          </span>
          <TextRepel
            text="Planning a trip shouldn't mean piecing it together from everywhere."
            as="h2"
            className="text-5xl sm:text-7xl md:text-8xl font-normal italic text-white tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
            force={35}
            radius={85}
          />
          <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            You ask friends for ideas. Search Instagram for places. Check maps, budgets and stays separately. Then the actual trip ends up living in a chaotic WhatsApp group.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#BBEAD5]/80 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hover & move mouse to reveal cards</span>
            </span>
          </div>
        </div>

        {/* Mouse Trail Component */}
        <ImageTrail
          items={TRAVELER_PROBLEM_CARDS}
          itemWidth={280}
          itemHeight={340}
          threshold={45}
          duration={1.6}
        />
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          2B. THE ORGANIZER REALITY (DEDICATED SECTION & BEFORE VS AFTER)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#042B21] text-white relative overflow-hidden border-t border-white/10">
        <TopographicCanvas variant="dark" className="opacity-30" />

        <div className="max-w-7xl mx-auto w-full relative z-10 space-y-16">
          {/* Organizer Problem Headline with TextRepel */}
          <div className="text-center max-w-4xl mx-auto space-y-4">
            <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#BBEAD5] block">
              // THE ORGANIZER REALITY
            </span>
            <TextRepel
              text="Organizing a trip shouldn't mean running it through WhatsApp."
              as="h2"
              className="text-4xl sm:text-6xl md:text-7xl font-normal text-white leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
              force={30}
              radius={80}
            />
            <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
              Local trip organizers often manage trip details, participant manifests, capacity limits, route briefings, and payment proofs across scattered chats and manual processes.
            </p>
          </div>

          {/* Transformation Comparison Board (BEFORE vs AFTER) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-black/40 backdrop-blur-xl p-8 sm:p-12 rounded-[36px] border border-white/15 shadow-2xl">
            {/* Left: BEFORE (Scattered) */}
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs uppercase font-extrabold tracking-widest text-red-400 bg-red-950/60 border border-red-800/40 px-3 py-1 rounded-full inline-block">
                BEFORE FRIDAY — SCATTERED
              </span>
              <ul className="space-y-3 text-sm text-white/75">
                <li className="flex items-center gap-2 line-through text-white/50">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Instagram reels & random travel advice
                </li>
                <li className="flex items-center gap-2 line-through text-white/50">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Disjointed Google Maps & route guesswork
                </li>
                <li className="flex items-center gap-2 line-through text-white/50">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Manual Excel spreadsheets for budget splits
                </li>
                <li className="flex items-center gap-2 line-through text-white/50">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Unorganized WhatsApp groups with lost receipts
                </li>
              </ul>
            </div>

            {/* Center Divider Arrow */}
            <div className="lg:col-span-2 flex justify-center">
              <div className="w-12 h-12 rounded-full bg-[#BBEAD5] text-[#00261D] flex items-center justify-center font-bold shadow-lg">
                &rarr;
              </div>
            </div>

            {/* Right: AFTER (One Trip Workspace) */}
            <div className="lg:col-span-5 space-y-5 bg-white text-[#00261D] p-6 sm:p-8 rounded-3xl border border-white/20 shadow-xl">
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                WITH FRIDAY — YOUR TRIP. ONE WORKSPACE.
              </span>
              <ul className="space-y-3 text-sm font-semibold text-[#00261D]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  AI Trip Planning & Day-by-Day Itinerary
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Live PKR Budget Intelligence & Cost Splits
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Dedicated Trip Group & Live Member Hub
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Direct Verified Host Booking & 0% Commission
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          3. HOME — SOLUTION & 6-STAGE WHEEL CAROUSEL
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-[#F0F2ED] border-y border-black/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-900 block">
              The Friday Architecture
            </span>
            <TextRepel
              text="One conversation. The whole journey."
              as="h2"
              className="text-4xl sm:text-6xl md:text-7xl font-normal text-[#00261D] leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
              force={25}
              radius={75}
            />
            <p className="text-base sm:text-lg text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Friday acts as your central trip hub—taking natural conversation and translating it into route maps, budget calculations, weather warnings, and direct host bookings.
            </p>
          </div>

          {/* Rotating 6-Stage Wheel Carousel with Inertial Drag & Curved Labels */}
          <WheelCarousel items={ARCHITECTURE_STAGES} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          4. HOME — REALISTIC AI EXPERIENCE
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#717975] block">
            Live AI Simulation
          </span>
          <TextRepel
            text="Friday doesn't just answer. It figures things out."
            as="h2"
            className="text-4xl sm:text-6xl md:text-7xl font-normal text-[#00261D] leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
            force={25}
            radius={75}
          />
          <p className="text-base sm:text-lg text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            Watch Friday synthesize real Pakistan road geography, seasonal weather forecasts, local stays, and group budgets in real-time.
          </p>
        </div>

        {/* Live Friday Thinking Console Demo */}
        <LiveAiConversationDemo />
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          5. HOME — HOW IT WORKS (IMAGE TRAIL MOUSE INTERPOLATION)
      ════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative w-full min-h-[580px] sm:min-h-[660px] flex items-center justify-center bg-[#00261D] text-white overflow-hidden border-t border-black/10 select-none">
        {/* Interactive Pixel Canvas Grid */}
        <PixelCanvas colors={['#BBEAD5', '#10B981', '#34D399', '#059669']} speed={0.04} variant="glow" />

        {/* Centered Typography Overlay with TextRepel */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none p-6 text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#BBEAD5] block">
            // HOW IT WORKS
          </span>
          <TextRepel
            text="How It Works"
            as="h2"
            className="text-5xl sm:text-7xl md:text-8xl font-normal text-white leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
            force={35}
            radius={85}
          />
          <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            From initial spark to summit sunset, Friday streamlines every layer of your trip journey.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#BBEAD5]/80 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hover & move mouse to reveal the 5 steps</span>
            </span>
          </div>
        </div>

        {/* Mouse Trail Component */}
        <ImageTrail
          items={HOW_IT_WORKS_STEPS}
          itemWidth={280}
          itemHeight={340}
          threshold={45}
          duration={1.6}
        />
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          6. HOME — FINAL CTA
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
        <span className="text-xs uppercase tracking-[0.3em] font-bold text-emerald-800 block">
          READY FOR YOUR NEXT ESCAPE?
        </span>
        <TextRepel
          text="Your next journey starts with a simple conversation."
          as="h2"
          className="text-4xl sm:text-6xl md:text-7xl font-normal text-[#00261D] italic leading-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
          force={25}
          radius={75}
        />
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/plan-trip">
            <button
              className="px-9 py-4 rounded-full text-xs font-bold uppercase tracking-widest bg-[#00261D] text-white hover:bg-[#00261D]/90 transition-all shadow-xl hover:scale-105 cursor-pointer flex items-center gap-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Sparkles className="w-4 h-4 text-[#BBEAD5]" />
              <span>Plan Your Trip with Friday →</span>
            </button>
          </Link>
          <Link to="/explore">
            <button
              className="px-9 py-4 rounded-full text-xs font-bold uppercase tracking-widest bg-white text-[#00261D] border border-black/15 hover:bg-slate-50 transition-all shadow-xs hover:scale-105 cursor-pointer"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <span>Explore Marketplace</span>
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
