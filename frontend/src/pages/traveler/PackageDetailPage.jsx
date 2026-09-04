import { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Sparkles,
  Phone,
  Eye,
  Navigation,
  Copy,
  Calendar,
  Compass,
} from 'lucide-react';
import { packagesService } from '../../services/packages';
import { organizersService } from '../../services/organizers';
import { bookingsService } from '../../services/bookings';
import { getContextualEmoji } from '../../utils/contextualEmoji';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function PackageDetailPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const { backendUser, role } = useAuth();
  const isOrganizer = (role || backendUser?.role) === 'ORGANIZER';

  const [pkg, setPkg] = useState(null);
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const viewRecordedRef = useRef(null);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewContent, setNewReviewContent] = useState('');

  // Booking Dialog State
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [travelersCount, setTravelersCount] = useState(2);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Clone State for Organizers
  const [isCloning, setIsCloning] = useState(false);

  const handleClonePackage = async () => {
    if (!pkg?.id) return;
    setIsCloning(true);
    try {
      toast.loading('Copying tour package into workspace...', { id: 'clone-pkg' });
      const res = await organizersService.clonePackage(pkg.id);
      const cloned = res?.data || res;
      toast.success('Tour package copied! Opening editor...', { id: 'clone-pkg' });
      navigate(`/organizer/trips/${cloned.id}/edit`);
    } catch (err) {
      console.error('Clone error:', err);
      toast.error(err.response?.data?.detail || err.message || 'Failed to duplicate package.', { id: 'clone-pkg' });
    } finally {
      setIsCloning(false);
    }
  };

  const fetchPackageReviews = async (pid) => {
    try {
      const revs = await packagesService.getReviews(pid || packageId);
      setReviews(revs?.data || revs || []);
    } catch (e) {
      console.error('Error fetching reviews:', e);
      setReviews([]);
    }
  };

  useEffect(() => {
    const fetchPackageDetails = async () => {
      setLoading(true);
      try {
        const pkgData = await packagesService.getPackage(packageId);
        setPkg(pkgData);

        if (pkgData.organizer_id) {
          organizersService.getOrganizer(pkgData.organizer_id).then(setOrganizer).catch(() => { });
        }
        fetchPackageReviews(packageId);

        // Record strictly 1 unique view for this visitor session
        if (viewRecordedRef.current !== packageId) {
          viewRecordedRef.current = packageId;
          packagesService.recordView(packageId).then((res) => {
            if (res && res.views_count !== undefined) {
              setPkg((prev) => prev ? { ...prev, views_count: res.views_count } : prev);
            }
          }).catch(() => { });
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReviewContent.trim()) {
      toast.error('Please enter review comments.');
      return;
    }
    setSubmittingReview(true);
    try {
      await packagesService.createReview(packageId, {
        rating: Number(newRating),
        title: newReviewTitle.trim() || undefined,
        content: newReviewContent.trim(),
      });
      toast.success('Thank you! Your review has been posted.');
      setNewReviewTitle('');
      setNewReviewContent('');
      setNewRating(5);
      fetchPackageReviews(packageId);
      const updatedPkg = await packagesService.getPackage(packageId);
      setPkg(updatedPkg);
    } catch (err) {
      console.error('Failed to submit review:', err);
      toast.error(err.response?.data?.detail || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!backendUser) {
      toast.error('Please sign in to book this expedition.');
      navigate('/login');
      return;
    }
    if (isOrganizer) {
      toast.error('Organizer accounts cannot book trips. Please use a traveler account.');
      return;
    }
    setIsBooking(true);
    try {
      const bookingData = {
        package_id: pkg.id,
        seats_booked: travelersCount,
        notes: bookingNotes.trim() || undefined,
      };
      const booking = await bookingsService.createBooking(bookingData);
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

  const rawHeroImage = pkg.image_url;
  const heroImage = rawHeroImage ? (rawHeroImage.startsWith('http://') ? rawHeroImage.replace('http://', 'https://') : rawHeroImage) : null;

  let itinerary = [];
  if (Array.isArray(pkg.activities) && pkg.activities.length > 0 && typeof pkg.activities[0] === 'object') {
    itinerary = pkg.activities.map((d, i) => ({
      day: d.day_number || i + 1,
      title: d.title || `Day ${i + 1}`,
      description: d.summary || d.description || '',
      activities: (d.activities || []).map((a, aIdx) => {
        if (typeof a === 'string') {
          return {
            title: a,
            description: '',
            start_time: '',
            end_time: '',
            location: pkg.destination,
            category: 'EXPLORATION',
            image_url: null,
            map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a + ', ' + pkg.destination)}`,
          };
        }
        const loc = a.location || pkg.destination;
        const rawImg = a.image_url || null;
        const safeImg = rawImg ? (rawImg.startsWith('http://') ? rawImg.replace('http://', 'https://') : rawImg) : null;
        return {
          title: a.title || a.location || `Stop ${aIdx + 1}`,
          description: a.description || '',
          start_time: a.start_time || '',
          end_time: a.end_time || '',
          location: loc,
          category: a.category || 'SIGHTSEEING',
          image_url: safeImg,
          estimated_cost: a.estimated_cost || 0,
          map_url: a.map_url || a.notes || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((a.title || loc) + ', ' + pkg.destination)}`,
        };
      }),
    }));
  } else if (Array.isArray(pkg.itinerary)) {
    itinerary = pkg.itinerary.map((d, i) => ({
      ...d,
      activities: (d.activities || []).map((a, aIdx) => {
        if (typeof a === 'string') {
          return {
            title: a,
            description: '',
            start_time: '',
            end_time: '',
            location: pkg.destination,
            category: 'EXPLORATION',
            image_url: null,
            map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a + ', ' + pkg.destination)}`,
          };
        }
        const loc = a.location || pkg.destination;
        const rawImg = a.image_url || null;
        const safeImg = rawImg ? (rawImg.startsWith('http://') ? rawImg.replace('http://', 'https://') : rawImg) : null;
        return {
          ...a,
          image_url: safeImg,
          map_url: a.map_url || a.notes || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((a.title || loc) + ', ' + pkg.destination)}`,
        };
      }),
    }));
  }

  const totalCalculated = (pkg.price_per_person || 0) * travelersCount;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28 md:pb-12 min-h-screen">
      {/* ─── Top Header Action Bar (Matching TripDetailPage) ───────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-4">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00261D] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Verified Tour Expedition</span>
          </span>

          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-[#717975] border border-black/5 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#717975]" />
            <span>{pkg.views_count || 0} Views</span>
          </span>

          {isOrganizer ? (
            <button
              onClick={handleClonePackage}
              disabled={isCloning}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#00261D]/90 transition-all shadow-sm cursor-pointer hover:scale-102 active:scale-98"
              title="Copy this tour package into your organizer workshop"
            >
              {isCloning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BBEAD5]" /> : <Copy className="w-3.5 h-3.5 text-[#BBEAD5]" />}
              <span>Copy & Edit Package</span>
            </button>
          ) : (
            <button
              onClick={() => setBookDialogOpen(true)}
              className="flex items-center gap-1.5 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#00261D]/90 transition-all shadow-sm cursor-pointer hover:scale-102 active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#BBEAD5]" />
              <span>Book Expedition</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Hero Overview Card (Matching TripDetailPage) ──────────── */}
      <div className="bg-white rounded-3xl overflow-hidden border border-black/10 shadow-xs">
        <div className="relative h-64 sm:h-80 w-full bg-gradient-to-br from-[#001E17] via-[#00261D] to-[#011410] overflow-hidden flex items-center justify-center">
          {heroImage ? (
            <img
              src={heroImage}
              alt={pkg.title}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const el = e.currentTarget.nextElementSibling;
                if (el) el.style.display = 'flex';
              }}
              className="w-full h-full object-cover"
            />
          ) : null}
          <div
            className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-emerald-200"
            style={{ display: heroImage ? 'none' : 'flex' }}
          >
            <span className="text-6xl sm:text-7xl mb-2 select-none">{getContextualEmoji(pkg.destination, pkg.title)}</span>
            <span className="text-xs uppercase tracking-widest font-semibold opacity-70">
              {pkg.destination || 'Expedition'}
            </span>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          <div className="absolute bottom-6 left-6 right-6 text-white space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[#BBEAD5] flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-[#BBEAD5]" />
                <span>Verified Tour Expedition</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-900/80 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                {pkg.is_active ? 'Active & Booking' : 'Fully Booked'}
              </span>
            </div>
            <h1
              className="text-3xl sm:text-5xl font-normal text-white leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {pkg.title}
            </h1>
          </div>
        </div>

        {/* 4 Summary Stat Cards Grid (Matching TripDetailPage) */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-black/5 bg-[#F8FAF6]/50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#717975] block mb-1">
              Destination
            </span>
            <span className="font-semibold text-xs sm:text-sm text-[#00261D] truncate block">
              {pkg.destination}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#717975] block mb-1">
              Duration
            </span>
            <span className="font-semibold text-xs sm:text-sm text-[#00261D] block">
              {pkg.duration_days} Days / {Math.max(1, pkg.duration_days - 1)} Nights
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#717975] block mb-1">
              Availability
            </span>
            <span className="font-semibold text-xs sm:text-sm text-[#00261D] block">
              {pkg.seats_booked || 2}/{pkg.max_travelers || 20} Seats
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#717975] block mb-1">
              Price Per Person
            </span>
            <span className="font-bold text-xs sm:text-sm text-[#420E00] block">
              PKR {Number(pkg.price_per_person || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Verified Host Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#00261D] border border-black/10 flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-2xs">
            {(organizer?.name || pkg.organizer_name || 'H').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wider font-bold text-[#717975]">Hosted by</span>
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Verified Operator</span>
              </span>
            </div>
            <h3 className="text-base font-bold text-[#00261D]">
              {organizer?.name || pkg.organizer_name || 'Verified Tour Host'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[#717975]">
              <span className="flex items-center gap-1 font-bold text-amber-600">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {pkg.rating > 0 ? pkg.rating.toFixed(1) : '5.0'}
              </span>
              <span>•</span>
              <span>{reviews.length || pkg.reviews_count || 1} verified reviews</span>
            </div>
          </div>
        </div>

        {pkg.contact_phone && (
          <a
            href={`https://wa.me/${pkg.contact_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I am interested in your tour package: ${pkg.title} on Friday.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Chat directly on WhatsApp"
          >
            <Phone className="w-4 h-4 text-emerald-700" />
            <span>WhatsApp Host</span>
          </a>
        )}
      </div>

      {/* ─── Expedition Overview & Inclusions Card ──────────────────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/10 shadow-xs space-y-5">
        <div>
          <span className="text-[11px] font-bold text-[#420E00] uppercase tracking-widest mb-1 block">
            About this Expedition
          </span>
          <h2
            className="text-2xl sm:text-3xl font-normal text-[#00261D] mb-3"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Expedition Narrative
          </h2>
          <p className="text-xs sm:text-sm text-[#414845] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            {pkg.description || 'Embark on an unforgettable expedition through breathtaking mountain passes, local cultural heritage, and curated adventures with our verified expert operator.'}
          </p>
        </div>

        {/* Inclusions & Exclusions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-black/5">
          <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>What is Included</span>
            </span>
            {pkg.inclusions && pkg.inclusions.length > 0 ? (
              <ul className="text-xs space-y-1.5 text-[#191C1A]">
                {pkg.inclusions.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3 h-3 text-emerald-700 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#717975]">Full guided logistics, accommodation, breakfasts, private transport & entry permits.</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-red-800 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5 text-red-600" />
              <span>What is Excluded</span>
            </span>
            {pkg.exclusions && pkg.exclusions.length > 0 ? (
              <ul className="text-xs space-y-1.5 text-[#191C1A]">
                {pkg.exclusions.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <X className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#717975]">Personal porter tips, optional souvenirs, and travel insurance.</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Day-by-Day Stops & Schedule (100% Matching TripDetailPage) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-black/10 pb-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#717975] block">
              Expedition Itinerary
            </span>
            <h3
              className="text-2xl font-normal text-[#00261D]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Day-by-Day Stops & Schedule ({pkg.duration_days || itinerary.length || 3} Days)
            </h3>
          </div>
        </div>

        {itinerary.length > 0 ? (
          <div className="flex flex-col gap-6 w-full max-w-full">
            {itinerary.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-black/10 shadow-xs space-y-4 w-full max-w-full"
              >
                <div>
                  <span className="text-[11px] font-bold text-[#420E00] uppercase tracking-widest mb-1 block">
                    DAY {item.day || idx + 1}
                  </span>
                  <h4
                    className="text-2xl font-normal text-[#00261D] mb-2 break-words"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {item.title}
                  </h4>
                  {item.description && (
                    <p
                      className="text-xs sm:text-sm text-[#414845] leading-relaxed break-words"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>

                {item.activities && item.activities.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-black/5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#717975] block">
                      Scheduled Stops & Activities
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {item.activities.map((act, actIdx) => {
                        const rawActThumb = act.image_url || heroImage;
                        const isInvalidActThumb =
                          !rawActThumb ||
                          rawActThumb.includes('instagram') ||
                          rawActThumb.includes('fbsbx') ||
                          rawActThumb.includes('panoramic_lake') ||
                          rawActThumb.includes('stitch_asset_6') ||
                          rawActThumb.startsWith('/images/stitch/');
                        const actThumb = isInvalidActThumb
                          ? null
                          : rawActThumb.startsWith('http://')
                            ? rawActThumb.replace('http://', 'https://')
                            : rawActThumb;
                        const mapUrl =
                          act.map_url ||
                          (act.latitude && act.longitude
                            ? `https://www.google.com/maps/search/?api=1&query=${act.latitude},${act.longitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              (act.title || act.location || pkg.destination) + ' Pakistan'
                            )}`);

                        return (
                          <div
                            key={actIdx}
                            className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 hover:border-black/15 transition-all text-xs space-y-3 relative group"
                          >
                            <div className="flex items-start gap-3">
                              {/* Activity Image Thumbnail */}
                              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#00261D] border border-black/10 shadow-2xs flex items-center justify-center">
                                {actThumb ? (
                                  <img
                                    src={actThumb}
                                    alt={act.title}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const el = e.currentTarget.nextElementSibling;
                                      if (el) el.style.display = 'flex';
                                    }}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : null}
                                <div
                                  className="w-full h-full flex items-center justify-center text-lg select-none"
                                  style={{ display: actThumb ? 'none' : 'flex' }}
                                >
                                  <span>
                                    {getContextualEmoji(pkg.destination, act.title, act.category)}
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-bold text-[#00261D] leading-snug break-words">
                                    {act.title}
                                  </span>
                                  {act.category && (
                                    <span className="text-[9px] font-bold bg-[#BBEAD5]/40 text-[#00261D] px-2 py-0.5 rounded-full uppercase shrink-0">
                                      {act.category}
                                    </span>
                                  )}
                                </div>
                                {act.description && (
                                  <p className="text-xs text-[#555E59] leading-relaxed break-words pt-1">
                                    {act.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-black/5 text-[10px] sm:text-[11px]">
                              {act.start_time || act.end_time ? (
                                <div className="flex items-center gap-1 font-semibold text-[#00261D] bg-white px-2 py-0.5 rounded-full border border-black/5">
                                  <Clock className="w-3 h-3 text-[#717975] shrink-0" />
                                  <span>
                                    {act.start_time}
                                    {act.end_time ? ` – ${act.end_time}` : ''}
                                  </span>
                                </div>
                              ) : (
                                <div />
                              )}

                              {act.location && (
                                <a
                                  href={mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 hover:underline cursor-pointer truncate max-w-[170px]"
                                  title="Open in Google Maps"
                                >
                                  <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                                  <span className="truncate">{act.location}</span>
                                </a>
                              )}

                              {act.estimated_cost ? (
                                <span className="font-bold text-[#420E00]">
                                  PKR {Number(act.estimated_cost).toLocaleString()}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white border border-black/10 space-y-3">
            <h4 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Expedition Schedule
            </h4>
            <p className="text-xs sm:text-sm text-[#414845] leading-relaxed">
              {pkg.description || 'Full day-by-day stops and activities will be finalized directly with your verified organizer upon booking.'}
            </p>
          </div>
        )}
      </div>

      {/* ─── Reviews & Ratings Card ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/10 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#717975] block">
              Traveler Feedback
            </span>
            <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Verified Reviews ({reviews.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-amber-600">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm">{pkg.rating > 0 ? pkg.rating.toFixed(1) : '5.0'}</span>
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#00261D]">{rev.reviewer_name || rev.user_name || 'Verified Explorer'}</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${s <= (rev.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                </div>
                {rev.title && <h5 className="font-bold text-xs text-[#00261D]">{rev.title}</h5>}
                <p className="text-xs text-[#555E59] leading-relaxed">{rev.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#717975] italic">Be the first explorer to review this tour package!</p>
        )}

        {/* Leave Review & Rating Form - Open to Everyone */}
        <form onSubmit={handleSubmitReview} className="pt-3 border-t border-black/5 space-y-3">
          <span className="text-xs font-bold text-[#00261D] block">Leave a Review &amp; Rating</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#717975]">Your Rating:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewRating(s)}
                  className="p-1 cursor-pointer transition-transform hover:scale-110"
                  title={`${s} Star${s > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-4 h-4 ${s <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-amber-600">{newRating}.0 / 5.0</span>
          </div>

          <input
            type="text"
            placeholder="Review title (e.g. Unforgettable Karakoram Adventure)"
            value={newReviewTitle}
            onChange={(e) => setNewReviewTitle(e.target.value)}
            className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
          />

          <textarea
            rows={3}
            placeholder="Share your experience on this trip..."
            value={newReviewContent}
            onChange={(e) => setNewReviewContent(e.target.value)}
            className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D] resize-none"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingReview}
              className="px-5 py-2 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {submittingReview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
              <span>Post Review</span>
            </button>
          </div>
        </form>
      </div>

      {/* ─── Booking Modal ─────────────────────────────────────────── */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 border border-black/10 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Book Tour Expedition
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717975]">
              {pkg.title} • {pkg.duration_days} Days
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-[#F8FAF6] rounded-2xl border border-black/5">
              <div>
                <span className="font-bold text-[#00261D] block">Price Per Person</span>
                <span className="text-[11px] text-[#717975]">Direct host bank transfer</span>
              </div>
              <span className="text-base font-bold text-[#00261D]">
                PKR {Number(pkg.price_per_person || 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F8FAF6] rounded-2xl border border-black/5">
              <div>
                <span className="font-bold text-[#00261D] block">Number of Travelers</span>
                <span className="text-[11px] text-[#717975]">Max {pkg.max_travelers || 20} seats available</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTravelersCount(Math.max(1, travelersCount - 1))}
                  className="w-8 h-8 rounded-full border border-black/15 bg-white text-[#00261D] font-bold flex items-center justify-center cursor-pointer hover:bg-slate-100"
                >
                  -
                </button>
                <span className="font-bold w-6 text-center text-sm">{travelersCount}</span>
                <button
                  type="button"
                  onClick={() => setTravelersCount(Math.min(pkg.max_travelers || 20, travelersCount + 1))}
                  className="w-8 h-8 rounded-full border border-black/15 bg-white text-[#00261D] font-bold flex items-center justify-center cursor-pointer hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 pt-1 border-t border-black/10">
              <span className="font-bold text-[#00261D]">Total Amount</span>
              <span className="text-xl font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                PKR {Number(totalCalculated).toLocaleString()}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block">
                Notes for Organizer (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Dietary requests, special pickups, or questions..."
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl text-xs resize-none focus:outline-none focus:border-[#00261D]"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => setBookDialogOpen(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-black/10 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBooking}
              disabled={isBooking}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isBooking ? <Loader2 className="w-4 h-4 animate-spin text-[#BBEAD5]" /> : 'Confirm & Proceed to Pay'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Fixed Mobile Bottom Floating Bar (Matching Screenshot 2 & 3) */}
      <div className="fixed bottom-[56px] left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/10 px-4 py-2.5 md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#717975] leading-none mb-0.5">
            Price Per Person
          </p>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-xl font-normal text-[#00261D]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              PKR {Number(pkg.price_per_person || 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-[#717975]">({pkg.duration_days || 3}D)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOrganizer ? (
            <button
              onClick={handleClonePackage}
              disabled={isCloning}
              className="px-5 py-2.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-98 transition-all"
              title="Copy & Edit Tour Package"
            >
              {isCloning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BBEAD5]" /> : <Copy className="w-3.5 h-3.5 text-[#BBEAD5]" />}
              <span>Copy Package</span>
            </button>
          ) : (
            <button
              onClick={() => setBookDialogOpen(true)}
              className="px-6 py-2.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer shrink-0 active:scale-98 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#BBEAD5]" />
              <span>Book Trip</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
