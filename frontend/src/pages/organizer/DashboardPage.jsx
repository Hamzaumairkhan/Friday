import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  CalendarCheck,
  CreditCard,
  Users,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Eye,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { organizersService } from '../../services/organizers';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function DashboardPage() {
  const { organizerProfile } = useAuth();
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [packagesData, bookingsData] = await Promise.all([
          organizersService.listMyPackages(),
          organizersService.listMyBookings(),
        ]);
        setPackages(packagesData || []);
        setBookings(bookingsData || []);
      } catch (err) {
        console.error('Error fetching organizer dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading workspace analytics..." />;
  }

  // Calculate real metrics from backend data
  const totalPackages = packages.length;
  const activePackages = packages.filter((p) => p.is_active).length;
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');
  const totalConfirmedTravelers = confirmedBookings.reduce((sum, b) => sum + (b.travelers || 0), 0);
  const estimatedRevenue = confirmedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

  return (
    <div className="space-y-12">
      {/* ─── Header Section (Stitch 5_organizer_workspace.html) ─────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <h1
            className="text-4xl sm:text-6xl font-normal text-black italic mb-2"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Good to see you, {organizerProfile?.name || 'Partner'}
          </h1>
          <p className="text-sm sm:text-base text-[#6F6F6F]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Here’s what’s happening with your upcoming departures, traveler bookings, and payment verifications.
          </p>
        </div>

        <div className="flex gap-3 shrink-0">
          <Link to="/organizer/bookings">
            <button className="px-6 py-3 border border-black/20 text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-black/5 transition-colors flex items-center gap-2 cursor-pointer">
              <Eye className="w-4 h-4" />
              View Bookings
            </button>
          </Link>
          <Link to="/organizer/trips/new">
            <button className="px-6 py-3 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-lg hover:scale-105 cursor-pointer">
              <PlusCircle className="w-4 h-4" />
              Create Package
            </button>
          </Link>
        </div>
      </header>

      {/* ─── Metrics Bento Grid (Stitch) ────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-white border border-black/10 rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs uppercase font-semibold text-[#6F6F6F] tracking-wider mb-2">Total Verified Revenue</p>
          <h3 className="text-3xl sm:text-4xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
            PKR {estimatedRevenue > 0 ? (estimatedRevenue / 1000000).toFixed(2) + 'M' : '0.00'}
          </h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
            <TrendingUp className="w-4 h-4" />
            <span>Direct payments verified</span>
          </div>
        </div>

        {/* Active Packages */}
        <div className="bg-white border border-black/10 rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs uppercase font-semibold text-[#6F6F6F] tracking-wider mb-2">Active Packages</p>
          <h3 className="text-3xl sm:text-4xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {activePackages || totalPackages}
          </h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-[#6F6F6F]">
            <Package className="w-4 h-4" />
            <span>Published on Marketplace</span>
          </div>
        </div>

        {/* Confirmed Travelers */}
        <div className="bg-white border border-black/10 rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs uppercase font-semibold text-[#6F6F6F] tracking-wider mb-2">Confirmed Travelers</p>
          <h3 className="text-3xl sm:text-4xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {totalConfirmedTravelers}
          </h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
            <Users className="w-4 h-4" />
            <span>Across upcoming trips</span>
          </div>
        </div>
      </section>

      {/* ─── Split Layout: Recent Bookings + Upcoming Departures ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Recent Bookings Feed (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <h3 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Recent Bookings
            </h3>
            <Link to="/organizer/bookings" className="text-xs font-bold text-black uppercase tracking-wider hover:underline">
              See All &rarr;
            </Link>
          </div>

          {bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-black/5 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {booking.user_name?.charAt(0) || 'T'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-sm font-semibold text-black truncate">{booking.user_name || 'Traveler'}</p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          booking.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#6F6F6F] mb-1">
                      Booked {booking.travelers} spot(s) for <span className="font-medium text-black">{booking.package_title || 'Tour Expedition'}</span>
                    </p>
                    <p className="text-[11px] text-[#6F6F6F]">
                      PKR {Number(booking.total_price || 0).toLocaleString()} • {booking.payment_status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#6F6F6F]">
              No bookings yet. As travelers reserve your packages, their verification details will appear here.
            </div>
          )}
        </div>

        {/* Upcoming Departures Panel (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <h3 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Upcoming Departures
            </h3>
            <Link to="/organizer/trips" className="text-xs font-bold text-black uppercase tracking-wider hover:underline">
              Manage &rarr;
            </Link>
          </div>

          {packages.length > 0 ? (
            <div className="space-y-6">
              {packages.slice(0, 3).map((pkg) => {
                const maxCap = pkg.max_travelers || 20;
                const filled = Math.min(maxCap, pkg.seats_booked || 0);
                const percent = Math.min(100, Math.round((filled / maxCap) * 100));

                return (
                  <div key={pkg.id} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="relative h-28 w-full rounded-xl overflow-hidden">
                      <img
                        src={pkg.image_url || '/images/stitch/stitch_asset_1.jpg'}
                        alt={pkg.title}
                        onError={(e) => {
                          if (!e.currentTarget.src.includes('/images/stitch/stitch_asset_1.jpg')) {
                            e.currentTarget.src = '/images/stitch/stitch_asset_1.jpg';
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-3 text-white text-xs font-semibold">
                        {pkg.duration_days} Days • {pkg.destination}
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <h4 className="text-base font-medium text-black truncate max-w-[200px]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                        {pkg.title}
                      </h4>
                      <span className="text-[11px] font-bold text-black">{filled}/{maxCap} Filled</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-700 h-full rounded-full" style={{ width: `${percent || 15}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#6F6F6F]">
              No departures published. Click "Create Package" to publish your first tour.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
