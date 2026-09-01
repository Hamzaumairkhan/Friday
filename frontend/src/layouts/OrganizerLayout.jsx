import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  Building2,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  PlusCircle,
  MessageSquare,
  ExternalLink,
  ArrowLeft,
  Compass,
  Layers,
  Users,
  User,
  Briefcase,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/shared/NotificationBell';
import StatusBadge from '../components/shared/StatusBadge';
import ScrollToTop from '../components/shared/ScrollToTop';
import { notificationsService } from '../services/notifications';

export default function OrganizerLayout() {
  const { backendUser, organizerProfile, signOut, switchToTraveler } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);

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

  const handleSwitchToTraveler = async () => {
    setIsSwitching(true);
    try {
      await switchToTraveler();
      navigate('/explore');
    } catch (err) {
      console.error('Failed to switch to traveler:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  const navItems = [
    { name: 'Dashboard Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
    { name: 'My Tour Packages', href: '/organizer/trips', icon: Package },
    { name: 'Bookings & Payments', href: '/organizer/bookings', icon: CalendarCheck },
    { name: 'Trip Groups & Chat', href: '/organizer/groups', icon: MessageSquare },
    { name: 'Company Profile', href: '/organizer/profile', icon: Building2 },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAF6] text-[#191C1A] antialiased selection:bg-[#00261D] selection:text-white">
      <ScrollToTop />
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#F8FAF6] border-r border-black/10 flex flex-col transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-20 px-6 border-b border-black/10 flex items-center justify-between">
          <Link to="/organizer/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00261D] text-white shadow-2xs">
              <span className="text-2xl font-bold" style={{ fontFamily: "'Instrument Serif', serif" }}>F</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl tracking-tight text-[#00261D] leading-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Friday<sup style={{ fontSize: '9px', verticalAlign: 'super' }}>®</sup>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#717975] font-bold">
                Organizer Workspace
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-[#717975] hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Organizer Business Card */}
        <div className="p-4 mx-4 my-4 rounded-2xl bg-white border border-black/10 shadow-2xs space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#717975] block">
            VERIFIED OPERATOR
          </span>
          <h4 className="text-sm font-bold text-[#00261D] truncate">
            {organizerProfile?.name || backendUser?.name || 'My Tour Company'}
          </h4>
          <div className="flex items-center gap-2 pt-0.5">
            <StatusBadge status={organizerProfile?.verification_status || 'VERIFIED'} type="verification" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || (item.href !== '/organizer/dashboard' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#00261D] text-white shadow-xs font-bold'
                    : 'text-[#414845] hover:text-[#00261D] hover:bg-black/5'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#BBEAD5]' : 'text-[#717975]'}`} />
                  <span>{item.name}</span>
                </div>
                {item.href === '/organizer/groups' && unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Action: New Package */}
        <div className="p-4 border-t border-black/10 space-y-2">
          <Link to="/organizer/trips/new" onClick={() => setSidebarOpen(false)} className="block">
            <button
              className="w-full flex items-center justify-center gap-2 rounded-full py-3 text-xs font-bold uppercase tracking-wider transition-all hover:scale-101 cursor-pointer bg-[green] hover:bg-[#00261D]/90 text-white shadow-xs"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <PlusCircle className="w-4 h-4 text-[#BBEAD5]" />
              <span>Create New Package</span>
            </button>
          </Link>

          <button
            onClick={handleSwitchToTraveler}
            disabled={isSwitching}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 transition-all border border-emerald-300 shadow-2xs w-full text-left cursor-pointer"
            title="Switch to Traveler Portal"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-emerald-800" />
              <span>Switch to Traveler</span>
            </div>
            <ArrowRightLeft className="w-3 h-3 text-emerald-700" />
          </button>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-black/10 flex items-center justify-between text-xs text-[#717975]">
          <div className="flex flex-col truncate max-w-[150px]">
            <span className="font-semibold text-[#00261D] truncate">{backendUser?.email}</span>
            <span className="text-[10px] text-[#717975]">Organizer Account</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full hover:text-red-600 hover:bg-black/5 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:pl-72 min-w-0 pb-20 md:pb-0">
        {/* Workspace Top Header */}
        <header className="sticky top-0 z-30 h-20 border-b border-black/10 bg-[#F8FAF6]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-[#00261D] hover:bg-black/5 cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Back to Explore Arrow Button */}
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-black/10 text-xs font-bold text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all shadow-2xs cursor-pointer group"
              title="Return to Public Explore Marketplace"
            >
              <ArrowLeft className="w-4 h-4 text-[#00261D] group-hover:text-white transition-colors" />
              <span>Back to Explore</span>
            </Link>

            <div className="hidden md:flex flex-col pl-3 border-l border-black/10">
              <h1
                className="text-2xl font-normal text-[#00261D]"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Organizer Workspace
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell />
            <Link
              to="/explore"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#00261D] hover:underline px-3.5 py-1.5 rounded-full bg-white border border-black/10 shadow-2xs hover:bg-[#00261D] hover:text-white transition-all"
            >
              <span>View Public Marketplace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAV (Hidden on MD+) ──────────────────────── */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2.5 md:hidden bg-[#F8FAF6]/95 backdrop-blur-lg border-t border-black/10 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {/* 1. Trips / Packages */}
        <Link
          to="/organizer/trips"
          className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            location.pathname === '/organizer/trips' ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>Trips</span>
        </Link>

        {/* 2. Workshop */}
        <Link
          to="/organizer/dashboard"
          className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            location.pathname === '/organizer/dashboard' ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span>Workshop</span>
        </Link>

        {/* 3. Explore (Center) */}
        <Link
          to="/explore"
          className="flex flex-col items-center justify-center text-[10px] font-bold gap-1 text-[#717975] hover:text-[#00261D] transition-colors"
        >
          <Compass className="w-5 h-5" />
          <span>Explore</span>
        </Link>

        {/* 4. Groups */}
        <Link
          to="/organizer/groups"
          className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            location.pathname === '/organizer/groups' ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Groups</span>
        </Link>

        {/* 5. Profile */}
        <Link
          to="/organizer/profile"
          className={`flex flex-col items-center justify-center text-[10px] font-bold gap-1 transition-colors ${
            location.pathname === '/organizer/profile' ? 'text-[#00261D]' : 'text-[#717975]'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
