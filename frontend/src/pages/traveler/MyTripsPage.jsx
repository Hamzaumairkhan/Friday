import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Luggage,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Share2,
  Globe,
  Lock,
  Copy,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { bookingsService } from '../../services/bookings';
import { tripsService } from '../../services/trips';
import { useAuth } from '../../context/AuthContext';
import { getContextualEmoji } from '../../utils/contextualEmoji';
import StatusBadge from '../../components/shared/StatusBadge';
import EmptyState from '../../components/shared/EmptyState';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function MyTripsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ai_trips');
  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [tripToDelete, setTripToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Share modal state
  const [shareTripModal, setShareTripModal] = useState(null);
  const [allowPublicShare, setAllowPublicShare] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);



  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsData, tripsData] = await Promise.all([
        bookingsService.listUserBookings().catch(() => []),
        tripsService.listTrips().catch(() => []),
      ]);

      let allTrips = Array.isArray(tripsData) ? [...tripsData] : [];

      // Check for local storage draft if not published yet
      try {
        const savedDraftStr = localStorage.getItem('friday_trip_draft');
        if (savedDraftStr) {
          const localDraft = JSON.parse(savedDraftStr);
          if (localDraft && localDraft.destination) {
            const alreadyExists = localDraft.generatedTripId
              ? allTrips.some((t) => t.id === localDraft.generatedTripId)
              : false;

            if (!alreadyExists) {
              allTrips.unshift({
                id: 'local-draft-autosave',
                title: localDraft.title || `Trip to ${localDraft.destination || 'Pakistan'} (Draft)`,
                destination: localDraft.destination || 'Pakistan',
                origin: localDraft.origin || 'Islamabad',
                duration: localDraft.duration_days || 3,
                budget_total: localDraft.budget_total || 25000,
                status: 'DRAFT',
                image_url: null,
                start_date: localDraft.departure_date,
                created_at: new Date().toISOString(),
                is_local_draft: true,
              });
            }
          }
        }
      } catch (e) {
        console.error('Error reading local draft:', e);
      }

      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setTrips(allTrips);
    } catch (err) {
      console.error('Error fetching trips & bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const confirmDelete = async () => {
    if (!tripToDelete) return;
    setIsDeleting(true);
    try {
      if (tripToDelete.is_local_draft || tripToDelete.id === 'local-draft') {
        localStorage.removeItem('friday_trip_draft');
        setTrips((prev) => prev.filter((t) => t.id !== tripToDelete.id));
        toast.success('Draft plan successfully deleted.');
      } else {
        await tripsService.deleteTrip(tripToDelete.id);
        setTrips((prev) => prev.filter((t) => t.id !== tripToDelete.id));
        toast.success('Trip plan successfully deleted.');
      }
      setTripToDelete(null);
    } catch (err) {
      console.error('Failed to delete trip:', err);
      toast.error(err.message || 'Failed to delete trip.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenShare = (trip) => {
    setShareTripModal(trip);
    setAllowPublicShare(Boolean(trip.is_public));
    setCopiedLink(false);
  };

  const handleConfirmShare = async () => {
    if (!shareTripModal) return;
    setIsSharing(true);
    try {
      if (allowPublicShare && !shareTripModal.is_public) {
        await tripsService.toggleVisibility(shareTripModal.id, true);
        setTrips((prev) =>
          prev.map((t) => (t.id === shareTripModal.id ? { ...t, is_public: true } : t))
        );
      }
      const link = `${window.location.origin}/trips/${shareTripModal.id}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success('Public itinerary link copied to clipboard!');
      setTimeout(() => {
        setShareTripModal(null);
        setCopiedLink(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to share trip:', err);
      toast.error('Failed to update trip sharing.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCloneTrip = async (tripId) => {
    try {
      toast.loading('Cloning itinerary to your private workspace...', { id: 'clone-my-trip' });
      const res = await tripsService.cloneTrip(tripId);
      toast.success(res.message || 'Trip cloned! Opening your custom draft...', { id: 'clone-my-trip' });
      const targetId = res.id || res.trip?.id;
      navigate(`/plan-trip?tripId=${targetId}`);
    } catch (err) {
      console.error('Error cloning trip:', err);
      toast.error(err.response?.data?.detail || err.message || 'Failed to clone trip.', { id: 'clone-my-trip' });
    }
  };

  return (
    <div className="w-full flex-1 flex justify-center px-4 sm:px-8 lg:px-12 py-8 min-h-screen bg-[#F8FAF6]">
      <div className="w-full max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-4xl sm:text-5xl font-normal text-[#00261D]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              My Trips & Expeditions
            </h1>
            <p className="text-sm text-[#717975] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Review your bespoke AI-crafted journeys and booked trips organized by experts.
            </p>
          </div>

          <div className="flex gap-3">
            <Link to="/explore">
              <button className="px-5 py-2.5 rounded-full border border-black/10 text-xs font-semibold hover:bg-black/5 transition-colors cursor-pointer">
                Marketplace
              </button>
            </Link>
            <Link to="/plan-trip?new=1" onClick={() => localStorage.removeItem('friday_trip_draft')}>
              <button className="px-5 py-2.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#00261D]/90 transition-all shadow-xs cursor-pointer">
                + Plan New Trip
              </button>
            </Link>
          </div>
        </div>

        {/* Tabs: AI Planned Trips, Drafts, Organizer Bookings */}
        {(() => {
          const isAITrip = (t) => t.status !== 'DRAFT' && t.status !== 'BOOKED' && !t.title?.includes('(Booking)') && !t.is_organizer_booking;
          const isDraftTrip = (t) => t.status === 'DRAFT' && !t.title?.includes('(Booking)');
          const publishedTrips = trips.filter(isAITrip);
          const draftTrips = trips.filter(isDraftTrip);
          return (
            <div className="flex border-b border-black/10 space-x-8">
              <button
                onClick={() => setActiveTab('ai_trips')}
                className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${activeTab === 'ai_trips'
                  ? 'text-[#00261D]'
                  : 'text-[#717975] hover:text-[#00261D]'
                  }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Planned Trips ({publishedTrips.length})
                {activeTab === 'ai_trips' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00261D]" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('drafts')}
                className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${activeTab === 'drafts'
                  ? 'text-[#00261D]'
                  : 'text-[#717975] hover:text-[#00261D]'
                  }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span>Drafts</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'drafts' ? 'bg-amber-100 text-amber-900' : 'bg-black/5 text-[#717975]'
                    }`}
                >
                  {draftTrips.length}
                </span>
                {activeTab === 'drafts' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00261D]" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('bookings')}
                className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${activeTab === 'bookings'
                  ? 'text-[#00261D]'
                  : 'text-[#717975] hover:text-[#00261D]'
                  }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                bookings ({bookings.length})
                {activeTab === 'bookings' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00261D]" />
                )}
              </button>
            </div>
          );
        })()}

        {/* Tab Content */}
        {loading ? (
          <LoadingSpinner text="Fetching your travel itineraries..." />
        ) : activeTab === 'ai_trips' ? (
          (() => {
            const isAITrip = (t) => t.status !== 'DRAFT' && t.status !== 'BOOKED' && !t.title?.includes('(Booking)') && !t.is_organizer_booking;
            const publishedTrips = trips.filter(isAITrip);
            return publishedTrips.length === 0 ? (
              <EmptyState
                title="No Published AI Trips Yet"
                description="Tell Friday where you've been thinking about going. The AI planner will craft a complete custom itinerary with routes, stays, and budget."
                actionText="Plan a Trip with Friday"
                actionHref="/plan-trip?new=1"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedTrips.map((trip) => {
                  const isStitch = !trip.image_url || trip.image_url.startsWith('/images/stitch/');
                  const validImage = isStitch ? null : trip.image_url;
                  return (
                    <div
                      key={trip.id}
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      className="rounded-3xl border border-black/10 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer hover:border-black/30"
                    >
                      {/* Destination Image Preview Header */}
                      <div className="relative w-full h-40 bg-gradient-to-br from-[#001E17] via-[#00261D] to-[#011410] overflow-hidden flex items-center justify-center">
                        {validImage ? (
                          <img
                            src={validImage}
                            alt={trip.destination || 'Trip'}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const el = e.currentTarget.nextElementSibling;
                              if (el) el.style.display = 'flex';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : null}
                        <div
                          className="w-full h-full flex flex-col items-center justify-center text-center p-4 text-emerald-200"
                          style={{ display: validImage ? 'none' : 'flex' }}
                        >
                          <span className="text-4xl mb-1 select-none">{getContextualEmoji(trip.destination, trip.title)}</span>
                          <span className="text-[10px] uppercase tracking-widest font-semibold opacity-70">
                            {trip.destination || 'Expedition'}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

                        {/* Visibility Pill */}
                        <div className="absolute top-3 left-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${trip.is_public
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30'
                              : 'bg-black/60 text-white/90 border-white/20'
                              }`}
                          >
                            {trip.is_public ? 'Public Feed' : 'Private'}
                          </span>
                        </div>

                        {/* Top Action Icons: Clone, Share & Delete */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloneTrip(trip.id);
                            }}
                            className="w-8 h-8 rounded-full bg-black/50 hover:bg-[#00261D] backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Duplicate / Clone into New Draft"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenShare(trip);
                            }}
                            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Share Itinerary Link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTripToDelete(trip);
                            }}
                            className="w-8 h-8 rounded-full bg-black/50 hover:bg-red-600 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Trip Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="absolute bottom-3 left-4 right-4">
                          <h3
                            className="text-xl font-normal text-white truncate"
                            style={{ fontFamily: "'Instrument Serif', serif" }}
                          >
                            {trip.title || `${trip.destination || 'Pakistan'}, at your pace`}
                          </h3>
                          <p className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>{trip.destination || 'Pakistan'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Card Content & Details */}
                      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-black/10 text-xs">
                          <div>
                            <span className="text-[9px] text-[#717975] uppercase block font-semibold">Destination</span>
                            <span className="font-bold text-[#00261D] truncate block">
                              {trip.destination || 'Pakistan'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#717975] uppercase block font-semibold">Duration</span>
                            <span className="font-bold text-[#00261D]">{trip.duration || 4} Days</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#717975] uppercase block font-semibold">Group</span>
                            <span className="font-bold text-[#00261D]">{trip.travelers || 1} Person(s)</span>
                          </div>
                        </div>

                        {/* Footer Budget & View CTA */}
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-[10px] text-[#717975] block uppercase font-semibold">Budget</span>
                            <span className="text-sm font-bold text-[#420E00]">
                              Rs. {Number(trip.budget_total || 0).toLocaleString()}
                            </span>
                          </div>

                          <Link to={`/trips/${trip.id}`}>
                            <button className="px-4 py-2 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
                              <span>View Itinerary</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : activeTab === 'drafts' ? (
          (() => {
            const draftTrips = trips.filter((t) => t.status === 'DRAFT');
            return draftTrips.length === 0 ? (
              <EmptyState
                title="No Saved Drafts"
                description="When you start planning a trip or reload the page mid-way, your in-progress expedition is saved here as a draft until you publish."
                actionText="Start a New Plan"
                actionHref="/plan-trip"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {draftTrips.map((trip) => {
                  const isStitch = !trip.image_url || trip.image_url.startsWith('/images/stitch/');
                  const validImage = isStitch ? null : trip.image_url;
                  return (
                    <div
                      key={trip.id}
                      className="rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/20 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      {/* Destination Image Preview Header */}
                      <div className="relative w-full h-40 bg-gradient-to-br from-[#001E17] via-[#00261D] to-[#011410] overflow-hidden flex items-center justify-center">
                        {validImage ? (
                          <img
                            src={validImage}
                            alt={trip.destination || 'Trip'}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const el = e.currentTarget.nextElementSibling;
                              if (el) el.style.display = 'flex';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                          />
                        ) : null}
                        <div
                          className="w-full h-full flex flex-col items-center justify-center text-center p-4 text-emerald-200"
                          style={{ display: validImage ? 'none' : 'flex' }}
                        >
                          <span className="text-4xl mb-1 select-none">{getContextualEmoji(trip.destination, trip.title)}</span>
                          <span className="text-[10px] uppercase tracking-widest font-semibold opacity-70">
                            {trip.destination || 'Expedition'}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                        {/* Draft Status Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-xs flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>Draft • Unpublished</span>
                          </span>
                        </div>

                        {/* Delete Draft Action */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <button
                            onClick={() => setTripToDelete(trip)}
                            className="w-8 h-8 rounded-full bg-black/60 hover:bg-red-600 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Discard Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="absolute bottom-3 left-4 right-4">
                          <h3
                            className="text-xl font-normal text-white truncate"
                            style={{ fontFamily: "'Instrument Serif', serif" }}
                          >
                            {trip.title || `${trip.destination || 'Pakistan'} (Draft)`}
                          </h3>
                          <p className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-amber-400" />
                            <span>{trip.destination || 'Pakistan'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Card Content & Details */}
                      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-black/10 text-xs">
                          <div>
                            <span className="text-[9px] text-[#717975] uppercase block font-semibold">Origin</span>
                            <span className="font-bold text-[#00261D] truncate block">
                              {trip.origin || 'Islamabad'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#717975] uppercase block font-semibold">Duration</span>
                            <span className="font-bold text-[#00261D]">{trip.duration || 4} Days</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#717975] uppercase block font-semibold">Travelers</span>
                            <span className="font-bold text-[#00261D]">{trip.travelers || 1} Person(s)</span>
                          </div>
                        </div>

                        {/* Footer Budget & Continue CTA */}
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-[10px] text-[#717975] block uppercase font-semibold">Target Budget</span>
                            <span className="text-sm font-bold text-[#420E00]">
                              Rs. {Number(trip.budget_total || 0).toLocaleString()}
                            </span>
                          </div>

                          <Link to={trip.is_local_draft ? '/plan-trip' : `/plan-trip?tripId=${trip.id}`}>
                            <button className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
                              <span>Continue Planning →</span>
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          /* Bookings Tab */
          bookings.length === 0 ? (
            <EmptyState
              title="No Bookings Yet"
              description="You haven't reserved any organizer packages yet. Explore our verified marketplace to book your first adventure."
              actionText="Explore Tour Packages"
              actionHref="/explore"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-3xl border border-black/10 bg-white p-6 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#717975] block mb-0.5">
                          CONFIRMATION #{booking.id.slice(0, 8).toUpperCase()}
                        </span>
                        <h3
                          className="text-xl font-normal text-[#00261D]"
                          style={{ fontFamily: "'Instrument Serif', serif" }}
                        >
                          {booking.package?.title || 'Expedition Package'}
                        </h3>
                        <p className="text-xs text-[#717975] flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#717975]" />
                          <span>{booking.package?.destination || 'Pakistan'}</span>
                        </p>
                      </div>

                      <StatusBadge status={booking.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-black/10 text-xs">
                      <div>
                        <span className="text-[10px] text-[#717975] uppercase block font-semibold">Travelers</span>
                        <span className="font-bold text-[#00261D]">{booking.num_people} Guests</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#717975] uppercase block font-semibold">Total Price</span>
                        <span className="font-bold text-[#420E00]">
                          Rs. {Number(booking.total_price || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#717975] uppercase block font-semibold">Payment</span>
                        <span className="font-bold text-[#00261D]">{booking.payment_status || 'PENDING'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-[#717975]">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                    <Link to={`/bookings/${booking.id}`}>
                      <button className="inline-flex items-center gap-1 text-xs font-bold text-[#00261D] hover:underline cursor-pointer">
                        Receipt <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ─── Share Link Modal ────────────────────────────────────────── */}
        {shareTripModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-black/10 shadow-2xl space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#00261D] text-white flex items-center justify-center">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                      Share Trip Itinerary
                    </h3>
                    <p className="text-xs text-[#717975]">
                      {shareTripModal.title || shareTripModal.destination}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShareTripModal(null)}
                  className="p-1 text-[#717975] hover:text-black rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Toggle Public Access */}
              <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00261D]">Allow anyone with this link to view</span>
                  <input
                    type="checkbox"
                    checked={allowPublicShare}
                    onChange={(e) => setAllowPublicShare(e.target.checked)}
                    className="w-4 h-4 accent-[#00261D] rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-[#717975] leading-relaxed">
                  Anyone who receives this link can view the complete day-by-day plan in view-only mode. They cannot edit your trip.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShareTripModal(null)}
                  className="flex-1 py-3 rounded-full border border-black/10 text-xs font-bold uppercase tracking-wider text-[#717975] hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmShare}
                  disabled={isSharing}
                  className="flex-1 py-3 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  {isSharing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Delete Confirmation Modal ─────────────────────────────── */}
        {tripToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-black/10 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Delete Trip Plan?
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-[#555E59] leading-relaxed">
                Are you sure you want to delete <strong>"{tripToDelete.title || tripToDelete.destination}"</strong>? This will permanently remove the day-by-day itinerary and saved calculations.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setTripToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-full border border-black/10 text-xs font-bold uppercase tracking-wider text-[#717975] hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
