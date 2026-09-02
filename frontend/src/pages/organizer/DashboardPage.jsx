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
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  MapPin,
} from 'lucide-react';
import { organizersService } from '../../services/organizers';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function DashboardPage() {
  const { organizerProfile } = useAuth();
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic Package Filter & Carousel Pagination State
  const [selectedPackageId, setSelectedPackageId] = useState('ALL');
  const [carouselPage, setCarouselPage] = useState(0);
  const itemsPerPage = 3;

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

  // Determine active selected package object
  const activeSelectedPackage = packages.find((p) => p.id === selectedPackageId) || null;

  // Filter bookings based on selected package (or all)
  const filteredBookings = selectedPackageId === 'ALL'
    ? bookings
    : bookings.filter((b) => b.package_id === selectedPackageId);

  // Calculate metrics based on the current filter selection
  const totalPackages = packages.length;
  const activePackages = packages.filter((p) => p.is_active).length;

  // Revenue: count any booking where status is CONFIRMED, COMPLETED, PAID, or payment_status is VERIFIED, CONFIRMED, PAID
  const verifiedOrConfirmedBookings = filteredBookings.filter((b) => {
    const statusStr = (b.status || '').toUpperCase().trim();
    const payStatusStr = (b.payment_status || '').toUpperCase().trim();
    const isConfirmed =
      statusStr === 'CONFIRMED' ||
      statusStr === 'COMPLETED' ||
      statusStr === 'VERIFIED' ||
      statusStr === 'PAID';
    const isPayVerified =
      payStatusStr === 'VERIFIED' ||
      payStatusStr === 'CONFIRMED' ||
      payStatusStr === 'PAID';
    return isConfirmed || isPayVerified;
  });

  const totalConfirmedTravelers = verifiedOrConfirmedBookings.reduce(
    (sum, b) => sum + (Number(b.travelers) || 1),
    0
  );

  const estimatedRevenue = verifiedOrConfirmedBookings.reduce((sum, b) => {
    const price =
      Number(b.total_price) ||
      Number(b.total_amount) ||
      Number(b.amount) ||
      ((Number(b.price_per_person) || 0) * (Number(b.travelers) || 1)) ||
      0;
    return sum + price;
  }, 0);

  const formatRevenue = (amount) => {
    const num = Number(amount) || 0;
    if (num <= 0) return 'PKR 0';
    if (num >= 1000000) return `PKR ${(num / 1000000).toFixed(2)}M`;
    if (num >= 100000) return `PKR ${(num / 1000).toFixed(1)}K`;
    return `PKR ${Math.round(num).toLocaleString()}`;
  };

  // Carousel Pagination Calculations
  const maxCarouselPages = Math.ceil(packages.length / itemsPerPage);
  const visiblePackages = packages.slice(
    carouselPage * itemsPerPage,
    carouselPage * itemsPerPage + itemsPerPage
  );

  const handlePrevSlide = () => {
    setCarouselPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextSlide = () => {
    setCarouselPage((prev) => Math.min(maxCarouselPages - 1, prev + 1));
  };

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

      {/* ─── Active Package Filter Notification Banner ────────────────── */}
      {selectedPackageId !== 'ALL' && activeSelectedPackage && (
        <div className="bg-[#E7F7EE] border border-emerald-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00261D] text-[#BBEAD5] flex items-center justify-center shrink-0 shadow-2xs">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-800 text-white rounded-full">
                  FILTERING ACTIVE
                </span>
                <h4 className="text-sm font-bold text-[#00261D] truncate max-w-md">
                  {activeSelectedPackage.title}
                </h4>
              </div>
              <p className="text-xs text-[#00261D]/80 mt-0.5">
                Dashboard metrics, revenue, and Live Roster are now filtered specifically for this tour package.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedPackageId('ALL')}
            className="self-start sm:self-auto px-4 py-2 bg-white hover:bg-slate-100 text-[#00261D] border border-black/10 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Show All Tours</span>
          </button>
        </div>
      )}

      {/* ─── Metrics Bento Grid ───────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] uppercase font-bold text-[#717975] tracking-wider">
              {selectedPackageId !== 'ALL' ? 'Tour Verified Revenue' : 'Total Verified Revenue'}
            </p>
            {selectedPackageId !== 'ALL' && (
              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">Filtered</span>
            )}
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {formatRevenue(estimatedRevenue)}
          </h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
            <TrendingUp className="w-4 h-4" />
            <span>{verifiedOrConfirmedBookings.length} direct payment(s) verified</span>
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
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] uppercase font-bold text-[#717975] tracking-wider">
              {selectedPackageId !== 'ALL' ? 'Tour Confirmed Travelers' : 'Confirmed Travelers'}
            </p>
            {selectedPackageId !== 'ALL' && (
              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">Filtered</span>
            )}
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {totalConfirmedTravelers}
          </h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
            <Users className="w-4 h-4" />
            <span>{selectedPackageId !== 'ALL' ? 'Confirmed on this tour' : 'Across upcoming expeditions'}</span>
          </div>
        </div>
      </section>

      {/* ─── Split Layout: Recent Bookings + Upcoming Departures ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Recent Bookings Feed (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block">
                {selectedPackageId !== 'ALL' ? 'TOUR ROSTER' : 'LIVE ROSTER'}
              </span>
              <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {selectedPackageId !== 'ALL' ? `Bookings (${filteredBookings.length})` : 'Recent Bookings'}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {selectedPackageId !== 'ALL' && (
                <button
                  onClick={() => setSelectedPackageId('ALL')}
                  className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Show All
                </button>
              )}
              <Link to="/organizer/bookings" className="text-xs font-bold text-[#00261D] uppercase tracking-wider hover:underline">
                See All &rarr;
              </Link>
            </div>
          </div>

          {filteredBookings.length > 0 ? (
            <div className="space-y-3.5">
              {filteredBookings.slice(0, 6).map((booking) => {
                // Resolve real traveler name, filtering out placeholder names
                const placeholderNames = ['traveler', 'friday traveler', 'anonymous traveler', 'anonymous', 'user', 'guest', 'none', 'null', 'undefined', ''];
                const rawName = (booking.traveler_name || booking.user_name || '').trim();
                const isPlaceholder = !rawName || placeholderNames.includes(rawName.toLowerCase());
                let emailDerived = '';
                if (booking.traveler_email) {
                  const uname = booking.traveler_email.split('@')[0];
                  const clean = uname.replace(/[._\-+]/g, ' ').replace(/[0-9]/g, '').trim();
                  if (clean) {
                    emailDerived = clean.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  } else {
                    emailDerived = uname.charAt(0).toUpperCase() + uname.slice(1);
                  }
                }
                const travelerName = (!isPlaceholder && rawName) ? rawName : (emailDerived || 'Verified Traveler');
                const initial = travelerName.charAt(0).toUpperCase() || 'T';

                return (
                  <div
                    key={booking.id}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 hover:border-black/15 transition-all"
                  >
                    {booking.traveler_profile_picture ? (
                      <img
                        src={booking.traveler_profile_picture}
                        alt={travelerName}
                        className="w-10 h-10 rounded-full object-cover border border-black/10 shrink-0 shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                    <div className="w-10 h-10 rounded-full bg-[#00261D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {initial}
                    </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div>
                          <p className="text-sm font-bold text-[#00261D] truncate">{travelerName}</p>
                          {booking.traveler_email && (
                            <p className="text-[11px] text-[#717975] truncate">{booking.traveler_email}</p>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            booking.payment_status === 'VERIFIED' || booking.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {booking.payment_status === 'VERIFIED' ? 'VERIFIED' : booking.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#717975] mb-1">
                        Booked <span className="font-bold text-[#00261D]">{booking.travelers} spot(s)</span> for{' '}
                        <span className="font-semibold text-[#00261D]">{booking.package_title || 'Tour Expedition'}</span>
                      </p>
                      <p className="text-[11px] font-semibold text-[#420E00]">
                        PKR {Number(booking.total_price || 0).toLocaleString()} • Payment: {booking.payment_status || 'PENDING'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#717975] space-y-2">
              <Package className="w-8 h-8 mx-auto text-black/20" />
              <p>
                {selectedPackageId !== 'ALL'
                  ? 'No traveler bookings found for this specific tour package yet.'
                  : 'No bookings yet. As travelers reserve your packages, their verification details will appear here.'}
              </p>
            </div>
          )}
        </div>

        {/* Upcoming Departures Panel (2 Cols) with Carousel & Filter */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block">
                SCHEDULED TOURS ({packages.length})
              </span>
              <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Upcoming Departures
              </h3>
            </div>
            
            {/* Carousel Navigation Arrows */}
            {packages.length > itemsPerPage && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  disabled={carouselPage === 0}
                  className="w-8 h-8 rounded-full border border-black/10 bg-white hover:bg-slate-50 flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                  title="Previous Tour Packages"
                >
                  <ChevronLeft className="w-4 h-4 text-[#00261D]" />
                </button>
                <span className="text-[10px] font-bold text-[#717975] px-1">
                  {carouselPage + 1}/{maxCarouselPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  disabled={carouselPage >= maxCarouselPages - 1}
                  className="w-8 h-8 rounded-full border border-black/10 bg-white hover:bg-slate-50 flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                  title="Next Tour Packages"
                >
                  <ChevronRight className="w-4 h-4 text-[#00261D]" />
                </button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#717975] -mt-2">
            💡 Click any tour card below to filter dashboard revenue and traveler roster by that trip.
          </p>

          {packages.length > 0 ? (
            <div className="space-y-4">
              {visiblePackages.map((pkg) => {
                const maxCap = pkg.max_travelers || pkg.max_capacity || 20;
                const pkgBookings = bookings.filter((b) => b.package_id === pkg.id && (b.status === 'CONFIRMED' || b.payment_status === 'VERIFIED'));
                const filled = pkgBookings.reduce((sum, b) => sum + (Number(b.travelers) || 0), 0);
                const percent = Math.min(100, Math.round((filled / maxCap) * 100));
                const isSelected = selectedPackageId === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(isSelected ? 'ALL' : pkg.id)}
                    className={`space-y-3 p-4 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#E7F7EE] border-[#00261D] shadow-md ring-2 ring-[#00261D]/20'
                        : 'bg-[#F8FAF6] border-black/5 hover:border-black/20 hover:shadow-xs'
                    }`}
                  >
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
                      
                      {/* Selected Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-[#00261D] text-[#BBEAD5] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm">
                          Filtering Active
                        </div>
                      )}

                      <div className="absolute bottom-2 left-3 text-white text-xs font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{pkg.duration_days} Days • {pkg.destination}</span>
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
                      <div className="bg-[#00261D] h-full rounded-full transition-all" style={{ width: `${percent || 10}%` }} />
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
