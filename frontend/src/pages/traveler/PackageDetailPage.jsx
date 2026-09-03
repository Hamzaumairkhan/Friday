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
  Phone,
  Eye,
  Navigation,
} from 'lucide-react';
import { packagesService } from '../../services/packages';
import { organizersService } from '../../services/organizers';
import { bookingsService } from '../../services/bookings';
import { tripsService } from '../../services/trips';
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
  const [activeTab, setActiveTab] = useState('ITINERARY');

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

  const fetchPackageReviews = async (pid) => {
    try {
      const revs = await packagesService.getReviews(pid || packageId);
      setReviews(revs || []);
    } catch (e) {
      console.error('Error fetching reviews:', e);
    }
  };

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
        fetchPackageReviews(packageId);

        // Record 1 unique view for this visitor
        packagesService.recordView(packageId).then((res) => {
          if (res && res.views_count !== undefined) {
            setPkg((prev) => prev ? { ...prev, views_count: res.views_count } : prev);
          }
        }).catch(() => {});
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
      toast.error(err.message || 'Failed to submit review. Please log in first.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!pkg) return;
    if (!backendUser) {
      toast.error('Please log in as a Traveler to book this tour.');
      navigate('/auth/login?redirect=' + encodeURIComponent(`/packages/${pkg.id}`));
      return;
    }
    if (isOrganizer) {
      toast.error('Organizer accounts cannot book tours. Please switch to a Traveler account to make a booking.');
      return;
    }
    setIsBooking(true);
    try {
      const booking = await bookingsService.createBooking({
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

  const heroImage = pkg.image_url;

  let itinerary = [];
  if (Array.isArray(pkg.activities) && pkg.activities.length > 0 && typeof pkg.activities[0] === 'object') {
    itinerary = pkg.activities.map((d, i) => ({
      day: d.day_number || i + 1,
      title: d.title || `Day ${i + 1}`,
      description: d.summary || '',
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
        return {
          title: a.title || a.location || `Stop ${aIdx + 1}`,
          description: a.description || '',
          start_time: a.start_time || '',
          end_time: a.end_time || '',
          location: loc,
          category: a.category || 'SIGHTSEEING',
          image_url: a.image_url || null,
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
        return {
          ...a,
          image_url: a.image_url || null,
          map_url: a.map_url || a.notes || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((a.title || loc) + ', ' + pkg.destination)}`,
        };
      }),
    }));
  }

  const totalCalculated = (pkg.price_per_person || 0) * travelersCount;

  return (
    <div className="w-full flex-1 flex justify-between min-h-screen">
      {/* ─── CENTER COLUMN: Expedition Details & Feed ───────────────── */}
      <main className="flex-1 max-w-[800px] flex flex-col min-h-screen border-r border-black/10 bg-[#F8FAF6]">
        {/* Hero Image Section */}
        <div className="relative w-full h-[55vh] md:h-[65vh] bg-gradient-to-br from-[#001E17] via-[#00261D] to-[#011410] overflow-hidden flex items-center justify-center">
          {heroImage ? (
            <img
              src={heroImage}
              alt={pkg.title}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const el = e.currentTarget.nextElementSibling;
                if (el) el.style.display = 'flex';
              }}
              className="w-full h-full object-cover opacity-90"
            />
          ) : null}
          <div
            className="w-full h-full flex flex-col items-center justify-center text-center p-8 text-emerald-200"
            style={{ display: heroImage ? 'none' : 'flex' }}
          >
            <span className="text-8xl mb-4 select-none">{getContextualEmoji(pkg.destination, pkg.title)}</span>
            <span className="text-sm uppercase tracking-widest font-semibold opacity-70">
              {pkg.destination || 'Expedition'}
            </span>
          </div>
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
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="bg-white/95 backdrop-blur-md text-[#00261D] px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest">
                {pkg.duration_days || 5} DAYS / {Math.max(1, (pkg.duration_days || 5) - 1)} NIGHTS
              </span>
              <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#BBEAD5]" />
                <span>{pkg.views_count || 0} {pkg.views_count === 1 ? 'view' : 'views'}</span>
              </span>
              {Number(pkg.rating) > 0 && (Number(pkg.reviews_count) > 0 || reviews.length > 0) ? (
                <span className="bg-[#FFDBD0] text-[#420E00] px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#420E00]" />
                  {Number(pkg.rating).toFixed(1)} ({pkg.reviews_count || reviews.length} {Number(pkg.reviews_count || reviews.length) === 1 ? 'review' : 'reviews'})
                </span>
              ) : (
                <span className="bg-white/95 backdrop-blur-md text-[#00261D] px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-800" />
                  ✨ New Tour Package
                </span>
              )}
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
              className={`pb-4 -mb-[18px] transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ITINERARY'
                  ? 'text-[#00261D] border-b-2 border-[#420E00]'
                  : 'text-[#717975] hover:text-[#00261D]'
              }`}
            >
              ITINERARY
            </button>
            <button
              onClick={() => setActiveTab('DETAILS')}
              className={`pb-4 -mb-[18px] transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'DETAILS'
                  ? 'text-[#00261D] border-b-2 border-[#420E00]'
                  : 'text-[#717975] hover:text-[#00261D]'
              }`}
            >
              DETAILS & INCLUSIONS
            </button>
            <button
              onClick={() => setActiveTab('REVIEWS')}
              className={`pb-4 -mb-[18px] transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'REVIEWS'
                  ? 'text-[#00261D] border-b-2 border-[#420E00]'
                  : 'text-[#717975] hover:text-[#00261D]'
              }`}
            >
              <span>REVIEWS</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/5 font-bold">
                {reviews.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('POLICIES')}
              className={`pb-4 -mb-[18px] transition-colors cursor-pointer whitespace-nowrap ${
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
                        <div className="space-y-3 pt-2">
                          {item.activities.map((act, actIdx) => (
                            <div
                              key={actIdx}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-white border border-black/10 gap-3.5 hover:border-black/20 hover:shadow-xs transition-all group"
                            >
                              <div className="flex items-start sm:items-center gap-3.5 w-full sm:w-auto flex-1">
                                {/* Activity Real Web Photography Thumbnail */}
                                {(() => {
                                  const rawActThumb = act.image_url || heroImage;
                                  const isInvalidActThumb = !rawActThumb || rawActThumb.includes('instagram') || rawActThumb.includes('fbsbx') || rawActThumb.includes('panoramic_lake') || rawActThumb.includes('stitch_asset_6') || rawActThumb.startsWith('/images/stitch/');
                                  const actThumb = isInvalidActThumb ? null : rawActThumb;

                                  return (
                                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden shrink-0 bg-[#00261D] border border-black/10 flex items-center justify-center">
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
                                        <span>{getContextualEmoji(pkg.destination, act.title, act.category)}</span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {(act.start_time || act.end_time) && (
                                      <div className="px-2.5 py-0.5 rounded-full bg-[#F8FAF6] border border-black/10 text-[10px] font-bold text-[#00261D] shrink-0 flex items-center gap-1 shadow-2xs">
                                        <Clock className="w-3 h-3 text-[#717975]" />
                                        <span>
                                          {act.start_time}{act.end_time ? ` – ${act.end_time}` : ''}
                                        </span>
                                      </div>
                                    )}
                                    {act.category && (
                                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                                        {act.category}
                                      </span>
                                    )}
                                  </div>

                                  <h5 className="text-sm font-bold text-[#00261D]">
                                    {act.title}
                                  </h5>

                                  {act.description && (
                                    <p className="text-xs text-[#555E59] leading-relaxed line-clamp-2">
                                      {act.description}
                                    </p>
                                  )}

                                  {act.location && (
                                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                      <p className="text-[11px] text-[#717975] flex items-center gap-1 truncate max-w-xs">
                                        <MapPin className="w-3 h-3 text-[#00261D] shrink-0" />
                                        <span className="truncate">{act.location}</span>
                                      </p>
                                      <a
                                        href={act.map_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00261D] text-[#BBEAD5] hover:bg-[#00261D]/90 text-[10px] font-bold tracking-wide transition-all shadow-2xs hover:scale-105 whitespace-nowrap"
                                        title="Open in Google Maps"
                                      >
                                        <Navigation className="w-2.5 h-2.5" />
                                        <span>View Map</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
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

          {/* Tab 3: Reviews & Ratings */}
          {activeTab === 'REVIEWS' && (
            <section className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-6">
                <div>
                  <h2 className="text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Traveler Reviews & Ratings
                  </h2>
                  <p className="text-xs text-[#717975] mt-1">
                    Authentic feedback from verified travelers who completed this expedition.
                  </p>
                </div>

                {(() => {
                  const actualCount = reviews.length;
                  const avgRating = actualCount > 0
                    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / actualCount)
                    : (Number(pkg.rating) > 0 ? Number(pkg.rating) : 0);

                  return (
                    <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-black/10 shadow-2xs">
                      <div className="w-12 h-12 rounded-xl bg-[#F8FAF6] border border-black/10 flex items-center justify-center text-[#00261D] font-black text-xl">
                        {avgRating > 0 ? avgRating.toFixed(1) : '–'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                avgRating > 0 && star <= Math.round(avgRating)
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] font-bold text-[#717975] mt-0.5">
                          {actualCount > 0
                            ? `Based on ${actualCount} genuine ${actualCount === 1 ? 'review' : 'reviews'}`
                            : 'No reviews yet for this expedition'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Submit a Review Form */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/10 shadow-xs space-y-4">
                <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Leave Your Experience Review
                </h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Rating Stars Picker */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#414845] block">
                      Select Rating Score
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setNewRating(star)}
                          className="p-1 text-2xl transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= newRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300 hover:text-amber-400'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-[#00261D] ml-2">
                        {newRating} of 5 Stars
                      </span>
                    </div>
                  </div>

                  {/* Review Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#414845] block">
                      Review Headline (Optional)
                    </label>
                    <input
                      value={newReviewTitle}
                      onChange={(e) => setNewReviewTitle(e.target.value)}
                      placeholder="e.g. Unforgettable Karakoram scenery & wonderful guide!"
                      className="w-full bg-[#F8FAF6] border border-black/10 rounded-xl px-4 py-2.5 text-xs text-[#00261D] focus:outline-none focus:border-[#00261D]"
                    />
                  </div>

                  {/* Review Comments */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#414845] block">
                      Your Comments & Experience Details
                    </label>
                    <textarea
                      rows={3}
                      value={newReviewContent}
                      onChange={(e) => setNewReviewContent(e.target.value)}
                      placeholder="Share what you liked about the itinerary, vehicle comfort, hotels, tour guide, and overall journey..."
                      className="w-full bg-[#F8FAF6] border border-black/10 rounded-xl px-4 py-2.5 text-xs text-[#00261D] focus:outline-none focus:border-[#00261D] resize-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-6 py-2.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Star className="w-3.5 h-3.5 text-[#BBEAD5]" />}
                      <span>{submittingReview ? 'Posting Review...' : 'Post Traveler Review'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-[#00261D]">
                  All Traveler Reviews ({reviews.length})
                </h4>

                {reviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="p-5 rounded-2xl bg-white border border-black/10 shadow-2xs space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#00261D] text-white flex items-center justify-center text-xs font-bold">
                              {(rev.reviewer_name || 'T').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#00261D]">
                                {rev.reviewer_name || 'Verified Traveler'}
                              </p>
                              <p className="text-[10px] text-[#717975]">
                                {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recent'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= Math.round(rev.rating) ? 'text-amber-500 fill-amber-500' : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {rev.title && (
                          <h5 className="text-xs font-bold text-[#00261D]">
                            {rev.title}
                          </h5>
                        )}

                        <p className="text-xs text-[#414845] leading-relaxed">
                          {rev.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-white border border-black/10 text-center space-y-2">
                    <p className="text-sm font-bold text-[#00261D]">No reviews yet for this expedition</p>
                    <p className="text-xs text-[#717975] max-w-md mx-auto">
                      Be the first traveler to rate this tour package and share your experience with the community!
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tab 4: Policies */}
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
          {isOrganizer ? (
            <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 py-4 rounded-xl text-xs font-bold uppercase tracking-widest text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
              Organizers cannot book trips
            </div>
          ) : (
          <>
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
          </>
          )}
        </div>

        {/* Host Badge */}
        <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-xs space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#00261D] border border-black/10 flex items-center justify-center text-lg font-bold text-white shrink-0">
              {(organizer?.name || pkg.organizer_name || 'H').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-[#00261D] flex items-center gap-1 mb-0.5 tracking-wider uppercase">
                VERIFIED HOST
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              </p>
              <p className="text-xs font-bold text-[#191C1A] truncate" title={organizer?.name || pkg.organizer_name}>
                {organizer?.name || pkg.organizer_name || 'Verified Tour Host'}
              </p>
            </div>
          </div>
          {(organizer?.contact_phone || pkg.contact_phone) && (
            <div className="pt-2.5 border-t border-black/5 flex items-center justify-between text-xs text-[#00261D]">
              <span className="text-[#717975] flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-700" /> WhatsApp:
              </span>
              <a
                href={`https://wa.me/${(organizer?.contact_phone || pkg.contact_phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${organizer?.name || pkg.organizer_name}, I am interested in your '${pkg.title}' tour package on Friday!`)}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-bold text-[#00261D] hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                title="Chat directly on WhatsApp"
              >
                <span>{organizer?.contact_phone || pkg.contact_phone}</span>
              </a>
            </div>
          )}
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

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
            <button
              onClick={() => setBookDialogOpen(false)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-black/10 text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBooking}
              disabled={isBooking}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 rounded-full bg-black text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              {isBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Pay'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
