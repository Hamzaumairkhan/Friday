import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  Layers,
  Package,
  Users,
  Bookmark,
  User,
  HelpCircle,
  Shield,
  Plus,
  LogOut,
  Briefcase,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/auth/AuthModal';
import NotificationBell from '../components/shared/NotificationBell';
import UserAvatar from '../components/shared/UserAvatar';
import ScrollToTop from '../components/shared/ScrollToTop';
import ReportIssueModal from '../components/shared/ReportIssueModal';
import { notificationsService } from '../services/notifications';

export default function TravelerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, backendUser, organizerProfile, role, signOut, upgradeToOrganizer, switchToTraveler } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchUnread = async () => {
    try {
      const res = await notificationsService.getUnreadCount();
      setUnreadCount(res?.unread_count || 0);
    } catch {}
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  // Strict check against currently active role in context
  const isOrganizer = (role || backendUser?.role) === 'ORGANIZER';

  const isActive = (path) => {
    if (path === '/explore' && location.pathname.startsWith('/explore')) return true;
    if (path === '/organizer' && location.pathname === '/organizer/dashboard') return true;
    if (path === '/organizer/trips' && location.pathname.startsWith('/organizer/trips')) return true;
    if (path === '/organizer/profile' && location.pathname.startsWith('/organizer/profile')) return true;
    if (path === '/organizer/groups' && location.pathname.startsWith('/organizer/groups')) return true;
    return location.pathname === path;
  };

  const handleSwitchToOrganizer = async () => {
    setIsSwitching(true);
    try {
      const res = await upgradeToOrganizer();
      if (res?.organizer_profile?.onboarding_completed) {
        navigate('/organizer/dashboard', { replace: true });
      } else {
        navigate('/organizer/onboarding', { replace: true });
      }
    } catch (err) {
      console.error('Failed to switch to organizer:', err);
      navigate('/organizer/onboarding', { replace: true });
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSwitchToTraveler = async () => {
    setIsSwitching(true);
    try {
      await switchToTraveler();
    } catch (err) {
      console.error('Failed to switch to traveler:', err);
    } finally {
      setIsSwitching(false);
      navigate('/explore', { replace: true });
    }
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
      <ScrollToTop />
      {/* ─── DESKTOP LEFT SIDEBAR (Fixed Left w-64) ──────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 p-6 shrink-0 fixed left-0 top-0 h-screen border-r border-black/10 justify-between bg-[#F8FAF6] z-40">
        <div className="space-y-6">
          {/* Logo & Notification Bell */}
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-block">
              <h1
                className="text-3xl font-normal text-[#00261D] tracking-tight"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Friday®
              </h1>
              <p className="text-xs text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Travel Marketplace
              </p>
            </Link>
            <NotificationBell align="left" />
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
              <button className="w-full bg-[green] text-white py-3 px-4 rounded-full text-xs font-bold uppercase tracking-wider flex items-center  justify-center gap-2 hover:bg-[#00261D]/90 transition-all shadow-xs cursor-pointer">
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

            {/* If Organizer -> My Tour Packages, Else -> My Trips */}
            {isOrganizer ? (
              <Link
                to="/organizer/trips"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive('/organizer/trips')
                    ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                    : 'text-[#414845] hover:bg-black/5 hover:text-[#00261D]'
                }`}
              >
                <Package className="w-4 h-4 text-[#00261D]" />
                <span>My Tour Packages</span>
              </Link>
            ) : (
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
            )}

            <Link
              to={isOrganizer ? "/organizer/groups" : "/groups"}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                isActive(isOrganizer ? '/organizer/groups' : '/groups')
                  ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                  : 'text-[#414845] hover:bg-black/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-[#00261D]" />
                <span>Groups</span>
              </div>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
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
              to={isOrganizer ? "/organizer/profile" : "/profile"}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                isActive(isOrganizer ? '/organizer/profile' : '/profile')
                  ? 'bg-[#E7E9E5] text-[#00261D] font-bold shadow-xs'
                  : 'hover:text-[#00261D] hover:bg-black/5'
              }`}
            >
              <UserAvatar
                src={user?.photoURL || backendUser?.profile_picture}
                name={user?.displayName || backendUser?.name || 'Account'}
                size="xs"
              />
              <span className="truncate">{user?.displayName || backendUser?.name || (isOrganizer ? 'Company Profile' : 'Profile')}</span>
            </Link>

            {/* One-Click Portal Switcher */}
            {isOrganizer ? (
              <button
                onClick={handleSwitchToTraveler}
                disabled={isSwitching}
                className="flex items-center justify-between px-3.5 py-2.5 my-1 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 transition-all border border-emerald-300 shadow-2xs w-full text-left cursor-pointer"
                title="Switch to Traveler Account"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Switch to Traveler</span>
                </div>
                <ArrowRightLeft className="w-3 h-3 text-emerald-700" />
              </button>
            ) : (
              <button
                onClick={handleSwitchToOrganizer}
                disabled={isSwitching}
                className="flex items-center justify-between px-3.5 py-2.5 my-1 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 transition-all border border-emerald-300 shadow-2xs w-full text-left cursor-pointer"
                title="Switch to Organizer Account"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Switch to Organizer</span>
                </div>
                <ArrowRightLeft className="w-3 h-3 text-emerald-700" />
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2 text-[#717975] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </nav>

          <div className="flex items-center justify-between px-4 py-2 border-t border-black/5 text-[11px] text-[#717975]">
            <div className="flex gap-2.5">
              <Link to="/about" className="hover:text-[#00261D] flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Help
              </Link>
              <Link to="/about" className="hover:text-[#00261D] flex items-center gap-1">
                <Shield className="w-3 h-3" /> Privacy
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="hover:text-amber-900 flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-full cursor-pointer font-bold transition-all shadow-2xs shrink-0"
              title="Report a bug or issue"
            >
              <AlertCircle className="w-3 h-3 text-amber-800" /> Report Issue
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT VIEWPORT (Full Width, Left-Padded for Sidebar) ─ */}
      <div className="flex-1 w-full lg:pl-64 min-h-screen flex flex-col pb-20 lg:pb-0 overflow-x-hidden">
        {/* Mobile Top Header (Hidden on Desktop LG+) */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 bg-[#F8FAF6]/90 backdrop-blur-md border-b border-black/10">
          <Link to="/" className="inline-block">
            <span className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Friday®
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs"
              title="Report an Issue or Bug"
            >
              <AlertCircle className="w-4 h-4 text-amber-800" />
            </button>
            <NotificationBell />
            <Link to={isOrganizer ? "/organizer/profile" : "/profile"}>
              <UserAvatar
                src={user?.photoURL || backendUser?.profile_picture}
                name={user?.displayName || backendUser?.name || 'Account'}
                size="xs"
              />
            </Link>
          </div>
        </header>

        <Outlet />
      </div>

      {/* ─── MOBILE BOTTOM NAV (Hidden on LG+) ──────────────────────── */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2.5 lg:hidden bg-[#F8FAF6]/95 backdrop-blur-lg border-t border-black/10 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {/* 1. Trips / Packages */}
        {isOrganizer ? (
          <Link
            to="/organizer/trips"
            className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
              location.pathname.startsWith('/organizer/trips') ? 'text-[#00261D]' : 'text-[#717975]'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Packages</span>
          </Link>
        ) : (
          <Link
            to="/my-trips"
            className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
              isActive('/my-trips') ? 'text-[#00261D]' : 'text-[#717975]'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Trips</span>
          </Link>
        )}

        {/* 2. Workshop for Organizer / Plan for Traveler */}
        {isOrganizer ? (
          <Link
            to="/organizer/dashboard"
            className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
              location.pathname === '/organizer/dashboard' ? 'text-[#00261D]' : 'text-[#717975]'
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
          to={isOrganizer ? "/organizer/groups" : "/groups"}
          className={`relative flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            (isOrganizer ? location.pathname.startsWith('/organizer/groups') : isActive('/groups')) ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white shadow-xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>Groups</span>
        </Link>

        {/* 5. Profile */}
        <Link
          to={isOrganizer ? "/organizer/profile" : "/profile"}
          className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            (isOrganizer ? location.pathname.startsWith('/organizer/profile') : isActive('/profile')) ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </nav>

      {/* Global Auth Modal */}
      <AuthModal />

      {/* User Issue & Feedback Reporting Modal */}
      <ReportIssueModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  );
}
