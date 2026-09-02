import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Compass, Briefcase, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialRole = searchParams.get('role') === 'ORGANIZER' ? 'ORGANIZER' : 'TRAVELER';

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === 'ORGANIZER') {
        navigate('/organizer/dashboard', { replace: true });
      } else {
        const redirectParam = searchParams.get('redirect');
        const from = redirectParam || location.state?.from?.pathname || '/explore';
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate, location.search, location.state]);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const res = await signIn(selectedRole);
      const userRole = res?.role || selectedRole;

      if (userRole === 'ORGANIZER') {
        const onboarded = res?.organizerProfile?.onboarding_completed;
        if (!onboarded) {
          navigate('/organizer/onboarding');
        } else {
          navigate('/organizer/dashboard');
        }
      } else {
        const redirectParam = searchParams.get('redirect');
        const from = redirectParam || location.state?.from?.pathname || '/explore';
        navigate(from);
      }
    } catch (err) {
      console.warn('Google authentication error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex text-[#191C1A] font-sans bg-[#F8FAF6] selection:bg-[#00261D] selection:text-white relative">
      {/* ─── Back to Home Arrow Button (Floating) ────────────────────── */}
      <Link
        to="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/90 backdrop-blur-md text-[#00261D] text-[11px] sm:text-xs font-semibold hover:bg-white transition-all shadow-md hover:scale-105 cursor-pointer"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span>Back to Home</span>
      </Link>

      {/* Screen Split Container */}
      <div className="flex w-full min-h-screen flex-col lg:flex-row">
        {/* ─── Left: Image Canvas ─── */}
        <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 lg:p-16 overflow-hidden shrink-0">
          <div className="absolute inset-0 z-0">
            <img
              alt="Northern Pakistan Landscape"
              className="w-full h-full object-cover"
              src="/images/stitch/register_hero.jpg"
              onError={(e) => {
                e.currentTarget.src = '/images/stitch/hero_mountains.jpg';
              }}
            />
            <div className="absolute inset-0 bg-black/15 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
          </div>

          <div className="relative z-10 flex justify-between items-start text-white w-full pt-12">
            <h1 className="text-2xl tracking-tight font-bold" style={{ fontFamily: "'Instrument Serif', serif" }}>
              FRIDAY®
            </h1>
            <span
              className="text-xs uppercase tracking-[0.25em] font-semibold text-white/80"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              ACCOUNT CREATION
            </span>
          </div>

          <div className="relative z-10 w-full mb-8 text-white">
            <p
              className="text-5xl lg:text-6xl italic leading-tight text-white mb-6 drop-shadow-sm max-w-lg font-normal"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              "The mountains are calling, and Friday architects the path."
            </p>
            <p
              className="text-sm font-sans tracking-wide text-[#ECEEE9]/80 uppercase"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Curated Expeditions • AI Planner • Verified Operators
            </p>
          </div>
        </div>

        {/* ─── Mobile Header (Small screens < lg) ─────────────────────── */}
        <div className="lg:hidden w-full h-52 sm:h-60 relative bg-cover bg-center shrink-0">
          <img
            alt="Hero"
            src="/images/stitch/register_hero.jpg"
            onError={(e) => {
              e.currentTarget.src = '/images/stitch/hero_mountains.jpg';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-[#F8FAF6]" />
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <h1
              className="text-2xl sm:text-3xl font-normal italic text-white leading-tight drop-shadow-md"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Begin your journey.
            </h1>
          </div>
        </div>

        {/* ─── Right: Registration Form Panel ─── */}
        <div className="w-full lg:w-[45%] flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-8 sm:py-12 bg-[#F8FAF6] relative z-10">
          <div className="w-full max-w-md space-y-6 sm:space-y-8">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#717975] font-bold block mb-2">
                ACCOUNT CREATION
              </span>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#00261D] mb-3"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Join the Network
              </h2>
              <p className="text-xs sm:text-sm text-[#414845]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Select your role to configure your account.
              </p>
            </div>

            {/* Role Switcher */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('TRAVELER')}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative ${
                  selectedRole === 'TRAVELER'
                    ? 'border-[#00261D] bg-[#BBEAD5] shadow-xs'
                    : 'border-[#C1C8C4] bg-white hover:border-[#00261D]/50'
                }`}
              >
                {selectedRole === 'TRAVELER' && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#00261D] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <Compass className="w-5 h-5 text-[#00261D] mb-2" />
                <span className="text-base font-bold text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Traveler
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#414845] mt-0.5">
                  Plan AI trips & explore
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('ORGANIZER')}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative ${
                  selectedRole === 'ORGANIZER'
                    ? 'border-[#00261D] bg-[#BBEAD5] shadow-xs'
                    : 'border-[#C1C8C4] bg-white hover:border-[#00261D]/50'
                }`}
              >
                {selectedRole === 'ORGANIZER' && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#00261D] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <Briefcase className="w-5 h-5 text-[#00261D] mb-2" />
                <span className="text-base font-bold text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Organizer
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#414845] mt-0.5">
                  Host & market expeditions
                </span>
              </button>
            </div>

            {/* Auth Buttons */}
            <div className="space-y-4 pt-1">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full bg-[#00261D] hover:bg-[#00261D]/90 text-white py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span className="text-xs font-bold uppercase tracking-widest">Connecting Google...</span>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-1 rounded-full shrink-0">
                      <svg height="15" viewBox="0 0 24 24" width="15">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Continue as {selectedRole === 'ORGANIZER' ? 'Organizer' : 'Traveler'}
                    </span>
                    <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
