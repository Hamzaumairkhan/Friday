import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Sparkles, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LandingPage = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const handleCopilotClick = () => {
    if (isAuthenticated) {
      if (role === 'ORGANIZER') {
        navigate('/organizer/dashboard');
      } else {
        navigate('/plan-trip');
      }
    } else {
      navigate('/register?redirect=/plan-trip');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAF6] text-[#191C1A]">
      {/* ─── 1. Cinematic Hero Section (Stitch) ─────────────────────────── */}
      <section className="relative w-full min-h-[calc(100vh-72px)] flex items-center justify-center py-20 overflow-hidden">
        {/* Background Image with Golden Hour Mountains */}
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url('/images/stitch/hero_mountains.jpg')`,
              filter: 'brightness(0.92)',
            }}
          />
          {/* Subtle dark tint and bottom gradient fade */}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAF6] via-transparent to-black/30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center">
          <span
            className="text-xs sm:text-sm text-white/90 uppercase tracking-[0.25em] font-semibold mb-6 px-4 py-1.5 rounded-full bg-black/25 backdrop-blur-md border border-white/20"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            YOUR JOURNEY STARTS HERE
          </span>

          <h1
            className="text-5xl sm:text-7xl md:text-8xl text-white font-normal italic mb-8 text-balance drop-shadow-lg leading-[1.05]"
            style={{
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: '-1.5px',
            }}
          >
            Go somewhere that stays with you.
          </h1>

          <p
            className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-md"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Stop stressing over itineraries. Friday’s AI crafts personalized day-by-day travel plans, while trusted local tour organizers guide you through the raw, untamed beauty of Pakistan.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link to="/explore">
              <button
                className="px-9 py-4 rounded-full text-xs font-semibold uppercase tracking-wider bg-black text-white hover:bg-slate-900 transition-all shadow-xl hover:scale-105 cursor-pointer"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Start Exploring
              </button>
            </Link>

            <button
              onClick={handleCopilotClick}
              className="px-9 py-4 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/15 text-white border border-white/40 hover:bg-white/30 transition-all backdrop-blur-md shadow-lg hover:scale-105 cursor-pointer"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Plan with Friday
            </button>
          </div>
        </div>
      </section>

      {/* ─── 2. Editorial Section: Discover (Stitch) ───────────────────── */}
      <section className="py-28 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          {/* Text Column */}
          <div className="md:col-span-5 flex flex-col gap-6 order-2 md:order-1">
            <span className="text-xs uppercase tracking-widest text-[#6F6F6F] font-semibold">
              Marketplace & Expeditions
            </span>
            <h2
              className="text-5xl md:text-6xl font-normal text-black"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Discover
            </h2>
            <p
              className="text-base sm:text-lg text-[#555E59] leading-relaxed"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Unearth hidden gems and iconic vistas through our meticulously curated tour packages. Discover expeditions operated by verified local tour operators across Pakistan, complete with day-wise itineraries, vehicle details, and direct transparent payments.
            </p>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 text-xs font-bold text-black uppercase tracking-widest mt-2 group hover:underline"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              View Curated Trips
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </Link>
          </div>

          {/* Image Column */}
          <div className="md:col-span-7 order-1 md:order-2">
            <div className="w-full h-[420px] sm:h-[500px] rounded-3xl overflow-hidden border border-black/5 shadow-2xl">
              <img
                src="/images/stitch/discover_village.jpg"
                alt="Historic Pakistani hillside village with morning light"
                className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. Editorial Section: Plan with AI Copilot (Stitch) ────────── */}
      <section className="py-28 px-6 max-w-7xl mx-auto w-full border-t border-black/5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          {/* Dual Staggered Visual Composition */}
          <div className="md:col-span-7">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="w-full h-[280px] sm:h-[340px] rounded-3xl overflow-hidden mt-10 border border-black/5 shadow-xl">
                <img
                  src="/images/stitch/plan_flatlay.jpg"
                  alt="Luxury travel itinerary flatlay with vintage compass"
                  className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                />
              </div>
              <div className="w-full h-[360px] sm:h-[440px] rounded-3xl overflow-hidden border border-black/5 shadow-2xl">
                <img
                  src="/images/stitch/plan_mobile.jpg"
                  alt="Modern travel app map in alpine environment"
                  className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                />
              </div>
            </div>
          </div>

          {/* Text Column */}
          <div className="md:col-span-5 md:col-start-8 flex flex-col gap-6">
            <span className="text-xs uppercase tracking-widest text-[#6F6F6F] font-semibold">
              Intelligent Architecture
            </span>
            <h2
              className="text-5xl md:text-6xl font-normal text-black"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Plan
            </h2>
            <p
              className="text-base sm:text-lg text-[#555E59] leading-relaxed"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Let Friday's AI architect the perfect itinerary. Seamlessly weaving logistics with comfort, budget estimation, real-time weather alerts, and group collaboration — ensuring your only job is to be present.
            </p>
            <button
              onClick={handleCopilotClick}
              className="inline-flex items-center gap-2 text-xs font-bold text-black uppercase tracking-widest mt-2 group hover:underline text-left cursor-pointer"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Meet Your Copilot
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 4. Panoramic Showcase: Pakistan is Waiting (Stitch) ────────── */}
      <section className="py-28 bg-[#F0F2ED] px-6 border-y border-black/5">
        <div className="max-w-7xl mx-auto text-center flex flex-col items-center">
          <h2
            className="text-4xl sm:text-6xl font-normal text-black italic mb-6"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Pakistan is waiting
          </h2>
          <p
            className="text-base sm:text-lg text-[#555E59] max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            From the majestic peaks of the Karakoram to the serene turquoise waters of Attabad and Skardu, discover a landscape that commands respect and inspires awe. A journey designed for the modern explorer.
          </p>

          <div className="w-full max-w-6xl h-[420px] sm:h-[580px] rounded-3xl overflow-hidden mb-8 relative shadow-2xl border border-black/5">
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-1000 hover:scale-105"
              style={{ backgroundImage: `url('/images/stitch/hero_mountains.jpg')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center pb-12">
              <Link to="/explore">
                <button
                  className="px-10 py-4 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-black hover:bg-slate-100 transition-transform hover:scale-105 shadow-2xl cursor-pointer"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Explore All Destinations
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. Bottom Call to Action Section ──────────────────────────── */}
      <section className="py-28 relative overflow-hidden bg-[#F8FAF6] border-t border-black/10">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-8">
          <h2
            className="text-4xl md:text-6xl font-normal tracking-tight text-black"
            style={{
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: '-1.5px',
              lineHeight: 1.05,
            }}
          >
            Ready for your next{' '}
            <em style={{ color: '#6F6F6F', fontStyle: 'italic' }}>adventure?</em>
          </h2>

          <p
            className="text-base sm:text-lg text-[#555E59] max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Join modern explorers traveling smarter with Friday AI, or publish your tour packages as an independent organizer.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/register">
              <button
                className="rounded-full px-12 py-4 text-xs font-semibold uppercase tracking-wider bg-black text-white hover:bg-slate-900 transition-transform hover:scale-105 cursor-pointer shadow-xl"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Create Free Account
              </button>
            </Link>

            <Link to="/register?role=ORGANIZER">
              <button
                className="rounded-full px-12 py-4 text-xs font-semibold uppercase tracking-wider bg-white text-black border border-black/20 hover:bg-slate-100 transition-transform hover:scale-105 cursor-pointer shadow-sm"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Become an Organizer
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
