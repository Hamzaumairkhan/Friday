import { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/shared/NotificationBell';
import StatusBadge from '../components/shared/StatusBadge';

export default function OrganizerLayout() {
  const { backendUser, organizerProfile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
    { name: 'My Tour Packages', href: '/organizer/trips', icon: Package },
    { name: 'Bookings & Payments', href: '/organizer/bookings', icon: CalendarCheck },
    { name: 'Trip Groups & Chat', href: '/organizer/groups', icon: MessageSquare },
    { name: 'Company Profile', href: '/organizer/profile', icon: Building2 },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/register');
  };

  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/20">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-950 border-r border-border flex flex-col transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-20 px-6 border-b border-border flex items-center justify-between">
          <Link to="/organizer/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
              <span className="text-2xl font-bold" style={{ fontFamily: "'Instrument Serif', serif" }}>F</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl tracking-tight text-foreground leading-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Friday<sup style={{ fontSize: '9px', verticalAlign: 'super' }}>®</sup>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Organizer Workspace
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-muted-foreground hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Organizer Business Card */}
        <div className="p-5 mx-4 my-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground truncate max-w-[160px]">
              {organizerProfile?.name || backendUser?.name || 'My Tour Company'}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={organizerProfile?.verification_status || 'PENDING'} type="verification" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || (item.href !== '/organizer/dashboard' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Action: New Package */}
        <div className="p-4 border-t border-border">
          <Link to="/organizer/trips/new" onClick={() => setSidebarOpen(false)}>
            <button
              className="w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-transform hover:scale-[1.02] cursor-pointer bg-black text-white dark:bg-white dark:text-black shadow-md"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <PlusCircle className="w-4 h-4" />
              Create New Package
            </button>
          </Link>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex flex-col truncate max-w-[140px]">
            <span className="font-medium text-foreground truncate">{backendUser?.email}</span>
            <span className="text-[10px]">Organizer Account</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:pl-72 min-w-0">
        {/* Workspace Top Header */}
        <header className="sticky top-0 z-30 h-20 border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-foreground hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex flex-col">
              <h1
                className="text-2xl font-normal text-foreground"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Organizer Workspace
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell />
            <Link to="/explore" target="_blank" className="hidden sm:inline-flex text-xs font-medium text-muted-foreground hover:text-foreground">
              View Public Marketplace ↗
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
