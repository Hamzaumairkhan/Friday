import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Clock,
  ArrowLeft,
  Sparkles,
  Sun,
  CheckSquare,
  Compass,
  Tag,
  Copy,
  Globe,
  Lock,
  Share2,
  Loader2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Plus,
  Minus,
} from 'lucide-react';
import { tripsService } from '../../services/trips';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import toast from 'react-hot-toast';

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { backendUser } = useAuth();

  const [trip, setTrip] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);

  // Edit / Customizer State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    travelers: 1,
    budget_total: 0,
    destination: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Visibility Switch Modal State
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  useEffect(() => {
    const fetchTripData = async () => {
      setLoading(true);
      try {
        const tripData = await tripsService.getTrip(tripId);
        setTrip(tripData);
        setEditForm({
          title: tripData.title || `Trip to ${tripData.destination || 'Pakistan'}`,
          travelers: tripData.travelers || 1,
          budget_total: tripData.budget_total || 0,
          destination: tripData.destination || 'Pakistan',
        });

        try {
          const itinData = await tripsService.getItinerary(tripId);
          setItinerary(itinData);
        } catch {
          // Itinerary might still be generating
        }

        try {
          const budgetData = await tripsService.getBudget(tripId);
          setBudget(budgetData);
        } catch {
          // Budget estimation optional
        }
      } catch (err) {
        console.error('Error fetching trip details:', err);
        toast.error('Failed to load trip details or access denied.');
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();
  }, [tripId]);

  // Determine if current user is the owner
  const isOwner = Boolean(
    backendUser?.id && trip?.owner_id && (backendUser.id === trip.owner_id || backendUser.email === trip.owner_id)
  );

  // Copy Trip Handler (Only for other users' public trips)
  const handleCopyTrip = async () => {
    if (isOwner) {
      toast.error('You already own this trip. You can customize it directly.');
      return;
    }
    setIsCopying(true);
    try {
      const res = await tripsService.copyTrip(tripId);
      toast.success('Trip copied to your personal workspace! You can now customize every detail.');
      navigate(`/trips/${res.id}`);
    } catch (err) {
      console.error('Error copying trip:', err);
      toast.error(err.message || 'Failed to copy trip.');
    } finally {
      setIsCopying(false);
    }
  };

  // Visibility Confirmation Handler
  const handleConfirmVisibilityToggle = async () => {
    if (!trip || !isOwner) return;
    const nextState = !trip.is_public;
    setIsTogglingVisibility(true);
    try {
      await tripsService.toggleVisibility(tripId, nextState);
      setTrip((prev) => ({ ...prev, is_public: nextState }));
      setVisibilityModalOpen(false);
      if (nextState) {
        toast.success('Trip is now public and discoverable in the Friday Community Explore feed!');
      } else {
        toast.success('Trip changed to Private. Only you can view this journey.');
      }
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      toast.error('Failed to update visibility.');
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  // Save Trip Customizations
  const handleSaveCustomizations = async (e) => {
    e?.preventDefault();
    if (!trip || !isOwner) return;
    setIsSavingEdit(true);
    try {
      const updated = await tripsService.updateTrip(tripId, {
        title: editForm.title.trim(),
        travelers: Number(editForm.travelers),
        budget_total: Number(editForm.budget_total),
        budget_per_person: Math.round(Number(editForm.budget_total) / Math.max(1, Number(editForm.travelers))),
      });
      setTrip((prev) => ({
        ...prev,
        title: updated.title,
        travelers: updated.travelers,
        budget_total: updated.budget_total,
        budget_per_person: updated.budget_per_person,
      }));
      setIsEditing(false);
      toast.success('Trip customizations saved!');
    } catch (err) {
      console.error('Failed to save trip edits:', err);
      toast.error('Failed to save customizations.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading AI itinerary and budget calculations..." />;
  }

  if (!trip) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-3xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Trip not found or private
        </h2>
        <p className="text-xs text-[#717975]">
          This itinerary may be private or restricted by its creator.
        </p>
        <Link to="/my-trips">
          <button className="px-6 py-2 rounded-full border border-black/10 text-sm hover:bg-black/5">
            Back to My Trips
          </button>
        </Link>
      </div>
    );
  }

  const defaultHero = '/images/stitch/stitch_asset_11.jpg';
  const heroImage = trip.image_url || defaultHero;
  const days = itinerary?.days || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* ─── Top Bar: Navigation & Action Controls ──────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/my-trips"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6F6F6F] hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Trips
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Owner Actions */}
          {isOwner ? (
            <>
              {/* Visibility Switch Button */}
              <button
                onClick={() => setVisibilityModalOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer border ${
                  trip.is_public
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white text-[#717975] border-black/10 hover:bg-slate-50'
                }`}
              >
                {trip.is_public ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Public (Click to Make Private)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-[#717975]" />
                    <span>Private (Click to Post)</span>
                  </>
                )}
              </button>

              {/* Edit Trip Customizations Toggle */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-black/10 bg-white hover:bg-slate-50 text-xs font-bold uppercase tracking-wider text-[#00261D] transition-colors shadow-2xs cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Details'}</span>
              </button>
            </>
          ) : (
            /* Viewer Actions: Non-owner viewing public or shared trip */
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-[#717975] border border-black/5">
                Community Itinerary (View Only)
              </span>

              {/* Copy this trip CTA */}
              <button
                onClick={handleCopyTrip}
                disabled={isCopying}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#00261D]/90 transition-all shadow-sm cursor-pointer"
              >
                {isCopying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy & Customize This Trip →</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Interactive Edit / Customization Drawer ───────────────── */}
      {isEditing && isOwner && (
        <form
          onSubmit={handleSaveCustomizations}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-[#00261D] shadow-md space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center justify-between border-b border-black/5 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00261D]" />
              <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Customize Your Trip Plan
              </h3>
            </div>
            <span className="text-xs text-[#717975]">Adjust your group, budget, and route</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#717975] block mb-1.5">
                Trip Title
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full bg-[#F8FAF6] border border-black/10 rounded-xl p-3 text-xs sm:text-sm font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#717975] block mb-1.5">
                Travelers (1–10)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm((prev) => ({ ...prev, travelers: Math.max(1, prev.travelers - 1) }))}
                  className="w-10 h-10 rounded-xl bg-[#F8FAF6] border border-black/10 flex items-center justify-center text-[#00261D] font-bold hover:bg-[#E7E9E5] cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editForm.travelers}
                  onChange={(e) => setEditForm({ ...editForm, travelers: Math.min(10, Math.max(1, Number(e.target.value))) })}
                  className="flex-1 bg-[#F8FAF6] border border-black/10 rounded-xl p-3 text-xs sm:text-sm font-semibold text-center text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
                <button
                  type="button"
                  onClick={() => setEditForm((prev) => ({ ...prev, travelers: Math.min(10, prev.travelers + 1) }))}
                  className="w-10 h-10 rounded-xl bg-[#F8FAF6] border border-black/10 flex items-center justify-center text-[#00261D] font-bold hover:bg-[#E7E9E5] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#717975] block mb-1.5">
                Total Budget (PKR)
              </label>
              <input
                type="number"
                value={editForm.budget_total}
                onChange={(e) => setEditForm({ ...editForm, budget_total: Number(e.target.value) })}
                className="w-full bg-[#F8FAF6] border border-black/10 rounded-xl p-3 text-xs sm:text-sm font-bold text-[#420E00] focus:outline-none focus:border-[#00261D]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2 rounded-full border border-black/10 text-xs font-bold uppercase tracking-wider text-[#717975] hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="px-6 py-2 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* ─── Hero Header (Stitch 4_itinerary.html) ───────────────────── */}
      <header className="relative w-full h-[45vh] min-h-[320px] rounded-3xl overflow-hidden shadow-2xl bg-[#00261D]">
        <img
          src={heroImage}
          alt={trip.destination || 'Expedition'}
          onError={(e) => {
            if (e.currentTarget.src !== defaultHero) {
              e.currentTarget.src = defaultHero;
            }
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full flex flex-col md:flex-row justify-between items-end gap-4">
          <div className="space-y-2">
            <span className="inline-block px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-widest border border-white/20">
              Custom AI Itinerary
            </span>
            <h1
              className="text-4xl sm:text-6xl font-normal text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {trip.title || `Trip to ${trip.destination || 'Pakistan'}`}
            </h1>
            <p className="text-xs sm:text-sm text-white/90 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Calendar className="w-4 h-4 text-emerald-400" />
              {trip.duration ? `${trip.duration} Days` : 'Multi-day trip'} • {trip.travelers || 1} Traveler(s)
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-white/80 uppercase font-semibold block">Total Estimated Budget</span>
            <span className="text-3xl font-normal text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
              PKR {Number(trip.budget_total || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Widgets Grid (Map Preview, Status, Checklist) ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-black uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>Destination Route</span>
          </div>
          <p className="text-lg font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {trip.origin || 'Islamabad'} &rarr; {trip.destination || 'Northern Pakistan'}
          </p>
          <p className="text-xs text-[#6F6F6F]">
            Direct mountain transit, scenic highway drive, and curated local valley stops.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-black uppercase tracking-wider">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Trip Status</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {trip.status || 'PLANNED'}
            </span>
          </div>
          <p className="text-xs text-[#6F6F6F]">
            {trip.is_public ? 'Published in Community Feed' : 'Saved in Personal Vault'}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-black uppercase tracking-wider">
            <CheckSquare className="w-4 h-4 text-black" />
            <span>Traveler Essentials</span>
          </div>
          <ul className="text-xs space-y-1 text-[#555E59]">
            <li>• Warm layers & waterproof jacket</li>
            <li>• Hiking footwear with solid traction</li>
            <li>• National Identity Card (CNIC / Passport)</li>
          </ul>
        </div>
      </div>

      {/* ─── Day-by-Day Detailed Itinerary Feed ──────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-3xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Detailed Day-by-Day Schedule
        </h2>

        {days.length > 0 ? (
          <div className="relative pl-8 border-l-2 border-black/10 space-y-8">
            {days.map((d, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-white border border-black/10 shadow-xs relative space-y-4">
                <div className="absolute -left-[41px] top-6 w-4 h-4 rounded-full bg-[#00261D] border-4 border-[#F8FAF6]" />

                <div>
                  <span className="text-xs font-bold text-[#420E00] uppercase tracking-widest block mb-1">
                    DAY {d.day_number || d.day || idx + 1}
                  </span>
                  <h3 className="text-2xl font-normal text-black mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {typeof d.title === 'string' ? d.title : `Day ${idx + 1} Highlights`}
                  </h3>
                  {d.summary && (
                    <p className="text-xs sm:text-sm text-[#555E59] leading-relaxed">
                      {d.summary}
                    </p>
                  )}
                  {d.description && (
                    <p className="text-xs sm:text-sm text-[#555E59] leading-relaxed">
                      {d.description}
                    </p>
                  )}
                </div>

                {/* Render Rich Activities with Exact Hours / Periods */}
                {d.activities && d.activities.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-black/5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#717975] block">
                      Scheduled Stops & Activities
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {d.activities.map((act, aIdx) => {
                        const isObj = typeof act === 'object' && act !== null;
                        const title = isObj ? (act.title || act.description || 'Activity') : act;
                        const location = isObj ? act.location : null;
                        const startTime = isObj ? act.start_time : null;
                        const endTime = isObj ? act.end_time : null;
                        const duration = isObj ? act.duration_minutes : null;
                        const cost = isObj ? act.estimated_cost : null;
                        const category = isObj ? act.category : null;

                        return (
                          <div
                            key={aIdx}
                            className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5 hover:border-black/15 transition-all text-xs space-y-1.5"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-semibold text-[#00261D] flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-[#00261D] shrink-0" />
                                <span>{title}</span>
                              </span>
                              {category && (
                                <span className="text-[10px] font-bold bg-[#BBEAD5]/40 text-[#00261D] px-2 py-0.5 rounded-full shrink-0">
                                  {category}
                                </span>
                              )}
                            </div>

                            {startTime && endTime && (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#00261D]">
                                <Clock className="w-3 h-3 text-[#717975]" />
                                <span>{startTime} – {endTime}</span>
                              </div>
                            )}

                            {location && (
                              <p className="text-[11px] text-[#717975] flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{location}</span>
                              </p>
                            )}

                            {(duration || cost) && (
                              <div className="flex items-center gap-3 pt-1 text-[10px] text-[#555E59]">
                                {duration && (
                                  <span>{duration} mins</span>
                                )}
                                {cost > 0 && (
                                  <span className="font-semibold text-[#420E00]">
                                    PKR {Number(cost).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}
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
          <div className="p-8 rounded-3xl bg-white border border-black/10 text-center space-y-3">
            <p className="text-sm text-[#6F6F6F]">
              No day-by-day activities generated yet for this draft trip.
            </p>
            <Link to="/plan-trip">
              <button className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-slate-900 transition-colors">
                Plan Itinerary with Friday &rarr;
              </button>
            </Link>
          </div>
        )}
      </section>

      {/* ─── Visibility Confirmation Modal (Make Private / Public) ─── */}
      {visibilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-black/10 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                trip.is_public ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {trip.is_public ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
              </div>
              <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {trip.is_public ? 'Switch Trip to Private?' : 'Post Trip to Friday Community?'}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-[#555E59] leading-relaxed">
              {trip.is_public
                ? 'Making this trip Private means only you will be able to view and manage it. It will be immediately removed from the public Explore feed.'
                : 'Posting this trip will make it discoverable in the Friday Community Explore feed so fellow travelers can explore your route and copy it to their plans.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setVisibilityModalOpen(false)}
                disabled={isTogglingVisibility}
                className="flex-1 py-3 rounded-full border border-black/10 text-xs font-bold uppercase tracking-wider text-[#717975] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVisibilityToggle}
                disabled={isTogglingVisibility}
                className={`flex-1 py-3 rounded-full text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                  trip.is_public ? 'bg-[#00261D] hover:bg-[#00261D]/90' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {isTogglingVisibility ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
