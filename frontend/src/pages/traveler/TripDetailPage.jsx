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
  Trash2,
  Send,
  Navigation,
  ShieldCheck,
  Phone,
  Award,
} from 'lucide-react';
import { tripsService } from '../../services/trips';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import toast from 'react-hot-toast';

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { backendUser, firebaseUser } = useAuth();

  const [trip, setTrip] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);

  // Edit Trip Header State
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editTripForm, setEditTripForm] = useState({
    title: '',
    origin: 'Islamabad',
    destination: '',
    travelers: 1,
    budget_total: 0,
    start_date: '',
    end_date: '',
    show_members_publicly: false,
  });
  const [isSavingTripEdit, setIsSavingTripEdit] = useState(false);

  // Publish & Privacy Confirmation State
  const [isPublishing, setIsPublishing] = useState(false);
  const [privacyToConfirm, setPrivacyToConfirm] = useState(null); // true for public, false for private

  // Day & Activity Edit Modals
  const [editingDay, setEditingDay] = useState(null); // { id, day_number, title, summary }
  const [editingActivity, setEditingActivity] = useState(null); // { id, day_id, title, category, location, start_time, end_time, duration_minutes, estimated_cost, map_url }
  const [addingActivityDayId, setAddingActivityDayId] = useState(null);
  const [newActivityForm, setNewActivityForm] = useState({
    title: '',
    category: 'SIGHTSEEING',
    location: '',
    start_time: '09:00 AM',
    end_time: '11:30 AM',
    duration_minutes: 150,
    estimated_cost: 0,
    map_url: '',
  });

  const fetchTripData = async () => {
    setLoading(true);
    try {
      const tripData = await tripsService.getTrip(tripId);
      setTrip(tripData);
      setEditTripForm({
        title: tripData.title || `Trip to ${tripData.destination || 'Pakistan'}`,
        origin: tripData.origin || 'Islamabad',
        destination: tripData.destination || 'Pakistan',
        travelers: tripData.travelers || 1,
        budget_total: tripData.budget_total || 0,
        start_date: tripData.start_date || '',
        end_date: tripData.end_date || '',
        show_members_publicly: Boolean(tripData.show_members_publicly),
      });

      try {
        const itinData = await tripsService.getItinerary(tripId);
        setItinerary(itinData);
      } catch {
        // Optional
      }

      try {
        const budgetData = await tripsService.getBudget(tripId);
        setBudget(budgetData);
      } catch {
        // Optional
      }
    } catch (err) {
      console.error('Error fetching trip details:', err);
      toast.error('Failed to load trip details or access denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripData();
  }, [tripId]);

  // Determine if current user is the owner
  const isOwner = Boolean(
    backendUser?.id && trip?.owner_id && (backendUser.id === trip.owner_id || backendUser.email === trip.owner_id)
  );

  // ─── Publish Trip Handler ──────────────────────────────────────────────
  const handlePublishTrip = async () => {
    if (!trip || !isOwner) return;
    setIsPublishing(true);
    try {
      const res = await tripsService.publishTrip(tripId, { is_public: Boolean(trip.is_public) });
      setTrip((prev) => ({ ...prev, is_public: res.is_public ? 1 : 0, status: 'PLANNED' }));
      toast.success(res.message || 'Expedition published! Itinerary dispatched to Email & WhatsApp.');
    } catch (err) {
      console.error('Error publishing trip:', err);
      toast.error('Failed to publish trip.');
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── Visibility Selector (Public vs Private) ───────────────────────────
  const handleChangeVisibility = async (newIsPublic) => {
    if (!trip || !isOwner) return;
    try {
      await tripsService.toggleVisibility(tripId, newIsPublic);
      setTrip((prev) => ({ ...prev, is_public: newIsPublic ? 1 : 0 }));
      toast.success(newIsPublic ? 'Trip visibility set to Public (Community Shared).' : 'Trip visibility set to Private (Expedition Vault).');
    } catch (err) {
      console.error('Failed to change visibility:', err);
      toast.error('Failed to update visibility.');
    }
  };

  // ─── Quick Toggle Roster Privacy on Public Feed ────────────────────────
  const handleToggleRosterPrivacy = async (newVal) => {
    if (!trip || !isOwner) return;
    try {
      const updated = await tripsService.updateTrip(tripId, {
        show_members_publicly: newVal,
      });
      setTrip((prev) => ({ ...prev, show_members_publicly: newVal ? 1 : 0 }));
      setEditTripForm((prev) => ({ ...prev, show_members_publicly: newVal }));
      toast.success(
        newVal
          ? 'Traveler names & profiles are now shown on public feed.'
          : 'Traveler roster is now hidden on public feed (group count only).'
      );
    } catch (err) {
      console.error('Failed to update roster privacy:', err);
      toast.error('Failed to update roster privacy.');
    }
  };

  // ─── Save Trip Header Edits ────────────────────────────────────────────
  const handleSaveTripHeader = async (e) => {
    e?.preventDefault();
    if (!trip || !isOwner) return;
    setIsSavingTripEdit(true);
    try {
      const valBudget = Number(editTripForm.budget_total);
      const valTravelers = Number(editTripForm.travelers);
      const updated = await tripsService.updateTrip(tripId, {
        title: editTripForm.title.trim(),
        origin: editTripForm.origin.trim(),
        destination: editTripForm.destination.trim(),
        travelers: valTravelers,
        budget_total: valBudget,
        budget_per_person: Math.round(valBudget / Math.max(1, valTravelers)),
        start_date: editTripForm.start_date || null,
        end_date: editTripForm.end_date || null,
        show_members_publicly: editTripForm.show_members_publicly,
      });
      setTrip((prev) => ({
        ...prev,
        ...updated,
      }));
      setIsEditingTrip(false);
      toast.success('Trip details updated successfully!');
    } catch (err) {
      console.error('Failed to update trip:', err);
      toast.error('Failed to save trip updates.');
    } finally {
      setIsSavingTripEdit(false);
    }
  };

  // ─── Day Title/Summary Edit ────────────────────────────────────────────
  const handleSaveDay = async () => {
    if (!editingDay) return;
    try {
      await tripsService.updateDay(tripId, editingDay.id, {
        title: editingDay.title,
        summary: editingDay.summary,
      });
      setItinerary((prev) => {
        if (!prev || !prev.days) return prev;
        return {
          ...prev,
          days: prev.days.map((d) => (d.id === editingDay.id ? { ...d, title: editingDay.title, summary: editingDay.summary } : d)),
        };
      });
      setEditingDay(null);
      toast.success('Day details updated.');
    } catch {
      toast.error('Failed to update day.');
    }
  };

  const handleAddDay = async () => {
    try {
      const existing = itinerary?.days || [];
      const nextNum = existing.length + 1;
      const created = await tripsService.addDay(tripId, {
        title: `Day ${nextNum}: Exploration & Highlights of ${trip?.destination || 'Destination'}`,
        summary: `Custom exploration, regional sightseeing, and leisure time.`,
      });
      setItinerary((prev) => {
        if (!prev) return { days: [created] };
        return {
          ...prev,
          days: [...(prev.days || []), created],
        };
      });
      setTrip((prev) => ({ ...prev, duration: nextNum }));
      toast.success(`Day ${nextNum} added to itinerary!`);
    } catch {
      toast.error('Failed to add new day.');
    }
  };

  const handleDeleteDay = async (dayId, dayNum) => {
    if (!window.confirm(`Are you sure you want to remove Day ${dayNum} from your itinerary?`)) return;
    try {
      await tripsService.deleteDay(tripId, dayId);
      setItinerary((prev) => {
        if (!prev || !prev.days) return prev;
        const remaining = prev.days.filter((d) => d.id !== dayId);
        return {
          ...prev,
          days: remaining,
        };
      });
      setTrip((prev) => ({ ...prev, duration: Math.max(1, (itinerary?.days?.length || 2) - 1) }));
      toast.success(`Day ${dayNum} removed.`);
    } catch {
      toast.error('Failed to delete day.');
    }
  };

  // ─── Activity CRUD ─────────────────────────────────────────────────────
  const handleSaveActivity = async () => {
    if (!editingActivity) return;
    try {
      await tripsService.updateActivity(tripId, editingActivity.id, {
        title: editingActivity.title,
        category: editingActivity.category,
        location: editingActivity.location,
        start_time: editingActivity.start_time,
        end_time: editingActivity.end_time,
        duration_minutes: editingActivity.duration_minutes,
        estimated_cost: editingActivity.estimated_cost,
        map_url: editingActivity.map_url,
      });
      setItinerary((prev) => {
        if (!prev || !prev.days) return prev;
        return {
          ...prev,
          days: prev.days.map((d) => ({
            ...d,
            activities: (d.activities || []).map((a) => (a.id === editingActivity.id ? { ...a, ...editingActivity, notes: editingActivity.map_url } : a)),
          })),
        };
      });
      setEditingActivity(null);
      toast.success('Activity updated.');
    } catch {
      toast.error('Failed to update activity.');
    }
  };

  const handleAddActivity = async (dayId) => {
    if (!newActivityForm.title.trim()) {
      toast.error('Please enter an activity title.');
      return;
    }
    try {
      const created = await tripsService.addActivity(tripId, dayId, newActivityForm);
      setItinerary((prev) => {
        if (!prev || !prev.days) return prev;
        return {
          ...prev,
          days: prev.days.map((d) => (d.id === dayId ? { ...d, activities: [...(d.activities || []), created] } : d)),
        };
      });
      setAddingActivityDayId(null);
      setNewActivityForm({
        title: '',
        category: 'SIGHTSEEING',
        location: '',
        start_time: '09:00 AM',
        end_time: '11:30 AM',
        duration_minutes: 150,
        estimated_cost: 0,
        map_url: '',
      });
      toast.success('New stop added to your day!');
    } catch {
      toast.error('Failed to add stop.');
    }
  };

  const handleDeleteActivity = async (dayId, activityId) => {
    if (!window.confirm('Are you sure you want to remove this stop?')) return;
    try {
      await tripsService.deleteActivity(tripId, activityId);
      setItinerary((prev) => {
        if (!prev || !prev.days) return prev;
        return {
          ...prev,
          days: prev.days.map((d) => (d.id === dayId ? { ...d, activities: (d.activities || []).filter((a) => a.id !== activityId) } : d)),
        };
      });
      toast.success('Stop removed.');
    } catch {
      toast.error('Failed to remove stop.');
    }
  };

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

  const getDestinationFallback = (dest) => {
    const d = (dest || '').toLowerCase();
    if (d.includes('islamabad') || d.includes('margalla') || d.includes('faisal') || d.includes('rawalpindi')) return '/images/stitch/stitch_asset_4.jpg';
    if (d.includes('lahore') || d.includes('badshahi') || d.includes('punjab') || d.includes('faisalabad') || d.includes('multan')) return '/images/stitch/stitch_asset_2.jpg';
    if (d.includes('karachi') || d.includes('gwadar') || d.includes('ormara') || d.includes('kund') || d.includes('sindh')) return '/images/stitch/stitch_asset_5.jpg';
    if (d.includes('swat') || d.includes('kalam') || d.includes('malam') || d.includes('mahudand')) return '/images/stitch/stitch_asset_10.jpg';
    if (d.includes('naran') || d.includes('kaghan') || d.includes('saif') || d.includes('babusar')) return '/images/stitch/stitch_asset_9.jpg';
    if (d.includes('kumrat') || d.includes('jahaz') || d.includes('katora')) return '/images/stitch/stitch_asset_8.jpg';
    if (d.includes('fairy') || d.includes('nanga')) return '/images/stitch/stitch_asset_7.jpg';
    if (d.includes('skardu') || d.includes('deosai') || d.includes('shangrila')) return '/images/stitch/hero_mountains.jpg';
    if (d.includes('hunza') || d.includes('passu') || d.includes('altit') || d.includes('baltit')) return '/images/stitch/stitch_asset_6.jpg';
    return '/images/stitch/panoramic_lake.jpg';
  };

  const defaultHero = getDestinationFallback(trip?.destination);
  const heroImage = trip.image_url || defaultHero;
  const days = itinerary?.days || [];

  const tripMembersList = (() => {
    if (trip?.members && Array.isArray(trip.members) && trip.members.length > 0) {
      return trip.members;
    }
    const list = [];
    const prefs = trip?.preferences || {};
    const lead = prefs.lead_contact || {};
    list.push({
      id: trip?.owner_id || 'lead',
      name: lead.name || (isOwner ? backendUser?.name : 'Lead Traveler'),
      email: lead.email || (isOwner ? backendUser?.email : ''),
      phone: lead.phone || '',
      role: 'LEAD TRAVELER',
      status: 'HOST / OWNER',
      profile_picture: isOwner ? (backendUser?.profile_picture || firebaseUser?.photoURL) : null,
    });
    if (Array.isArray(prefs.companions)) {
      prefs.companions.forEach((c, idx) => {
        if (c && (c.name || c.email || c.phone)) {
          list.push({
            id: `comp-${idx}`,
            name: c.name || `Companion #${idx + 2}`,
            email: c.email || '',
            phone: c.phone || '',
            role: 'CO-TRAVELER',
            status: 'CONFIRMED TRAVELER',
            profile_picture: null,
          });
        }
      });
    }
    return list;
  })();

  const isLocked = trip.status === 'PLANNED' || trip.status === 'BOOKED' || trip.status === 'COMPLETED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ─── Top Bar: Navigation, Privacy Dropdown & Publish Controls ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-black/10 shadow-2xs">
        <Link
          to="/my-trips"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6F6F6F] hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Trips
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          {isOwner ? (
            <>
              {/* Privacy Selector Dropdown with Confirmation Prompt */}
              <div className="flex items-center gap-2 bg-[#F3F4F0] p-1 rounded-full border border-black/10 text-xs font-bold">
                <button
                  onClick={() => {
                    if (trip.is_public) {
                      setPrivacyToConfirm(false);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                    !trip.is_public ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975] hover:text-black'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private</span>
                </button>
                <button
                  onClick={() => {
                    if (!trip.is_public) {
                      setPrivacyToConfirm(true);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                    trip.is_public ? 'bg-emerald-800 text-white shadow-2xs' : 'text-[#717975] hover:text-black'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public</span>
                </button>
              </div>

              {/* Publish Button */}
              {!isLocked ? (
                <button
                  onClick={handlePublishTrip}
                  disabled={isPublishing}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer hover:scale-105"
                >
                  {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#BBEAD5]" />}
                  <span>Publish & Dispatch</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold uppercase tracking-wider text-emerald-900 shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Published & Dispatched</span>
                </div>
              )}

              {/* Edit Trip Details (Disabled/Locked after uploading) */}
              {isLocked ? (
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 border border-black/10 text-xs font-bold uppercase tracking-wider text-[#717975]" title="Published itineraries are locked for editing">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingTrip(!isEditingTrip)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-black/10 bg-white hover:bg-slate-50 text-xs font-bold uppercase tracking-wider text-[#00261D] transition-colors shadow-2xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isEditingTrip ? 'Close Edit' : 'Edit Trip'}</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-[#717975] border border-black/5">
                Community Itinerary (View Only)
              </span>
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

      {/* ─── Privacy Confirmation Modal ───────────────────────────── */}
      {privacyToConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-black/10 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                privacyToConfirm ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-[#00261D]'
              }`}>
                {privacyToConfirm ? <Globe className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  {privacyToConfirm ? 'Make Expedition Public?' : 'Make Expedition Private?'}
                </h3>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#717975]">
                  Confirm Visibility Change
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#555E59] leading-relaxed">
              {privacyToConfirm
                ? 'Are you sure you want to make this expedition Public? It will be featured on the Friday Community Explore feed. Traveler email addresses and phone numbers will remain strictly private and hidden.'
                : 'Are you sure you want to make this expedition Private? It will be removed from the Community feed and only visible to you in your personal Expedition Vault.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPrivacyToConfirm(null)}
                className="px-5 py-2.5 rounded-full border border-black/15 bg-white hover:bg-slate-100 text-xs font-bold uppercase tracking-wider text-[#717975] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetState = privacyToConfirm;
                  setPrivacyToConfirm(null);
                  await handleChangeVisibility(targetState);
                }}
                className={`px-6 py-2.5 rounded-full text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  privacyToConfirm ? 'bg-emerald-800 hover:bg-emerald-900' : 'bg-[#00261D] hover:bg-[#00261D]/90'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{privacyToConfirm ? 'Yes, Make Public' : 'Yes, Make Private'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Trip Header Form Drawer ─────────────────────────── */}
      {isEditingTrip && isOwner && (
        <form
          onSubmit={handleSaveTripHeader}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-[#00261D] shadow-md space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center justify-between border-b border-black/5 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00261D]" />
              <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Edit Trip Parameters
              </h3>
            </div>
            <span className="text-xs text-[#717975]">Customize title, dates, budget and group</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Trip Title</label>
              <input
                type="text"
                value={editTripForm.title}
                onChange={(e) => setEditTripForm({ ...editTripForm, title: e.target.value })}
                className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Departure City</label>
              <input
                type="text"
                value={editTripForm.origin}
                onChange={(e) => setEditTripForm({ ...editTripForm, origin: e.target.value })}
                className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Destination</label>
              <input
                type="text"
                value={editTripForm.destination}
                onChange={(e) => setEditTripForm({ ...editTripForm, destination: e.target.value })}
                className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Travelers Count</label>
              <input
                type="number"
                min="1"
                max="10"
                value={editTripForm.travelers}
                onChange={(e) => setEditTripForm({ ...editTripForm, travelers: e.target.value })}
                className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Departure Date</label>
              <input
                type="date"
                value={editTripForm.start_date}
                onChange={(e) => setEditTripForm({ ...editTripForm, start_date: e.target.value })}
                className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Return Date</label>
              <input
                type="date"
                value={editTripForm.end_date}
                onChange={(e) => setEditTripForm({ ...editTripForm, end_date: e.target.value })}
                className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Total Budget (PKR)</label>
              <input
                type="number"
                min="1000"
                value={editTripForm.budget_total}
                onChange={(e) => setEditTripForm({ ...editTripForm, budget_total: e.target.value })}
                className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
              />
            </div>
            <div className="sm:col-span-3 p-4 rounded-2xl bg-[#F8FAF6] border border-black/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#00261D] block">Show Traveler Profiles on Public Community Feed</span>
                <span className="text-[11px] text-[#717975]">
                  {editTripForm.show_members_publicly
                    ? 'Traveler names and profile avatars are displayed.'
                    : 'Traveler names are hidden. Only group member count is shown.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditTripForm({ ...editTripForm, show_members_publicly: !editTripForm.show_members_publicly })}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  editTripForm.show_members_publicly
                    ? 'bg-[#00261D] text-white shadow-2xs'
                    : 'bg-white border border-black/15 text-[#717975]'
                }`}
              >
                {editTripForm.show_members_publicly ? 'Profiles Visible' : 'Profiles Hidden'}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingTrip(false)}
              className="px-5 py-2.5 rounded-full border border-black/10 text-xs font-bold uppercase tracking-wider text-[#717975] hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingTripEdit}
              className="px-6 py-2.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#00261D]/90 cursor-pointer"
            >
              {isSavingTripEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* ─── Hero Overview Card ────────────────────────────────────── */}
      <div className="bg-white rounded-3xl overflow-hidden border border-black/10 shadow-xs">
        <div className="relative h-64 sm:h-80 w-full bg-[#00261D] overflow-hidden">
          <img
            src={heroImage}
            alt={trip.destination}
            onError={(e) => {
              e.currentTarget.src = defaultHero;
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[#BBEAD5] flex items-center gap-1.5">
                {trip.is_public ? <Globe className="w-3 h-3 text-[#BBEAD5]" /> : <Lock className="w-3 h-3 text-[#BBEAD5]" />}
                <span>{trip.is_public ? 'Public Community Expedition' : 'Private Expedition'}</span>
              </span>
              {trip.status && (
                <span className="px-3 py-1 rounded-full bg-emerald-900/80 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                  {trip.status}
                </span>
              )}
            </div>
            <h1
              className="text-3xl sm:text-5xl font-normal text-white leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {trip.title || `${trip.destination}, at your pace`}
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5">
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Route</span>
              <span className="text-sm font-bold text-[#00261D] truncate block">{trip.origin || 'Islamabad'} → {trip.destination}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5">
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Dates</span>
              <span className="text-sm font-bold text-[#00261D] truncate block">
                {trip.start_date ? `${trip.start_date} – ${trip.end_date || ''}` : `${trip.duration || 3} Days`}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5">
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Group Size</span>
              <span className="text-sm font-bold text-[#00261D]">{trip.travelers || 1} Person(s)</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5">
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Estimated Budget</span>
              <span className="text-sm font-bold text-[#420E00]">
                Rs. {Number(trip.budget_total || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Expedition Members & Google Profile Photos Card ─────────── */}
      {trip.is_public && !isOwner && !trip.show_members_publicly ? (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-black/10 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00261D] text-white flex items-center justify-center">
              <Users className="w-5 h-5 text-[#BBEAD5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block">
                GROUP SIZE & TRAVELERS
              </span>
              <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {trip.travelers || tripMembersList.length || 1} Travelers in Group
              </h3>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#F8FAF6] text-[#00261D] border border-black/10 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-700" />
            <span>Public Expedition</span>
          </span>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#00261D] text-white flex items-center justify-center">
                <Users className="w-4 h-4 text-[#BBEAD5]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block">
                  EXPEDITION CREW & ROSTER
                </span>
                <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Trip Members ({tripMembersList.length || trip.travelers || 1})
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && trip.is_public ? (
                <div className="flex items-center gap-1.5 bg-[#F8FAF6] p-1 rounded-full border border-black/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleToggleRosterPrivacy(false)}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      !trip.show_members_publicly ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975] hover:text-black'
                    }`}
                  >
                    Hide Names
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleRosterPrivacy(true)}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      trip.show_members_publicly ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975] hover:text-black'
                    }`}
                  >
                    Show Profiles
                  </button>
                </div>
              ) : (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#F8FAF6] text-[#00261D] border border-black/10 flex items-center gap-1.5">
                  {trip.is_public ? <Globe className="w-3 h-3 text-emerald-700" /> : <Lock className="w-3 h-3 text-[#717975]" />}
                  <span>{trip.is_public ? 'Public Shared' : 'Private Expedition'}</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tripMembersList.map((m, mIdx) => {
              const photo = m.profile_picture || (mIdx === 0 && isOwner && (backendUser?.profile_picture || firebaseUser?.photoURL));
              const initial = (m.name || 'Traveler').charAt(0).toUpperCase();

              return (
                <div
                  key={m.id || mIdx}
                  className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 flex items-center gap-3.5 hover:border-black/20 transition-all shadow-2xs"
                >
                  {/* Member Avatar with Google Photo */}
                  <div className="relative shrink-0">
                    {photo ? (
                      <img
                        src={photo}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-2xs"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full bg-[#00261D] text-white flex items-center justify-center text-lg font-bold border-2 border-white shadow-2xs"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      >
                        {initial}
                      </div>
                    )}
                    {mIdx === 0 && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[9px] font-bold ring-1 ring-white" title="Expedition Host">
                        <Award className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Member Identity & Details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#00261D] truncate block">
                        {m.name || (mIdx === 0 ? 'Lead Traveler' : `Traveler #${mIdx + 1}`)}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-black/10 text-[#717975] shrink-0 uppercase tracking-wider">
                        {m.role || (mIdx === 0 ? 'Lead' : 'Member')}
                      </span>
                    </div>
                    {trip.is_public && !isOwner ? (
                      <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" />
                        <span>Public Community Traveler</span>
                      </p>
                    ) : (
                      <>
                        {m.email && (
                          <p className="text-[11px] text-[#717975] truncate">
                            {m.email}
                          </p>
                        )}
                        {m.phone && (
                          <p className="text-[10px] font-medium text-[#420E00] truncate flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#420E00]" />
                            <span>{m.phone}</span>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Day-by-Day Itinerary Feed & Stops ─────────────────────── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975]">
              EXPEDITION ITINERARY
            </span>
            <h2 className="text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Day-by-Day Stops & Schedule ({days.length} Days)
            </h2>
          </div>

          {isOwner && !isLocked && (
            <button
              type="button"
              onClick={handleAddDay}
              className="px-5 py-2 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Day</span>
            </button>
          )}
        </div>

        {days.length > 0 ? (
          <div className="space-y-6">
            {days.map((d, idx) => (
              <div
                key={d.id || idx}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-5"
              >
                {/* Day Header */}
                <div className="border-b border-black/5 pb-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-[#420E00] uppercase tracking-widest block mb-1">
                      DAY {d.day_number || idx + 1}
                    </span>
                    <h3 className="text-2xl font-normal text-black mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
                      {d.title || `Day ${idx + 1} Highlights`}
                    </h3>
                    {d.summary && (
                      <p className="text-xs sm:text-sm text-[#555E59] leading-relaxed">
                        {d.summary}
                      </p>
                    )}
                  </div>

                  {isOwner && !isLocked && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingDay({ id: d.id, day_number: d.day_number, title: d.title || '', summary: d.summary || '' })}
                        className="p-2 rounded-full hover:bg-slate-100 text-[#717975] hover:text-black transition-colors cursor-pointer"
                        title="Edit Day Title/Summary"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAddingActivityDayId(d.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#00261D] text-white text-xs font-semibold hover:bg-[#00261D]/90 transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Stop</span>
                      </button>
                      {days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDay(d.id, d.day_number || idx + 1)}
                          className="p-2 rounded-full hover:bg-red-50 text-[#717975] hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete this entire day"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Day Activities with Web Photos */}
                {d.activities && d.activities.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#717975] block">
                      Scheduled Stops & Activities
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {d.activities.map((act, aIdx) => {
                        const title = act.title || 'Activity';
                        const location = act.location;
                        const startTime = act.start_time;
                        const endTime = act.end_time;
                        const duration = act.duration_minutes;
                        const cost = act.estimated_cost;
                        const category = act.category;
                        const mapUrl = act.notes || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || trip.destination + ' Pakistan')}`;
                        const actThumb = act.image_url || heroImage;

                        return (
                          <div
                            key={act.id || aIdx}
                            className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 hover:border-black/15 transition-all text-xs space-y-3 relative group"
                          >
                            <div className="flex items-start gap-3">
                              {/* Activity Image Thumbnail */}
                              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#00261D] border border-black/10 shadow-2xs">
                                <img
                                  src={actThumb}
                                  alt={title}
                                  onError={(e) => {
                                    e.currentTarget.src = heroImage;
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-bold text-[#00261D] leading-snug line-clamp-1">
                                    {title}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {category && (
                                      <span className="text-[9px] font-bold bg-[#BBEAD5]/40 text-[#00261D] px-2 py-0.5 rounded-full uppercase">
                                        {category}
                                      </span>
                                    )}
                                    {isOwner && !isLocked && (
                                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                        <button
                                          onClick={() => setEditingActivity({
                                            id: act.id,
                                            day_id: d.id,
                                            title: act.title,
                                            category: act.category,
                                            location: act.location,
                                            start_time: act.start_time,
                                            end_time: act.end_time,
                                            duration_minutes: act.duration_minutes,
                                            estimated_cost: act.estimated_cost,
                                            map_url: act.notes,
                                          })}
                                          className="p-1 rounded-full hover:bg-slate-200 text-[#717975] hover:text-black cursor-pointer"
                                          title="Edit stop"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteActivity(d.id, act.id)}
                                          className="p-1 rounded-full hover:bg-red-100 text-red-600 cursor-pointer"
                                          title="Delete stop"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {act.description && (
                                  <p className="text-[11px] text-[#555E59] leading-relaxed line-clamp-2">
                                    {act.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 text-[11px]">
                              {startTime && endTime ? (
                                <div className="flex items-center gap-1 font-semibold text-[#00261D]">
                                  <Clock className="w-3 h-3 text-[#717975]" />
                                  <span>{startTime} – {endTime}</span>
                                </div>
                              ) : <div />}

                              {location && (
                                <a
                                  href={mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 hover:underline cursor-pointer truncate max-w-[160px]"
                                  title="Open exact location in Google Maps"
                                >
                                  <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                                  <span className="truncate">{location}</span>
                                </a>
                              )}

                              {cost > 0 && (
                                <span className="font-bold text-[#420E00] shrink-0">
                                  PKR {Number(cost).toLocaleString()}
                                </span>
                              )}
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
          <div className="p-8 rounded-3xl bg-white border border-black/10 text-center space-y-3">
            <p className="text-sm text-[#6F6F6F]">
              No day-by-day activities generated yet for this draft trip.
            </p>
          </div>
        )}
      </section>

      {/* ─── MODAL: Edit Day Title & Summary ───────────────────────── */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-black/10 shadow-2xl space-y-4">
            <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Edit Day {editingDay.day_number}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Day Title</label>
                <input
                  type="text"
                  value={editingDay.title}
                  onChange={(e) => setEditingDay({ ...editingDay, title: e.target.value })}
                  className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Day Summary</label>
                <textarea
                  rows={3}
                  value={editingDay.summary}
                  onChange={(e) => setEditingDay({ ...editingDay, summary: e.target.value })}
                  className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingDay(null)}
                className="px-4 py-2 rounded-full border border-black/10 text-xs font-bold uppercase text-[#717975]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDay}
                className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Edit Activity Stop ─────────────────────────────── */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-black/10 shadow-2xl space-y-4">
            <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Edit Scheduled Stop
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Title</label>
                <input
                  type="text"
                  value={editingActivity.title}
                  onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Location Name</label>
                <input
                  type="text"
                  value={editingActivity.location || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, location: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Start Time</label>
                <input
                  type="text"
                  value={editingActivity.start_time || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, start_time: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">End Time</label>
                <input
                  type="text"
                  value={editingActivity.end_time || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, end_time: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Category</label>
                <select
                  value={editingActivity.category || 'SIGHTSEEING'}
                  onChange={(e) => setEditingActivity({ ...editingActivity, category: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                >
                  <option value="SIGHTSEEING">SIGHTSEEING</option>
                  <option value="ADVENTURE">ADVENTURE</option>
                  <option value="FOOD">FOOD</option>
                  <option value="TRANSPORT">TRANSPORT</option>
                  <option value="ACCOMMODATION">ACCOMMODATION</option>
                  <option value="SHOPPING">SHOPPING</option>
                  <option value="CULTURE">CULTURE</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Cost (PKR)</label>
                <input
                  type="number"
                  value={editingActivity.estimated_cost || 0}
                  onChange={(e) => setEditingActivity({ ...editingActivity, estimated_cost: Number(e.target.value) })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingActivity(null)}
                className="px-4 py-2 rounded-full border border-black/10 text-xs font-bold uppercase text-[#717975]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveActivity}
                className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Add Custom Activity Stop ───────────────────────── */}
      {addingActivityDayId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-black/10 shadow-2xl space-y-4">
            <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Add Custom Stop to Itinerary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Activity Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Shangrila Resort Sunrise Walk"
                  value={newActivityForm.title}
                  onChange={(e) => setNewActivityForm({ ...newActivityForm, title: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Location / Hotel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Lower Kachura Lake, Skardu"
                  value={newActivityForm.location}
                  onChange={(e) => setNewActivityForm({ ...newActivityForm, location: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Start Time</label>
                <input
                  type="text"
                  value={newActivityForm.start_time}
                  onChange={(e) => setNewActivityForm({ ...newActivityForm, start_time: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">End Time</label>
                <input
                  type="text"
                  value={newActivityForm.end_time}
                  onChange={(e) => setNewActivityForm({ ...newActivityForm, end_time: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Category</label>
                <select
                  value={newActivityForm.category}
                  onChange={(e) => setNewActivityForm({ ...newActivityForm, category: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                >
                  <option value="SIGHTSEEING">SIGHTSEEING</option>
                  <option value="ADVENTURE">ADVENTURE</option>
                  <option value="FOOD">FOOD</option>
                  <option value="TRANSPORT">TRANSPORT</option>
                  <option value="ACCOMMODATION">ACCOMMODATION</option>
                  <option value="SHOPPING">SHOPPING</option>
                  <option value="CULTURE">CULTURE</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Cost (PKR)</label>
                <input
                  type="number"
                  value={newActivityForm.estimated_cost}
                  onChange={(e) => setNewActivityForm({ ...newActivityForm, estimated_cost: Number(e.target.value) })}
                  className="w-full p-2.5 bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAddingActivityDayId(null)}
                className="px-4 py-2 rounded-full border border-black/10 text-xs font-bold uppercase text-[#717975]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddActivity(addingActivityDayId)}
                className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase"
              >
                Add Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
