import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Compass, Sparkles, Luggage, LayoutDashboard, Package, CalendarCheck, MessageSquare, LogOut, ShieldCheck, Info, Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../shared/NotificationBell';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { backendUser, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = !!backendUser;
  const isOrganizer = role === 'ORGANIZER' || backendUser?.role === 'ORGANIZER';

  // Dynamic Navigation Links based on role & auth
  const travelerNav = [
    { name: 'Discover', href: '/explore', icon: Compass },
    { name: 'Plan with AI', href: '/plan-trip', icon: Sparkles },
    { name: 'My Trips', href: '/my-trips', icon: Luggage },
  ];

  const organizerNav = [
    { name: 'Workspace', href: '/organizer/dashboard', icon: LayoutDashboard },
    { name: 'My Packages', href: '/organizer/trips', icon: Package },
    { name: 'Bookings', href: '/organizer/bookings', icon: CalendarCheck },
    { name: 'Trip Groups', href: '/organizer/groups', icon: MessageSquare },
  ];

  const publicNav = [
    { name: 'Discover', href: '/explore', icon: Compass, public: true },
    { name: 'About', href: '/about', icon: Info, public: true },
    { name: 'Pricing', href: '/about#pricing', icon: Tag, public: true },
  ];

  const currentNav = isAuthenticated
    ? (isOrganizer ? organizerNav : travelerNav)
    : publicNav;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavClick = (e, item) => {
    if (!isAuthenticated && item.public === false) {
      e.preventDefault();
      setIsOpen(false);
      navigate(`/register?redirect=${encodeURIComponent(item.href)}`);
    }
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/10 transition-all duration-300 shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center" style={{ height: '72px' }}>
          {/* Brand Logo (Solid Black Instrument Serif Friday®) */}
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white shadow-xs group-hover:scale-105 transition-transform"
              >
                <span
                  className="text-xl font-bold text-white"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  F
                </span>
              </div>
              <span
                className="text-3xl tracking-tight font-normal"
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  color: '#000000',
                }}
              >
                Friday<sup style={{ fontSize: '10px', verticalAlign: 'super', color: '#000000' }}>®</sup>
              </span>
            </Link>

            {/* Desktop Navigation Links (Stitch Monograph Caps) */}
            <div className="hidden md:flex md:items-center md:space-x-1">
              {currentNav.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`px-4 py-2 rounded-full text-xs uppercase tracking-widest font-semibold transition-all ${
                      isActive
                        ? 'bg-black text-white shadow-xs'
                        : 'text-[#6F6F6F] hover:text-black hover:bg-slate-100'
                    }`}
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop Right Side / Auth Actions */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationBell />

                {/* Profile Pill */}
                <Link
                  to={isOrganizer ? '/organizer/profile' : '/my-trips'}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-100 border border-black/10 bg-white transition-colors shadow-xs"
                >
                  {backendUser?.profile_picture ? (
                    <img
                      src={backendUser.profile_picture}
                      alt={backendUser.name}
                      className="w-7 h-7 rounded-full object-cover border border-black/10"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-black">
                      {backendUser?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-xs font-medium text-black max-w-[110px] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {backendUser?.name || (isOrganizer ? 'Organizer' : 'Traveler')}
                  </span>
                  {isOrganizer ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                      <ShieldCheck className="w-3 h-3" /> Host
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-[#6F6F6F]">
                      Traveler
                    </span>
                  )}
                </Link>

                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-full text-[#6F6F6F] hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/register"
                  className="rounded-full px-6 py-2.5 text-xs uppercase tracking-wider font-semibold transition-transform hover:scale-105 cursor-pointer bg-black text-white shadow-sm"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Start Journey
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center md:hidden gap-3">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-black focus:outline-none cursor-pointer"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-black/10 px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <div className="space-y-1">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={(e) => {
                    handleNavClick(e, item);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs uppercase tracking-wider font-semibold ${
                    isActive
                      ? 'bg-black text-white'
                      : 'text-[#6F6F6F] hover:bg-slate-100'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-black/10">
            {isAuthenticated ? (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold">
                    {backendUser?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-medium text-black">{backendUser?.name || 'User'}</span>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-600 font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="block text-center w-full py-2.5 rounded-full bg-black text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Start Journey
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
