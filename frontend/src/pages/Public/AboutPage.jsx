import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Compass,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  MapPin,
  Mountain,
  Users,
  CreditCard,
  MessageSquare,
  Send,
  CheckCircle2,
  Phone,
  Mail,
  Navigation,
  DollarSign,
  Layers,
} from 'lucide-react';
import TopographicCanvas from '../../components/3d/TopographicCanvas';
import PakistanMap3D from '../../components/3d/PakistanMap3D';
import PixelCanvas from '../../components/ui/PixelCanvas';
import ImageTrail from '../../components/ui/ImageTrail';
import TextRepel from '../../components/ui/TextRepel';
import toast from 'react-hot-toast';

const WHAT_FRIDAY_DOES = [
  {
    title: 'AI Trip Planning',
    desc: 'Describe what you want in natural words. Friday structures day-wise stops, mountain drive hours, and local recommendations.',
    icon: Sparkles,
    footnote: 'Multi-day Reasoning',
  },
  {
    title: 'Climate & Pass Research',
    desc: 'Live mountain pass status, Babusar road timings, altitude weather alerts, and 4x4 jeep track constraints.',
    icon: Compass,
    footnote: 'Live Road Intel',
  },
  {
    title: 'Day-by-Day Itinerary',
    desc: 'Structured day-wise stops, scenic photography waypoints, and recommended authentic local food specialties.',
    icon: MapPin,
    footnote: 'Route Map Pins',
  },
  {
    title: 'Budget Intelligence',
    desc: 'Automatic per-person split calculator, jeep hire estimates, and transparent PKR cost breakdowns.',
    icon: CreditCard,
    footnote: 'PKR Splitter',
  },
  {
    title: 'Verified Organizers',
    desc: 'All expedition leaders undergo identity, vehicle, and route safety protocol verification with 0% commission.',
    icon: ShieldCheck,
    footnote: 'Verified Hosts',
  },
  {
    title: 'Private Group Chats',
    desc: 'Dedicated communication hub for travelers and organizers with automatic WhatsApp briefings.',
    icon: MessageSquare,
    footnote: 'WhatsApp Sync',
  },
];

const PAKISTAN_DESTINATIONS = [
  {
    title: 'Karakoram & Alpine Peaks',
    desc: 'Hunza, Skardu, Fairy Meadows, K2 Basecamp & Rakaposhi views.',
    image: '/images/stitch/hero_mountains.jpg',
  },
  {
    title: 'Lush Valleys & Meadows',
    desc: 'Swat, Kumrat, Neelum Valley, Kaghan & Shogran alpine forests.',
    image: '/images/stitch/discover_village.jpg',
  },
  {
    title: 'Coastal Wonders & Deserts',
    desc: 'Makran Coastal Highway, Gwadar, Ormara & Cholistan dunes.',
    image: '/images/stitch/plan_mobile.jpg',
  },
];

