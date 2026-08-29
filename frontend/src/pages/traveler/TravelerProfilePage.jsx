import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Compass,
  Briefcase,
  Layers,
  Bookmark,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  LogOut,
  Loader2,
  CheckCircle2,
  Heart,
  MapPin,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/firebase';
import { tripsService } from '../../services/trips';
import { bookingsService } from '../../services/bookings';
import { packagesService } from '../../services/packages';
import toast from 'react-hot-toast';

export default function TravelerProfilePage() {
  const { backendUser, firebaseUser, upgradeToOrganizer, signOut } = useAuth();
  const navigate = useNavigate();

  const [tripsCount, setTripsCount] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [savedPackages, setSavedPackages] = useState([]);
  const [showSavedSection, setShowSavedSection] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const [trips, bookings, allPkgs] = await Promise.all([
          tripsService.listTrips().catch(() => []),
          bookingsService.listUserBookings().catch(() => []),
          packagesService.listPackages().catch(() => []),
        ]);
        setTripsCount(Array.isArray(trips) ? trips.length : 0);
        setBookingsCount(Array.isArray(bookings) ? bookings.length : 0);

        // Load saved packages
        const savedIds = JSON.parse(localStorage.getItem('friday_saved_packages') || '[]');
        const matched = (allPkgs || []).filter((p) => savedIds.includes(p.id));
        setSavedPackages(matched);
      } catch (err) {
        console.error('Error fetching profile stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleRemoveSaved = (pkgId, e) => {
    e.stopPropagation();
    e.preventDefault();
    const savedIds = JSON.parse(localStorage.getItem('friday_saved_packages') || '[]');
    const next = savedIds.filter((id) => id !== pkgId);
    localStorage.setItem('friday_saved_packages', JSON.stringify(next));
    setSavedPackages((prev) => prev.filter((p) => p.id !== pkgId));
    toast.success('Removed from saved.');
  };

  const handleSwitchToOrganizer = async () => {
    setIsUpgrading(true);
    try {
      await upgradeToOrganizer();
      navigate('/organizer/onboarding');
    } catch (err) {
      console.error('Failed to upgrade:', err);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const userName = backendUser?.name || firebaseUser?.displayName || auth.currentUser?.displayName || 'Traveler';
  const userEmail = backendUser?.email || firebaseUser?.email || auth.currentUser?.email || '';
  const userPhoto = !photoError
    ? (backendUser?.profile_picture ||
       backendUser?.avatar_url ||
       firebaseUser?.photoURL ||
       auth.currentUser?.photoURL)
    : null;

  return (
    <div className="w-full flex-1 flex justify-center px-4 sm:px-8 lg:px-12 py-10 min-h-screen bg-[#F8FAF6]">
      <div className="w-full max-w-4xl space-y-10">
        {/* ─── Profile Header Hero Card ─────────────────────────────── */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-black/10 shadow-xs relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#BBEAD5]/30 via-transparent to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Avatar */}
            <div className="relative">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setPhotoError(true)}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#00261D] text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Active Account">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Identity Info */}
            <div className="text-center sm:text-left flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1
                  className="text-3xl sm:text-4xl font-normal text-[#00261D]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {userName}
                </h1>
                <span className="px-3 py-1 rounded-full bg-[#00261D]/10 text-[#00261D] text-[11px] font-bold uppercase tracking-wider">
                  Traveler Pass
                </span>
              </div>

              <p className="text-sm text-[#717975] flex items-center justify-center sm:justify-start gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                <Mail className="w-4 h-4 text-[#717975]" />
                <span>{userEmail}</span>
              </p>

              <p className="text-xs text-[#414845] max-w-md pt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                Exploring the peaks and valleys of Pakistan with Friday AI Travel Copilot.
              </p>
            </div>

            {/* Sign Out CTA */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* ─── Travel Activity Statistics Bento ──────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: AI Planned Trips */}
          <Link
            to="/my-trips"
            className="bg-white rounded-3xl p-6 border border-black/10 shadow-xs hover:border-[#00261D]/40 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#00261D]/10 flex items-center justify-center text-[#00261D]">
                <Sparkles className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#717975] group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {loading ? '...' : tripsCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#414845] mt-1">
              AI Trips Planned
            </div>
            <p className="text-[11px] text-[#717975] mt-1">Custom generated itineraries</p>
          </Link>

          {/* Card 2: Booked Expeditions */}
          <Link
            to="/my-trips"
            className="bg-white rounded-3xl p-6 border border-black/10 shadow-xs hover:border-[#00261D]/40 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#00261D]/10 flex items-center justify-center text-[#00261D]">
                <Layers className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#717975] group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {loading ? '...' : bookingsCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#414845] mt-1">
              Organizer Bookings
            </div>
            <p className="text-[11px] text-[#717975] mt-1">Confirmed tour reservations</p>
          </Link>

          {/* Card 3: Saved Expeditions (Interactive toggle on profile) */}
          <div
            onClick={() => setShowSavedSection(!showSavedSection)}
            className={`rounded-3xl p-6 border transition-all group cursor-pointer ${
              showSavedSection
                ? 'bg-[#00261D] text-white border-[#00261D] shadow-md'
                : 'bg-white text-[#191C1A] border-black/10 shadow-xs hover:border-[#00261D]/40 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                showSavedSection ? 'bg-white/20 text-white' : 'bg-[#00261D]/10 text-[#00261D]'
              }`}>
                <Bookmark className="w-5 h-5" />
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${showSavedSection ? 'text-[#BBEAD5]' : 'text-[#717975]'}`}>
                <span>{showSavedSection ? 'Hide List' : 'View List'}</span>
                {showSavedSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </div>
            <div className={`text-3xl font-normal ${showSavedSection ? 'text-white' : 'text-[#00261D]'}`} style={{ fontFamily: "'Instrument Serif', serif" }}>
              {loading ? '...' : savedPackages.length}
            </div>
            <div className={`text-xs font-bold uppercase tracking-wider mt-1 ${showSavedSection ? 'text-white/90' : 'text-[#414845]'}`}>
              Saved Expeditions
            </div>
            <p className={`text-[11px] mt-1 ${showSavedSection ? 'text-white/70' : 'text-[#717975]'}`}>
              Click to view bookmarked trips
            </p>
          </div>
        </div>

        {/* ─── Expandable Saved Expeditions Collection ──────────────── */}
        {showSavedSection && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#00261D]" />
                <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Your Saved Expeditions ({savedPackages.length})
                </h3>
              </div>
              <Link to="/explore" className="text-xs font-bold text-[#00261D] hover:underline">
                Explore More →
              </Link>
            </div>

            {savedPackages.length === 0 ? (
              <p className="text-xs text-[#717975] py-4 text-center">
                No saved expeditions yet. Click the heart icon on any package in Explore to bookmark it here.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-4 rounded-2xl border border-black/10 bg-[#F8FAF6] hover:bg-white transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-[#00261D] group-hover:underline">
                          {pkg.title}
                        </h4>
                        <p className="text-xs text-[#717975] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{pkg.destination}</span>
                        </p>
                      </div>
                      <span className="text-base font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                        Rs. {Number(pkg.price_per_person || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-black/5">
                      <button
                        onClick={(e) => handleRemoveSaved(pkg.id, e)}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                      <Link to={`/explore/${pkg.id}`}>
                        <button className="px-3.5 py-1.5 rounded-full bg-[#00261D] text-white text-[11px] font-bold uppercase tracking-wider hover:scale-105 transition-transform cursor-pointer">
                          View Trip →
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Switch / Upgrade to Organizer Account Banner ──────────── */}
        <div className="bg-[#00261D] text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-md">
          {/* Subtle glow circle */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#BBEAD5]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-[11px] font-bold uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Host on Friday</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-normal leading-tight"
                style={{ fontFamily: "'Instrument Serif', serif",color:"white" }}
              >
                Become a Verified Tour Organizer
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Are you a local tour company or mountain guide? Switch your account to Organizer to publish expedition packages, receive verified bookings, and manage passenger manifests.
              </p>
            </div>

            <button
              onClick={handleSwitchToOrganizer}
              disabled={isUpgrading}
              className="bg-[#BBEAD5] hover:bg-[#a6e2c8] text-[#00261D] px-8 py-4 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all hover:scale-105 shadow-md disabled:opacity-50 cursor-pointer shrink-0"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#00261D]" />
                  <span>Switching Account...</span>
                </>
              ) : (
                <>
                  <span>Switch to Organizer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
