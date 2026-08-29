import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  Layers,
  Users,
  Bookmark,
  User,
  HelpCircle,
  Shield,
  Plus,
  LogOut,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/auth/AuthModal';

export default function TravelerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, backendUser, organizerProfile, role, signOut } = useAuth();

  const isOrganizer = role === 'ORGANIZER' || backendUser?.role === 'ORGANIZER' || Boolean(organizerProfile);

  const isActive = (path) => {
    if (path === '/explore' && location.pathname.startsWith('/explore')) return true;
    if (path === '/organizer' && location.pathname.startsWith('/organizer')) return true;
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAF6] text-[#191C1A] flex flex-col lg:flex-row antialiased selection:bg-[#00261D] selection:text-white">
      {/* ─── DESKTOP LEFT SIDEBAR (Fixed Left w-64) ──────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 p-6 shrink-0 fixed left-0 top-0 h-screen border-r border-black/10 justify-between bg-[#F8FAF6] z-40">
        <div className="space-y-6">
          {/* Logo */}
          <div>
            <Link to="/" className="inline-block">
              <h1
                className="text-3xl font-normal text-[#00261D] tracking-tight"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Friday®
              </h1>
              <p className="text-xs text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                AI Travel Copilot
              </p>
            </Link>
          </div>

          {/* Primary Action Button (New Trip for Traveler / Create Package for Organizer) */}
          {isOrganizer ? (
            <Link to="/organizer/trips/new" className="block">
              <button className="w-full bg-[green] text-white py-3 px-4 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#00261D]/90 transition-all shadow-xs cursor-pointer">
                <Plus className="w-4 h-4 text-[#BBEAD5]" />
                <span>Create Package</span>
              </button>
            </Link>
          ) : (
            <Link to="/plan-trip" className="block">
              <button className="w-full bg-[green] text-white py-3 px-4 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#00261D]/90 transition-all shadow-xs cursor-pointer">
                <Plus className="w-4 h-4 text-[#BBEAD5]" />
                <span>New Trip</span>
              </button>
            </Link>
          )}

          {/* Main Navigation Links */}
          <nav className="flex flex-col gap-1 text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Link
              to="/explore"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive('/explore')
                  ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                  : 'text-[#414845] hover:bg-black/5'
              }`}
            >
              <Compass className="w-4 h-4 text-[#00261D]" />
              <span>Explore</span>
            </Link>

            {/* If Organizer -> Show Organizer Workshop, Else -> Plan Trip */}
            {isOrganizer ? (
              <Link
                to="/organizer/dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive('/organizer')
                    ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                    : 'text-[#414845] hover:bg-black/5 hover:text-[#00261D]'
                }`}
              >
                <Briefcase className="w-4 h-4 text-[#00261D]" />
                <span>Organizer Workshop</span>
              </Link>
            ) : (
              <Link
                to="/plan-trip"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive('/plan-trip')
                    ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                    : 'text-[#414845] hover:bg-black/5'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#00261D]" />
                <span>Plan Trip</span>
              </Link>
            )}

            <Link
              to="/my-trips"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive('/my-trips')
                  ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                  : 'text-[#414845] hover:bg-black/5'
              }`}
            >
              <Layers className="w-4 h-4 text-[#00261D]" />
              <span>My Trips</span>
            </Link>

            <Link
              to="/groups"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive('/groups')
                  ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                  : 'text-[#414845] hover:bg-black/5'
              }`}
            >
              <Users className="w-4 h-4 text-[#00261D]" />
              <span>Groups</span>
            </Link>

            <Link
              to="/saved"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive('/saved')
                  ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                  : 'text-[#414845] hover:bg-black/5'
              }`}
            >
              <Bookmark className="w-4 h-4 text-[#00261D]" />
              <span>Saved</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Profile & Sign Out */}
        <div className="space-y-4 pt-4 border-t border-black/10 text-xs text-[#414845]">
          <nav className="flex flex-col gap-1">
            <Link
              to="/profile"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                isActive('/profile')
                  ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                  : 'hover:text-[#00261D] hover:bg-black/5'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2.5 text-[#717975] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </nav>

          <div className="flex gap-4 px-4 text-[11px] text-[#717975]">
            <Link to="/about" className="hover:text-[#00261D] flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> Help
            </Link>
            <Link to="/about" className="hover:text-[#00261D] flex items-center gap-1">
              <Shield className="w-3 h-3" /> Privacy
            </Link>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT VIEWPORT (Full Width, Left-Padded for Sidebar) ─ */}
      <div className="flex-1 w-full lg:pl-64 min-h-screen flex flex-col pb-20 lg:pb-0 overflow-x-hidden">
        <Outlet />
      </div>

      {/* ─── MOBILE BOTTOM NAV (Hidden on LG+) ──────────────────────── */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2.5 lg:hidden bg-[#F8FAF6]/95 backdrop-blur-lg border-t border-black/10 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {/* 1. Trips */}
        <Link
          to="/my-trips"
          className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            isActive('/my-trips') ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>Trips</span>
        </Link>

        {/* 2. Workshop for Organizer / Plan for Traveler */}
        {isOrganizer ? (
          <Link
            to="/organizer/dashboard"
            className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
              location.pathname.startsWith('/organizer') ? 'text-[#00261D]' : 'text-[#717975]'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span>Workshop</span>
          </Link>
        ) : (
          <Link
            to="/plan-trip"
            className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
              isActive('/plan-trip') ? 'text-[#00261D]' : 'text-[#717975]'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>Plan</span>
          </Link>
        )}

        {/* 3. Explore (Center) */}
        <Link
          to="/explore"
          className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            isActive('/explore') ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span>Explore</span>
        </Link>

        {/* 4. Groups */}
        <Link
          to="/groups"
          className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            isActive('/groups') ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Groups</span>
        </Link>

        {/* 5. Profile */}
        <Link
          to="/profile"
          className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            isActive('/profile') ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </nav>

      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  );
}