export default function AboutPage() {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error('Please fill in your name, email, and message.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Thank you! Your message has been dispatched to the Friday team.');
      setContactForm({ name: '', email: '', subject: '', message: '' });
    }, 600);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAF6] text-[#191C1A] overflow-x-hidden selection:bg-[#BBEAD5] selection:text-[#00261D]">
      {/* ════════════════════════════════════════════════════════════════════
          1. ABOUT HERO (2-Column Left Content + Right Pakistan Map)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <TopographicCanvas variant="hero" className="opacity-70" />
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] rounded-full bg-[#BBEAD5]/35 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Left-Aligned Editorial Headline & CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-black/10 shadow-2xs text-[#00261D]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">
                  FRIDAY® • ETHOS & ORIGIN
                </span>
              </div>

              <TextRepel
                text="A trip should have a home."
                as="h1"
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal italic text-[#00261D] tracking-tight leading-[1.05]"
                style={{ fontFamily: "'Instrument Serif', serif" }}
                force={35}
                radius={85}
              />

              <p className="text-base sm:text-xl text-[#555E59] max-w-xl leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                A trip usually starts with a simple idea: “Let’s go somewhere this weekend.” Then the questions begin. Friday was built to bring the entire trip into one workspace.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3.5 items-center">
                <Link to="/plan-trip">
                  <button
                    className="px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#00261D] text-white hover:bg-[#00261D]/90 transition-all shadow-md hover:scale-102 cursor-pointer flex items-center gap-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <Sparkles className="w-4 h-4 text-[#BBEAD5]" />
                    <span>Plan Your Trip</span>
                  </button>
                </Link>
                <a href="#contact">
                  <button
                    className="px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-[#00261D] border border-black/15 hover:bg-slate-50 transition-all shadow-xs hover:scale-102 cursor-pointer"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Get In Touch →
                  </button>
                </a>
              </div>
            </div>

            {/* Right Column: 3D Pakistan Map */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <PakistanMap3D variant="about" />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          2. THE STORY — HOW A TRIP ACTUALLY HAPPENS
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-800 block">
              The Origin Story
            </span>
            <TextRepel
              text="How a trip actually happens (and why it gets scattered)."
              as="h2"
              className="text-4xl sm:text-6xl font-normal text-[#00261D] leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
              force={25}
              radius={75}
            />
            <div className="space-y-4 text-base text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              <p>
                A trip begins simply. “Let’s head north next week.” But within hours, the chaos starts: Where should we go? Has anyone visited recently? What’s actually worth seeing? How much will it cost? What’s the road condition? Who is coming? Where do we keep all the details?
              </p>
              <p>
                Suddenly, planning gets scattered across Instagram bookmarks, Google Maps, notes apps, Excel budget calculators, and chaotic WhatsApp groups.
              </p>
              <p>
                For local trip organizers, it’s even harder: running full expeditions through scattered chat messages, manually answering repetitive questions, and tracking payment screenshots on spreadsheets.
              </p>
              <p className="font-semibold text-[#00261D]">
                We built Friday so every trip has a single, dedicated home.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-black/10 bg-[#00261D]">
              <img
                src="/images/stitch/discover_village.jpg"
                alt="Local mountain valley community in Hunza"
                className="w-full h-[460px] object-cover opacity-90"
              />
              <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-black/10 shadow-lg space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 block">
                  The Friday Philosophy
                </span>
                <p className="text-xl italic text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  “One trip. One workspace. Everything connected.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          3. TWO SIDES OF FRIDAY (FOR TRAVELERS & FOR ORGANIZERS)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-[#F0F2ED] border-y border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-900 block">
              The Complete Ecosystem
            </span>
            <TextRepel
              text="Two sides. One dedicated workspace."
              as="h2"
              className="text-4xl sm:text-6xl font-normal text-[#00261D] leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
              force={25}
              radius={75}
            />
            <p className="text-base text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Whether you are planning a trip with friends or running a tour business across Pakistan.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Side A: For Travelers */}
            <div className="p-8 sm:p-10 rounded-[32px] bg-white border border-black/10 shadow-lg space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <Users className="w-4 h-4" />
                <span>For Travelers</span>
              </div>
              <h3 className="text-3xl font-normal text-[#00261D] italic" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Plan, understand and experience your trip.
              </h3>
              <ul className="space-y-4 text-sm text-[#555E59]">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#00261D] block">Conversational AI Planning</strong>
                    Describe your vibe and budget. Friday structures your stops and drive hours.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#00261D] block">Day-by-Day Itinerary & Budget</strong>
                    Know your exact fuel, 4x4 jeep, hotel, and per-person cost breakdown.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#00261D] block">Dedicated Trip Group</strong>
                    Keep all co-travelers, packing lists, and departure briefings in one hub.
                  </div>
                </li>
              </ul>
              <Link to="/plan-trip" className="block pt-2">
                <button className="w-full py-3.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#00261D]/90 transition-all cursor-pointer">
                  Plan a Trip Now →
                </button>
              </Link>
            </div>

            {/* Side B: For Organizers */}
            <div className="p-8 sm:p-10 rounded-[32px] bg-[#00261D] text-white border border-black/10 shadow-xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#BBEAD5] font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>For Tour Organizers</span>
              </div>
              <h3 className="text-3xl font-normal text-white italic" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Run your entire trip with 0% commission.
              </h3>
              <ul className="space-y-4 text-sm text-white/80">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#BBEAD5] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Publish Tour Packages & Capacity</strong>
                    List dates, difficulty, seat limits, and inclusions on a public marketplace.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#BBEAD5] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Direct Payments & Slip Verification</strong>
                    Receive direct bank transfers with 0% platform cuts and instant slip review.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#BBEAD5] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Organized Group Hub</strong>
                    Send briefings and route alerts to travelers without cluttered WhatsApp threads.
                  </div>
                </li>
              </ul>
              <Link to="/pricing" className="block pt-2">
                <button className="w-full py-3.5 rounded-full bg-[#BBEAD5] text-[#00261D] text-xs font-bold uppercase tracking-wider hover:bg-white transition-all cursor-pointer">
                  View Organizer Plans →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          4. WHAT FRIDAY DOES (IMAGE TRAIL MOUSE INTERPOLATION)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full min-h-[580px] sm:min-h-[660px] flex items-center justify-center bg-[#00261D] text-white overflow-hidden border-t border-black/10 select-none">
        <PixelCanvas colors={['#BBEAD5', '#10B981', '#34D399', '#059669']} speed={0.04} variant="glow" />

        {/* Centered Typography Overlay with TextRepel */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none p-6 text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#BBEAD5] block">
            // PLATFORM CAPABILITIES
          </span>
          <TextRepel
            text="What Friday Does"
            as="h2"
            className="text-5xl sm:text-7xl md:text-8xl font-normal italic text-white leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
            force={35}
            radius={85}
          />
          <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            Everything your trip requires, engineered into one continuous workspace.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#BBEAD5]/80 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hover & move mouse to reveal capabilities</span>
            </span>
          </div>
        </div>

        {/* Mouse Trail Component */}
        <ImageTrail
          items={WHAT_FRIDAY_DOES}
          itemWidth={280}
          itemHeight={350}
          threshold={45}
          duration={1.6}
        />
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          5. PAKISTAN DIVERSITY SHOWCASE
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-white border-y border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-800 block">
              Land of Infinite Wonder
            </span>
            <TextRepel
              text="Discover the Real Pakistan"
              as="h2"
              className="text-4xl sm:text-6xl font-normal text-[#00261D] leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
              force={25}
              radius={75}
            />
            <p className="text-base text-[#555E59] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              From soaring 8,000-meter Karakoram spires to warm coastal shores of the Arabian Sea.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PAKISTAN_DESTINATIONS.map((dest, idx) => (
              <div key={idx} className="rounded-3xl overflow-hidden border border-black/10 bg-[#F8FAF6] shadow-xs group">
                <div className="relative h-64 overflow-hidden bg-[#00261D]">
                  <img
                    src={dest.image}
                    alt={dest.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-6 space-y-2">
                  <h3 className="text-xl font-bold text-[#00261D]">{dest.title}</h3>
                  <p className="text-xs text-[#717975] leading-relaxed">{dest.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          6. CONTACT SECTION (id="contact")
      ════════════════════════════════════════════════════════════════════ */}
      <section id="contact" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-4 mb-12">
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-800 block">
            Get in Touch
          </span>
          <TextRepel
            text="Let's talk."
            as="h2"
            className="text-4xl sm:text-6xl font-normal text-[#00261D] leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
            force={25}
            radius={75}
          />
          <p className="text-base text-[#555E59] leading-relaxed max-w-xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Have a question, idea, partnership opportunity, or just want to say hello?
          </p>
        </div>

        {/* Contact Form Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-black/10 shadow-xl space-y-6">
          <form onSubmit={handleContactSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#00261D] block">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="e.g. Asim Munir"
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F8FAF6] border border-black/10 text-sm text-[#00261D] focus:outline-none focus:ring-2 focus:ring-[#00261D]/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#00261D] block">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F8FAF6] border border-black/10 text-sm text-[#00261D] focus:outline-none focus:ring-2 focus:ring-[#00261D]/20 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#00261D] block">
                Subject
              </label>
              <input
                type="text"
                value={contactForm.subject}
                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                placeholder="Partnership, feedback, or general inquiry"
                className="w-full px-4 py-3.5 rounded-2xl bg-[#F8FAF6] border border-black/10 text-sm text-[#00261D] focus:outline-none focus:ring-2 focus:ring-[#00261D]/20 transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#00261D] block">
                Message *
              </label>
              <textarea
                required
                rows={5}
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                placeholder="Tell us about your requirements, feedback, or inquiry..."
                className="w-full px-4 py-3.5 rounded-2xl bg-[#F8FAF6] border border-black/10 text-sm text-[#00261D] focus:outline-none focus:ring-2 focus:ring-[#00261D]/20 transition-all font-medium resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md hover:scale-101 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Sending Message...</span>
              ) : (
                <>
                  <span>Send Message →</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
