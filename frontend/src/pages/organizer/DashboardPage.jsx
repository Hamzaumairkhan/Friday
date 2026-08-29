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
    <div className="space-y-10 sm:space-y-12">
      {/* ─── Header Section ─────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E7E9E5] text-[#00261D] inline-block mb-2">
            OPERATOR OVERVIEW
          </span>
          <h1
            className="text-4xl sm:text-6xl font-normal text-[#00261D] italic mb-2"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Good to see you, {organizerProfile?.name || 'Partner'}
          </h1>
          <p className="text-xs sm:text-sm text-[#717975] leading-relaxed max-w-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>
            Here’s what’s happening with your upcoming departures, traveler bookings, and payment verifications across Pakistan.
          </p>
        </div>

        <div className="flex gap-3 shrink-0 flex-wrap">
          <Link to="/organizer/bookings">
            <button className="px-6 py-3 border border-black/15 bg-white text-[#00261D] rounded-full text-xs font-bold uppercase tracking-wider hover:bg-black/5 transition-all flex items-center gap-2 cursor-pointer shadow-2xs">
              <Eye className="w-4 h-4 text-[#717975]" />
              <span>View Bookings</span>
            </button>
          </Link>
          <Link to="/organizer/trips/new">
            <button className="px-6 py-3 bg-[#00261D] hover:bg-[#00261D]/90 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all hover:scale-101 flex items-center gap-2 shadow-xs cursor-pointer">
              <PlusCircle className="w-4 h-4 text-[#BBEAD5]" />
              <span>Create Package</span>
            </button>
          </Link>
        </div>
      </header>

      {/* ─── Metrics Bento Grid ───────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-2xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] uppercase font-bold text-[#717975] tracking-wider mb-2">Total Verified Revenue</p>
          <h3 className="text-3xl sm:text-4xl font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            PKR {estimatedRevenue > 0 ? (estimatedRevenue / 1000000).toFixed(2) + 'M' : '0.00'}
          </h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
            <TrendingUp className="w-4 h-4" />
            <span>Direct payments verified</span>
          </div>
        </div>

        {/* Active Packages */}
        <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-2xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] uppercase font-bold text-[#717975] tracking-wider mb-2">Active Packages</p>
          <h3 className="text-3xl sm:text-4xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {activePackages || totalPackages}
          </h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-[#717975] font-semibold">
            <Package className="w-4 h-4 text-[#00261D]" />
            <span>Published on Marketplace</span>
          </div>
        </div>

        {/* Confirmed Travelers */}
        <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-2xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] uppercase font-bold text-[#717975] tracking-wider mb-2">Confirmed Travelers</p>
          <h3 className="text-3xl sm:text-4xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {totalConfirmedTravelers}
          </h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
            <Users className="w-4 h-4" />
            <span>Across upcoming expeditions</span>
          </div>
        </div>
      </section>

      {/* ─── Split Layout: Recent Bookings + Upcoming Departures ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Recent Bookings Feed (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block">LIVE ROSTER</span>
              <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Recent Bookings
              </h3>
            </div>
            <Link to="/organizer/bookings" className="text-xs font-bold text-[#00261D] uppercase tracking-wider hover:underline">
              See All &rarr;
            </Link>
          </div>

          {bookings.length > 0 ? (
            <div className="space-y-3.5">
              {bookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 hover:border-black/15 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-[#00261D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {booking.user_name?.charAt(0) || 'T'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-sm font-bold text-[#00261D] truncate">{booking.user_name || 'Traveler'}</p>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          booking.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#717975] mb-1">
                      Booked {booking.travelers} spot(s) for <span className="font-semibold text-[#00261D]">{booking.package_title || 'Tour Expedition'}</span>
                    </p>
                    <p className="text-[11px] font-semibold text-[#420E00]">
                      PKR {Number(booking.total_price || 0).toLocaleString()} • {booking.payment_status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#717975] space-y-2">
              <Package className="w-8 h-8 mx-auto text-black/20" />
              <p>No bookings yet. As travelers reserve your packages, their verification details will appear here.</p>
            </div>
          )}
        </div>

        {/* Upcoming Departures Panel (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block">SCHEDULED TRIPS</span>
              <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Upcoming Departures
              </h3>
            </div>
            <Link to="/organizer/trips" className="text-xs font-bold text-[#00261D] uppercase tracking-wider hover:underline">
              Manage &rarr;
            </Link>
          </div>

          {packages.length > 0 ? (
            <div className="space-y-4">
              {packages.slice(0, 3).map((pkg) => {
                const maxCap = pkg.max_travelers || 20;
                const filled = Math.min(maxCap, pkg.seats_booked || 0);
                const percent = Math.min(100, Math.round((filled / maxCap) * 100));

                return (
                  <div key={pkg.id} className="space-y-3 p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 hover:border-black/15 transition-all">
                    <div className="relative h-28 w-full rounded-xl overflow-hidden bg-[#00261D]">
                      <img
                        src={pkg.image_url || '/images/stitch/hero_mountains.jpg'}
                        alt={pkg.title}
                        onError={(e) => {
                          e.currentTarget.src = '/images/stitch/hero_mountains.jpg';
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-2 left-3 text-white text-xs font-semibold">
                        {pkg.duration_days} Days • {pkg.destination}
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <h4 className="text-base font-normal text-[#00261D] truncate max-w-[200px]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                        {pkg.title}
                      </h4>
                      <span className="text-[11px] font-bold text-[#00261D]">{filled}/{maxCap} Filled</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#E7E9E5] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00261D] h-full rounded-full transition-all" style={{ width: `${percent || 15}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#717975] space-y-2">
              <CalendarCheck className="w-8 h-8 mx-auto text-black/20" />
              <p>No departures published yet. Click "Create Package" to publish your first verified tour.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
