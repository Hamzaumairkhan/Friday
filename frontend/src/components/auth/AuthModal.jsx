import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, Briefcase, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, defaultModalRole, signIn } = useAuth();
  const [selectedRole, setSelectedRole] = useState(defaultModalRole || 'TRAVELER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authModalOpen) {
      setSelectedRole(defaultModalRole || 'TRAVELER');
    }
  }, [authModalOpen, defaultModalRole]);

  if (!authModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const res = await signIn(selectedRole);
      const userRole = res?.role || selectedRole;
      closeAuthModal();

      if (userRole === 'ORGANIZER') {
        const onboarded = res?.organizerProfile?.onboarding_completed;
        if (!onboarded) {
          navigate('/organizer/onboarding');
        } else {
          navigate('/organizer/dashboard');
        }
      } else {
        const from = location.state?.from?.pathname || '/explore';
        navigate(from);
      }
    } catch (err) {
      console.error('Modal sign in failure:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop with cinematic blur */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={closeAuthModal}
      />

      {/* Modal Container: High Contrast White Card with Split Visual Layout */}
      <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl border border-black/10 z-10 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 z-30 p-2.5 rounded-full text-black hover:bg-slate-100 bg-white/90 backdrop-blur-md shadow-xs transition-colors cursor-pointer border border-black/5"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
          {/* ─── Visual Column (Image with 30% Right Top & Bottom Radius) ─── */}
          <div className="md:col-span-5 relative min-h-[220px] sm:min-h-[260px] md:min-h-full overflow-hidden bg-black">
            <div
              className="w-full h-full min-h-[220px] md:min-h-[540px] bg-cover bg-center md:rounded-tr-[30%] md:rounded-br-[30%] rounded-b-[28px] md:rounded-b-none relative overflow-hidden transition-all duration-500 shadow-lg"
              style={{
                backgroundImage: `url('/images/stitch/hero_mountains.jpg')`,
                filter: 'brightness(0.92)',
              }}
            >
              {/* Subtle Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30" />

              {/* Top Tag */}
              <div className="absolute top-5 left-5 z-10">
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-black/40 backdrop-blur-md text-white border border-white/20"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  FRIDAY® / PASS
                </span>
              </div>

              {/* Bottom Caption on Image */}
              <div className="absolute bottom-5 left-5 right-5 z-10 text-white space-y-1">
                <h3
                  className="text-2xl sm:text-3xl font-normal italic leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Discover Pakistan
                </h3>
                <p className="text-[11px] text-white/80" style={{ fontFamily: 'Inter, sans-serif' }}>
                  HUNZA • SKARDU • SWAT • KARAKORAM
                </p>
              </div>
            </div>
          </div>

          {/* ─── Form Column (Pure White, Solid High Contrast) ──────────── */}
          <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6 bg-white text-black">
            {/* Header */}
            <div className="space-y-2 text-left">
              <div className="inline-flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white">
                  <span className="text-base font-bold" style={{ fontFamily: "'Instrument Serif', serif" }}>F</span>
                </div>
                <span className="text-xl tracking-tight text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Friday<sup style={{ fontSize: '9px', verticalAlign: 'super' }}>®</sup>
                </span>
              </div>

              <h2
                className="text-4xl sm:text-5xl font-normal text-black pt-1"
                style={{ fontFamily: "'Instrument Serif', serif", lineHeight: 0.95 }}
              >
                Welcome to <em style={{ color: '#6F6F6F', fontStyle: 'italic' }}>Friday</em>
              </h2>
              <p className="text-xs sm:text-sm text-[#6F6F6F]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Select your role to start exploring or managing expeditions.
              </p>
            </div>

            {/* Role Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
              {/* Traveler Option */}
              <div
                onClick={() => setSelectedRole('TRAVELER')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  selectedRole === 'TRAVELER'
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-black/10 bg-[#F8FAF6] text-black hover:border-black/30'
                }`}
              >
                {selectedRole === 'TRAVELER' && (
                  <div className="absolute top-3.5 right-3.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    selectedRole === 'TRAVELER'
                      ? 'bg-white/15 text-white'
                      : 'bg-black/5 text-black'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                </div>
                <h3
                  className={`text-xl font-normal mb-1 ${
                    selectedRole === 'TRAVELER' ? 'text-white' : 'text-black'
                  }`}
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Traveler
                </h3>
                <p
                  className={`text-[11px] leading-relaxed ${
                    selectedRole === 'TRAVELER' ? 'text-slate-300' : 'text-[#6F6F6F]'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Discover trips, plan with AI, and book tours.
                </p>
              </div>

              {/* Organizer Option */}
              <div
                onClick={() => setSelectedRole('ORGANIZER')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  selectedRole === 'ORGANIZER'
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-black/10 bg-[#F8FAF6] text-black hover:border-black/30'
                }`}
              >
                {selectedRole === 'ORGANIZER' && (
                  <div className="absolute top-3.5 right-3.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    selectedRole === 'ORGANIZER'
                      ? 'bg-white/15 text-white'
                      : 'bg-black/5 text-black'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                </div>
                <h3
                  className={`text-xl font-normal mb-1 ${
                    selectedRole === 'ORGANIZER' ? 'text-white' : 'text-black'
                  }`}
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Organizer
                </h3>
                <p
                  className={`text-[11px] leading-relaxed ${
                    selectedRole === 'ORGANIZER' ? 'text-slate-300' : 'text-[#6F6F6F]'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Publish tours, verify payments, and host travelers.
                </p>
              </div>
            </div>

            {/* Google Sign-In Action Button */}
            <div className="space-y-3 pt-1">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 rounded-full py-3.5 px-6 text-xs font-bold uppercase tracking-wider transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-white text-black border border-black/20 shadow-sm hover:shadow-md disabled:opacity-50"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {/* Google Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>
                  {isSubmitting ? 'Signing in with Google...' : 'Continue with Google'}
                </span>
              </button>

              <p className="text-[11px] text-[#6F6F6F] text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                By continuing, you agree to Friday’s Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
