import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  Check,
  X,
  Star,
  ArrowLeft,
  Car,
  Hotel,
  Calendar,
  CreditCard,
  Building,
  Loader2,
  Sparkles,
  Utensils,
  Footprints,
} from 'lucide-react';
import { packagesService } from '../../services/packages';
import { organizersService } from '../../services/organizers';
import { bookingsService } from '../../services/bookings';
import { tripsService } from '../../services/trips';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function PackageDetailPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ITINERARY');

  // Booking Dialog State
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [travelersCount, setTravelersCount] = useState(2);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    const fetchPackageDetails = async () => {
      setLoading(true);
      try {
        const pkgData = await packagesService.getPackage(packageId);
        setPkg(pkgData);

        if (pkgData.organizer_id) {
          const orgData = await organizersService.getOrganizer(pkgData.organizer_id);
          setOrganizer(orgData);
        }
      } catch (err) {
        console.error('Error fetching package details:', err);
        toast.error('Failed to load package details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPackageDetails();
  }, [packageId]);

  const handleCreateBooking = async () => {
    if (!pkg) return;
    setIsBooking(true);
    try {
      const trip = await tripsService.createTrip({
        destination: pkg.destination,
        duration: pkg.duration_days,
        travelers: Number(travelersCount),
        budget_per_person: pkg.price_per_person,
        budget_total: pkg.price_per_person * Number(travelersCount),
        title: `${pkg.title} (Booking)`,
      });

      const booking = await bookingsService.createBooking({
        trip_id: trip.id,
        package_id: pkg.id,
        travelers: Number(travelersCount),
        notes: bookingNotes,
      });

      toast.success('Booking initiated! Proceed to payment.');
      setBookDialogOpen(false);
      navigate(`/bookings/${booking.id}`);
    } catch (err) {
      console.error('Booking failed:', err);
      toast.error(err.message || 'Failed to create booking.');
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading expedition details..." />;
  }

  if (!pkg) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <h2 className="text-3xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Package not found
        </h2>
        <Link to="/explore" className="text-black font-semibold underline">
          &larr; Return to Marketplace
        </Link>
      </div>
    );
  }

  const defaultHero = '/images/stitch/stitch_asset_6.jpg';
  const heroImage = pkg.image_url || defaultHero;
  const itinerary = Array.isArray(pkg.itinerary) ? pkg.itinerary : [];
  const totalCalculated = (pkg.price_per_person || 0) * travelersCount;

  return (
    <div className="w-full flex-1 flex justify-between min-h-screen">
      {/* ─── CENTER COLUMN: Expedition Details & Feed ───────────────── */}
      <main className="flex-1 max-w-[800px] flex flex-col min-h-screen border-r border-black/10 bg-[#F8FAF6]">
        {/* Hero Image Section */}
        <div className="relative w-full h-[55vh] md:h-[65vh] bg-[#00261D] overflow-hidden">
          <img
            src={heroImage}
            alt={pkg.title}
            onError={(e) => {
              e.currentTarget.src = defaultHero;
            }}
            className="w-full h-full object-cover opacity-90"
          />
          {/* Dark Matte Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Back Button (Mobile/Tablet) */}
          <button
            onClick={() => navigate('/explore')}
            className="absolute top-4 left-4 lg:hidden w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#00261D] shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 flex flex-col justify-end text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-white/95 backdrop-blur-md text-[#00261D] px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest">
                {pkg.duration_days || 5} DAYS / {Math.max(1, (pkg.duration_days || 5) - 1)} NIGHTS
              </span>
              <span className="bg-[#FFDBD0] text-[#420E00] px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-[#420E00]" />
                {organizer?.rating || '4.9'}
              </span>
            </div>

            <h1
              className="text-4xl sm:text-6xl font-normal text-white mb-2 leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {pkg.title}
            </h1>

            <p className="text-xs sm:text-sm text-white/90 max-w-xl leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              {pkg.description || 'A serene journey through majestic mountain passes, blending rugged adventure with verified local accommodations.'}
            </p>
          </div>
        </div>

        {/* Content Below Hero */}
        <div className="p-6 md:p-10 flex flex-col gap-10 bg-[#F8FAF6]">
          {/* Overview Tabs */}
          <div className="flex gap-6 border-b border-black/10 pb-4 overflow-x-auto no-scrollbar text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveTab('ITINERARY')}
              className={`pb-4 -mb-[18px] transition-colors cursor-pointer ${
                activeTab === 'ITINERARY'
                  ? 'text-[#00261D] border-b-2 border-[#420E00]'
                  : 'text-[#717975] hover:text-[#00261D]'
              }`}
            >
              ITINERARY
            </button>
            <button
              onClick={() => setActiveTab('DETAILS')}
              className={`pb-4 -mb-[18px] transition-colors cursor-pointer ${
                activeTab === 'DETAILS'
                  ? 'text-[#00261D] border-b-2 border-[#420E00]'
                  : 'text-[#717975] hover:text-[#00261D]'
              }`}
            >
              DETAILS & INCLUSIONS
            </button>
            <button
              onClick={() => setActiveTab('POLICIES')}
              className={`pb-4 -mb-[18px] transition-colors cursor-pointer ${
                activeTab === 'POLICIES'
                  ? 'text-[#00261D] border-b-2 border-[#420E00]'
                  : 'text-[#717975] hover:text-[#00261D]'
              }`}
            >
              POLICIES
            </button>
          </div>

          {/* Tab 1: Itinerary Timeline */}
          {activeTab === 'ITINERARY' && (
            <section className="space-y-6">
              <h2
                className="text-3xl font-normal text-[#00261D]"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Your Journey
              </h2>

              {itinerary.length > 0 ? (
                <div className="relative pl-6 md:pl-8 border-l border-black/20 flex flex-col gap-8">
                  {itinerary.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Terracotta Dot */}
                      <div className="absolute -left-[31px] md:-left-[39px] w-4 h-4 rounded-full bg-[#420E00] border-4 border-[#F8FAF6]" />

                      <span className="text-[11px] font-bold text-[#420E00] uppercase tracking-widest mb-1 block">
                        DAY {item.day || idx + 1}
                      </span>
                      <h4
                        className="text-2xl font-normal text-[#00261D] mb-2"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      >
                        {item.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#414845] leading-relaxed mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {item.description}
                      </p>

                      {item.activities && item.activities.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.activities.map((act, actIdx) => (
                            <span
                              key={actIdx}
                              className="px-3 py-1 rounded-full text-xs bg-[#E7E9E5] text-[#191C1A] font-medium"
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-black/10 space-y-3">
                  <h4 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Expedition Schedule
                  </h4>
                  <p className="text-xs sm:text-sm text-[#414845] leading-relaxed">
                    {pkg.description || 'Full day-by-day stops and activities will be finalized directly with your verified organizer upon booking.'}
                  </p>
                  {pkg.activities && pkg.activities.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {pkg.activities.map((act, aIdx) => (
                        <span key={aIdx} className="px-3 py-1 rounded-full text-xs bg-[#E7E9E5] text-[#00261D] font-medium">
                          {act}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Tab 2: Details & Inclusions */}
          {activeTab === 'DETAILS' && (
            <section className="space-y-6">
              <h2 className="text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Expedition Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-black/10 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-[#717975] font-bold">Included</span>
                  <ul className="text-xs space-y-2 text-[#191C1A]">
                    {(pkg.inclusions || ['Dedicated AC Coaster / Saloon', 'Hotel & Resort Accommodations', 'Breakfast & Dinner', 'Tour Guide & Tolls']).map((inc, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-black/10 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-[#717975] font-bold">Excluded</span>
                  <ul className="text-xs space-y-2 text-[#717975]">
                    {(pkg.exclusions || ['Personal gear & laundry', 'Jeep charges for off-road tracks', 'Travel insurance', 'Extra snacks/beverages']).map((exc, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{exc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Tab 3: Policies */}
          {activeTab === 'POLICIES' && (
            <section className="space-y-4 p-6 rounded-2xl bg-white border border-black/10">
              <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Direct Transparent Booking Policy
              </h2>
              <p className="text-xs text-[#414845] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Friday connects you directly with independent Pakistani expedition leaders. After reserving, you will receive the host's direct bank/Easypaisa/JazzCash account details. Upload your payment screenshot to receive official verification from the host.
              </p>
            </section>
          )}

          {/* Bento Grid: What's Included (Stitch 58dc057cec0b46ada1957bc7534df57f) */}
          <section className="pt-4 border-t border-black/10">
            <h2
              className="text-3xl font-normal text-[#00261D] mb-6"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              What's Included
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Lodging */}
              <div className="bg-white p-6 rounded-2xl border border-black/10 flex flex-col gap-3 shadow-xs">
                <Hotel className="w-6 h-6 text-[#420E00]" />
                <div>
                  <h4 className="text-lg font-normal text-[#00261D] mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Premium Lodging
                  </h4>
                  <p className="text-xs text-[#717975] leading-relaxed">
                    {pkg.accommodation_type || 'Carefully selected heritage lodges and boutique guest houses with valley views.'}
                  </p>
                </div>
              </div>

              {/* Transport */}
              <div className="bg-white p-6 rounded-2xl border border-black/10 flex flex-col gap-3 shadow-xs">
                <Car className="w-6 h-6 text-[#420E00]" />
                <div>
                  <h4 className="text-lg font-normal text-[#00261D] mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Private Transport
                  </h4>
                  <p className="text-xs text-[#717975] leading-relaxed">
                    {pkg.transportation_type || 'Comfortable late-model AC Coaster / SUV for the duration with expert mountain driver.'}
                  </p>
                </div>
              </div>

              {/* Meals */}
              <div className="bg-white p-6 rounded-2xl border border-black/10 flex flex-col gap-3 shadow-xs">
                <Utensils className="w-6 h-6 text-[#420E00]" />
                <div>
                  <h4 className="text-lg font-normal text-[#00261D] mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Curated Meals
                  </h4>
                  <p className="text-xs text-[#717975] leading-relaxed">
                    Daily fresh breakfast and traditional local feast dinners included throughout the trip.
                  </p>
                </div>
              </div>

              {/* Guide */}
              <div className="bg-white p-6 rounded-2xl border border-black/10 flex flex-col gap-3 shadow-xs">
                <Footprints className="w-6 h-6 text-[#420E00]" />
                <div>
                  <h4 className="text-lg font-normal text-[#00261D] mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Expert Guide
                  </h4>
                  <p className="text-xs text-[#717975] leading-relaxed">
                    Experienced local guide providing rich historical context and high-altitude navigation.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ─── RIGHT COLUMN: Sticky Booking & Verified Host (Desktop) ── */}
      <aside className="hidden xl:flex flex-col w-[340px] p-6 shrink-0 sticky top-0 h-screen overflow-y-auto bg-[#F8FAF6] space-y-6">
        {/* Pricing Card */}
        <div className="bg-white p-6 rounded-2xl border border-black/10 shadow-lg space-y-5">
          <div className="flex justify-between items-end pb-4 border-b border-black/10">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#717975] mb-1">
                PRICE PER PERSON
              </p>
              <p
                className="text-3xl font-normal text-[#00261D] leading-none"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                PKR {Number(pkg.price_per_person || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#717975] mb-1">
                AVAILABILITY
              </p>
              <p className="text-xs font-semibold text-[#420E00]">
                <span className="font-bold">{pkg.seats_booked || 2}/{pkg.max_travelers || 20}</span> seats filled
              </p>
            </div>
          </div>

          {/* Travel Summary Rows */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-[#191C1A]">
              <span className="flex items-center gap-2 text-[#717975]">
                <Calendar className="w-4 h-4" /> {pkg.duration_days || 5} Days Expedition
              </span>
            </div>
            <div className="flex justify-between items-center text-[#191C1A]">
              <span className="flex items-center gap-2 text-[#717975]">
                <Users className="w-4 h-4" /> {travelersCount} Traveler(s)
              </span>
              <button
                onClick={() => setBookDialogOpen(true)}
                className="underline text-xs font-bold text-[#00261D] cursor-pointer"
              >
                Edit
              </button>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setBookDialogOpen(true)}
            className="w-full bg-[#00261D] text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#00261D]/90 transition-all cursor-pointer shadow-md"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Book this trip
          </button>

          <p className="text-[11px] text-[#717975] text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            You won't be charged yet.
          </p>
        </div>

        {/* Host Badge */}
        <div className="flex items-center gap-3.5 bg-white p-4 rounded-2xl border border-black/10 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-black/10 flex items-center justify-center text-lg font-bold text-black shrink-0">
            {organizer?.name?.charAt(0) || 'H'}
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#00261D] flex items-center gap-1 mb-0.5 tracking-wider uppercase">
              VERIFIED HOST
              <ShieldCheck className="w-3.5 h-3.5 text-[#420E00]" />
            </p>
            <p className="text-xs font-bold text-[#191C1A] truncate max-w-[180px]">
              {organizer?.name || 'Alpine Escapes Pakistan'}
            </p>
          </div>
        </div>
      </aside>

      {/* Booking Modal */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-white border border-border">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-3xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Reserve Your Spot
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6F6F6F]">
              Confirm your reservation for <strong>{pkg.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-wider block">
                Number of Travelers
              </label>
              <input
                type="number"
                min="1"
                max={pkg.max_travelers || 20}
                value={travelersCount}
                onChange={(e) => setTravelersCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-50 border border-black/10 rounded-2xl py-3 px-4 text-sm font-semibold text-black focus:outline-none focus:border-black"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-black/5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6F6F6F]">Travelers:</span>
                <span className="font-semibold">{travelersCount} Person(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6F6F6F]">Total Due:</span>
                <span className="font-bold text-black">PKR {Number(totalCalculated).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Special Requests / Notes</label>
              <textarea
                placeholder="Any dietary requirements, pickup location preference..."
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                rows={3}
                className="w-full p-3 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <button
              onClick={() => setBookDialogOpen(false)}
              className="px-6 py-2.5 rounded-full border border-black/10 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBooking}
              disabled={isBooking}
              className="px-8 py-2.5 rounded-full bg-black text-white text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer"
            >
              {isBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Proceed to Payment'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
