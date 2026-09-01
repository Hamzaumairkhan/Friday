import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, Compass, Sparkles, Luggage, LayoutDashboard, Package, CalendarCheck, MessageSquare, LogOut, ShieldCheck, Info, Tag, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../shared/NotificationBell';
import TextRepel from '../ui/TextRepel';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { backendUser, firebaseUser, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = !!backendUser;
  const isOrganizer = role === 'ORGANIZER' || backendUser?.role === 'ORGANIZER';
  const navUserPhoto = backendUser?.profile_picture || backendUser?.avatar_url || firebaseUser?.photoURL;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Public & Authenticated Navigation Item Sets
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Explore', href: '/explore' },
    { name: 'How It Works', href: '/#how-it-works' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const handleLinkClick = (href) => {
    setIsOpen(false);
    if (href.startsWith('/#')) {
      const anchorId = href.replace('/#', '');
      if (location.pathname === '/') {
        const el = document.getElementById(anchorId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate(`/${href.substring(1)}`);
      }
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-black/10 shadow-xs'
          : 'bg-white/80 backdrop-blur-sm border-b border-black/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center" style={{ height: '72px' }}>
          {/* Brand Logo (Solid Black Instrument Serif Friday® with TextRepel) */}
          <div className="flex items-center gap-8 lg:gap-10">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00261D] text-white shadow-xs group-hover:scale-105 transition-transform">
                <span
                  className="text-xl font-bold text-[#BBEAD5]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  F
                </span>
              </div>
              <div className="flex items-baseline">
                <TextRepel
                  text="Friday"
                  className="text-3xl tracking-tight font-normal text-[#00261D]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                  force={25}
                  radius={70}
                />
                <sup style={{ fontSize: '10px', verticalAlign: 'super', color: '#00261D' }}>®</sup>
              </div>
            </Link>

            {/* Desktop Navigation Links (Transparent BG, Pure Text Color Switch) */}
            <div className="hidden md:flex md:items-center md:space-x-6 lg:space-x-8">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => handleLinkClick(item.href)}
                    className={`relative py-2 text-xs uppercase tracking-widest transition-all cursor-pointer ${
                      isActive
                        ? 'text-emerald-900 font-extrabold'
                        : 'text-[#555E59] hover:text-emerald-800 font-semibold'
                    }`}
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-800 rounded-full"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop Right Side Actions */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationBell />

                {/* Dashboard / Workspace Quick Button */}
                <Link to={isOrganizer ? '/organizer/dashboard' : '/my-trips'}>
                  <button className="px-4 py-2 rounded-full border border-black/10 hover:border-black/30 text-xs font-bold uppercase tracking-wider text-[#00261D] hover:bg-slate-50 transition-all cursor-pointer">
                    {isOrganizer ? 'Organizer Hub' : 'My Trips'}
                  </button>
                </Link>

                {/* Profile Pill */}
                <Link
                  to={isOrganizer ? '/organizer/profile' : '/my-trips'}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-slate-100 border border-black/10 bg-white transition-colors shadow-2xs"
                >
                  {navUserPhoto ? (
                    <img
                      src={navUserPhoto}
                      alt={backendUser?.name || 'User'}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-7 h-7 rounded-full object-cover border border-black/10"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#00261D] text-white flex items-center justify-center text-xs font-bold">
                      {(backendUser?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-black max-w-[100px] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {backendUser?.name || 'Account'}
                  </span>
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
              <div className="flex items-center gap-2.5">
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-[#00261D] hover:bg-slate-100 transition-colors cursor-pointer"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Sign In
                </Link>

                <Link
                  to="/plan-trip"
                  className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#00261D] text-white hover:bg-[#00261D]/90 transition-all shadow-sm hover:scale-102 flex items-center gap-1.5 cursor-pointer"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#BBEAD5]" />
                  <span>Start Planning</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center md:hidden gap-2">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-[#00261D] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-black/10 px-6 py-6 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => handleLinkClick(item.href)}
                className={`px-4 py-3 rounded-2xl text-xs uppercase tracking-widest font-bold transition-colors ${
                  location.pathname === item.href
                    ? 'bg-[#00261D] text-white'
                    : 'text-[#555E59] hover:bg-slate-100'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-black/10 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to={isOrganizer ? '/organizer/dashboard' : '/my-trips'}
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider text-center"
                >
                  {isOrganizer ? 'Open Organizer Hub' : 'My Trips Workspace'}
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleSignOut();
                  }}
                  className="w-full py-2.5 rounded-full border border-black/10 text-xs font-bold text-red-600 hover:bg-red-50 text-center uppercase tracking-wider cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 rounded-full border border-black/10 text-[#00261D] text-xs font-bold uppercase tracking-wider text-center"
                >
                  Sign In / Register
                </Link>
                <Link
                  to="/plan-trip"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-md"
                >
                  <Sparkles className="w-4 h-4 text-[#BBEAD5]" />
                  <span>Start Planning with Friday</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
