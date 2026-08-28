import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Users,
  Calendar,
  Wallet,
  Building,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Minus,
  Clock,
  ShieldCheck,
  Globe,
  Lock,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Tag,
  Send,
  Loader2,
  Share2,
  Copy,
  Info,
  Phone,
  Mail,
  User,
  Navigation,
} from 'lucide-react';
import { tripsService } from '../../services/trips';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function PlanTripPage() {
  const navigate = useNavigate();
  const { backendUser } = useAuth();

  // ─── Flow State ────────────────────────────────────────────────────────
  // 'QUESTIONS' | 'GENERATING' | 'RESULT'
  const [stage, setStage] = useState('QUESTIONS');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;

  // ─── Question Form State ──────────────────────────────────────────────
  const [origin, setOrigin] = useState('Islamabad');
  const [destination, setDestination] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [durationOption, setDurationOption] = useState('4-6_days'); // '1_day' | '2-3_days' | '4-6_days' | '7+_days' | 'exact_dates'
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('10000');
  const [budgetType, setBudgetType] = useState('total_trip'); // 'total_trip' | 'per_person'
  const [budgetFlexibility, setBudgetFlexibility] = useState('some_flexibility'); // 'strict' | 'some_flexibility' | 'flexible'
  const [accommodation, setAccommodation] = useState('budget'); // 'none' | 'budget' | 'comfortable' | 'premium' | 'friday_decide'
  const [selectedStyles, setSelectedStyles] = useState(['Nature', 'Scenic']);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Auto-adjust accommodation selection if budget drops below required minimum
  useEffect(() => {
    const total = Number(budgetAmount) || 10000;
    if (total < 20000 && (accommodation === 'comfortable' || accommodation === 'premium')) {
      setAccommodation('budget');
    } else if (total < 30000 && accommodation === 'premium') {
      setAccommodation('comfortable');
    }
  }, [budgetAmount]);

  // ─── Step 7: Compulsory Traveler Contact Details ───────────────────────
  const [leadContact, setLeadContact] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [companions, setCompanions] = useState([]);

  // Pre-fill Lead Traveler from Auth Context
  useEffect(() => {
    if (backendUser) {
      setLeadContact((prev) => ({
        ...prev,
        name: prev.name || backendUser.name || backendUser.full_name || 'Traveler',
        email: prev.email || backendUser.email || '',
        phone: prev.phone || backendUser.phone || '',
      }));
    }
  }, [backendUser]);

  // Adjust Companions list when travelers count changes
  useEffect(() => {
    const companionCount = Math.max(0, travelers - 1);
    setCompanions((prev) => {
      const next = [];
      for (let i = 0; i < companionCount; i++) {
        next.push(prev[i] || { name: '', email: '', phone: '' });
      }
      return next;
    });
  }, [travelers]);

  // ─── Generated Plan State ─────────────────────────────────────────────
  const [generatedTripId, setGeneratedTripId] = useState(null);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);

  // ─── Editable Plan State ──────────────────────────────────────────────
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editableBudget, setEditableBudget] = useState('');

  // ─── Secondary Conversational Refinement ──────────────────────────────
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // ─── AI Generation Progress Animation ────────────────────────────────
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const loadingStages = [
    'Performing real-time web research on destination & route...',
    'Fetching authentic photography and scenic highlights from the web...',
    'Optimizing transit from your departure city to destination...',
    'Checking mountain road advisories and local weather conditions...',
    'Balancing your budget allocations across transit, stays & food...',
    'Architecting your bespoke day-by-day itinerary with photo timelines...',
    'Preparing instant WhatsApp & Email itinerary dispatches...',
  ];

  useEffect(() => {
    let interval;
    if (stage === 'GENERATING') {
      interval = setInterval(() => {
        setLoadingStageIdx((prev) => (prev < loadingStages.length - 1 ? prev + 1 : prev));
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [stage]);

  const originSuggestions = [
    'Islamabad',
    'Lahore',
    'Karachi',
    'Rawalpindi',
    'Peshawar',
    'Faisalabad',
    'Multan',
  ];

  const popularSuggestions = [
    'Pine Valley',
    'Hunza Valley',
    'Skardu & Deosai',
    'Swat & Kalam',
    'Fairy Meadows',
    'Kumrat Valley',
    'Naran & Kaghan',
    'Chitral & Kalash',
    'Attabad Lake',
    'Neelum Valley',
    'Passu Cones',
    'Basho Valley',
  ];

  const styleOptions = [
    'Adventure',
    'Nature',
    'Relaxed',
    'Road trip',
    'Food & Culture',
    'Photography',
    'Family-friendly',
    'Trekking',
  ];

  const toggleStyle = (style) => {
    if (selectedStyles.includes(style)) {
      if (selectedStyles.length > 1) {
        setSelectedStyles(selectedStyles.filter((s) => s !== style));
      }
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  // ─── Submission Handler with Contact Validations ───────────────────────
  const handleGeneratePlan = async () => {
    if (!destination.trim()) {
      toast.error('Please enter where you want to go.');
      setCurrentStep(1);
      return;
    }

    if (!origin.trim()) {
      toast.error('Please enter your starting/departure city.');
      setCurrentStep(1);
      return;
    }

    // Validate Lead Contact Phone & Email
    if (!leadContact.phone.trim()) {
      toast.error('Your contact phone number is compulsory for trip dispatch.');
      setCurrentStep(7);
      return;
    }

    // Validate Companions (if any)
    if (travelers > 1) {
      for (let i = 0; i < companions.length; i++) {
        const c = companions[i];
        if (!c.name.trim() || !c.phone.trim() || !c.email.trim()) {
          toast.error(`Please provide complete details (Name, Email, Phone) for Companion #${i + 2}.`);
          setCurrentStep(7);
          return;
        }
      }
    }

    setStage('GENERATING');
    setLoadingStageIdx(0);

    let daysCount = 4;
    if (durationOption === '1_day') daysCount = 1;
    else if (durationOption === '2-3_days') daysCount = 3;
    else if (durationOption === '4-6_days') daysCount = 5;
    else if (durationOption === '7+_days') daysCount = 7;
    else if (departureDate && returnDate) {
      const diff = Math.ceil((new Date(returnDate) - new Date(departureDate)) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) daysCount = diff;
    }

    const payload = {
      destination_query: destination.trim(),
      origin: origin.trim() || 'Islamabad',
      travelers: Number(travelers),
      duration: durationOption,
      duration_days: daysCount,
      departure_date: departureDate || null,
      return_date: returnDate || null,
      budget: Number(budgetAmount) || 10000,
      budget_type: budgetType,
      budget_flexibility: budgetFlexibility,
      accommodation_preference: accommodation,
      travel_styles: selectedStyles,
      additional_preferences: additionalNotes.trim() || null,
      lead_contact: leadContact,
      companions: companions,
    };

    try {
      const response = await tripsService.guidedPlan(payload);
      setGeneratedTripId(response.id);
      setGeneratedPlan(response);
      setEditableTitle(response.trip?.title || `${destination.trim()}, at your pace`);
      setEditableBudget(response.trip?.budget_total || response.budget_breakdown?.total || 10000);
      setIsPublic(response.trip?.is_public || false);
      setStage('RESULT');
      toast.success('Your bespoke Friday itinerary has been generated!');
    } catch (err) {
      console.error('Error generating guided plan:', err);
      toast.error('Friday could not complete planning. Please try again.');
      setStage('QUESTIONS');
    }
  };

  // ─── Save / Visibility Handler ─────────────────────────────────────────
  const handleSetVisibility = async (publishPublicly) => {
    if (!generatedTripId) return;
    setIsSavingVisibility(true);
    try {
      await tripsService.toggleVisibility(generatedTripId, publishPublicly);
      setIsPublic(publishPublicly);
      if (publishPublicly) {
        toast.success('Your trip is now publicly posted in the Friday community!');
      } else {
        toast.success('Trip saved as private.');
      }
      navigate('/my-trips');
    } catch (err) {
      console.error('Error setting trip visibility:', err);
      toast.error('Failed to update trip visibility.');
    } finally {
      setIsSavingVisibility(false);
    }
  };

  // ─── Inline Edit Save ──────────────────────────────────────────────────
  const handleSaveInlineTitle = async () => {
    if (!editableTitle.trim() || !generatedTripId) return;
    try {
      await tripsService.updateTrip(generatedTripId, { title: editableTitle.trim() });
      setGeneratedPlan((prev) => ({
        ...prev,
        trip: { ...prev.trip, title: editableTitle.trim() },
      }));
      setIsEditingTitle(false);
      toast.success('Trip title updated.');
    } catch {
      toast.error('Failed to update title.');
    }
  };

  const handleSaveInlineBudget = async () => {
    const val = Number(editableBudget);
    if (!val || val <= 0 || !generatedTripId) return;
    try {
      await tripsService.updateTrip(generatedTripId, {
        budget_total: val,
        budget_per_person: Math.round(val / travelers),
      });
      setGeneratedPlan((prev) => ({
        ...prev,
        trip: { ...prev.trip, budget_total: val, budget_per_person: Math.round(val / travelers) },
      }));
      setIsEditingBudget(false);
      toast.success('Budget updated.');
    } catch {
      toast.error('Failed to update budget.');
    }
  };

  // ─── Secondary Conversational Refinement ──────────────────────────────
  const handleRefineTrip = async (e) => {
    e?.preventDefault();
    if (!refineInput.trim() || isRefining || !generatedTripId) return;

    const msg = refineInput.trim();
    setRefineInput('');
    setIsRefining(true);

    try {
      const res = await tripsService.replanTrip(generatedTripId, { message: msg });
      toast.success(res.message || 'Itinerary refined successfully!');
      const updated = await tripsService.getTrip(generatedTripId);
      const updatedItin = await tripsService.getItinerary(generatedTripId).catch(() => null);
      if (updated) {
        setGeneratedPlan((prev) => ({
          ...prev,
          trip: updated,
          itinerary: updatedItin || prev.itinerary,
        }));
      }
    } catch (err) {
      console.error('Refinement error:', err);
      toast.error('Could not refine trip. Try phrasing differently.');
    } finally {
      setIsRefining(false);
    }
  };

  // ─── RENDER: AI PLANNING PROGRESS STATE ────────────────────────────────
  if (stage === 'GENERATING') {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[80vh] px-6 py-16 bg-[#F8FAF6] text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in duration-700">
          <div className="w-16 h-16 rounded-3xl bg-[#00261D] text-[#BBEAD5] flex items-center justify-center mx-auto shadow-md animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <h1
              className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Friday is researching {destination || 'your destination'}.
            </h1>
            <p className="text-sm text-[#717975] italic" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Live web research from {origin || 'your city'} to {destination || 'destination'}.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-black/10 shadow-xs space-y-3 text-left">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#00261D] shrink-0" />
              <span className="text-xs font-semibold text-[#00261D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {loadingStages[loadingStageIdx]}
              </span>
            </div>
            <div className="w-full bg-[#F3F4F0] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#00261D] h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${((loadingStageIdx + 1) / loadingStages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: GENERATED EDITABLE TRIP PLAN (PHASE B) ────────────────────
  if (stage === 'RESULT' && generatedPlan) {
    const trip = generatedPlan.trip || {};
    const itinerary = generatedPlan.itinerary || { days: [] };
    const budgetBreakdown = generatedPlan.budget_breakdown || {};
    const advisories = generatedPlan.advisories || [];
    const heroImage = trip.image_url || '/images/stitch/stitch_asset_11.jpg';

    return (
      <div className="w-full flex-1 flex justify-between min-h-screen bg-[#F8FAF6]">
        <div className="flex-1 flex justify-center px-4 sm:px-8 lg:px-12 py-10">
          <div className="w-full max-w-3xl space-y-10">
            {/* Top Label & Actions */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#717975]">
                YOUR FRIDAY PLAN
              </span>
              <button
                onClick={() => setStage('QUESTIONS')}
                className="text-xs font-semibold text-[#00261D] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Adjust Preferences</span>
              </button>
            </div>

            {/* Editorial Heading & Trip Overview Hero with Real Web Photo Banner */}
            <div className="bg-white rounded-3xl overflow-hidden border border-black/10 shadow-xs">
              {/* Real Web Photography Banner */}
              <div className="relative h-64 sm:h-72 w-full bg-[#00261D] overflow-hidden">
                <img
                  src={heroImage}
                  alt={trip.destination || destination}
                  onError={(e) => {
                    e.currentTarget.src = '/images/stitch/stitch_asset_11.jpg';
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-1.5">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-[#BBEAD5] inline-block">
                    Live Web Researched Route
                  </span>
                  <h2
                    className="text-3xl sm:text-4xl font-normal text-white"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    From {trip.origin || origin} to {trip.destination || destination}
                  </h2>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editableTitle}
                        onChange={(e) => setEditableTitle(e.target.value)}
                        className="text-3xl sm:text-4xl font-normal text-[#00261D] border-b border-[#00261D] focus:outline-none w-full bg-transparent"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      />
                      <button
                        onClick={handleSaveInlineTitle}
                        className="px-4 py-2 bg-[#00261D] text-white rounded-full text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingTitle(false)}
                        className="px-3 py-2 text-xs text-[#717975] hover:text-black shrink-0 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <h1
                        className="text-3xl sm:text-4xl font-normal text-[#00261D] leading-tight"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      >
                        {trip.title || `${trip.destination || destination}, at your pace`}
                      </h1>
                      <button
                        onClick={() => setIsEditingTitle(true)}
                        className="p-2 rounded-full hover:bg-slate-100 text-[#717975] hover:text-[#00261D] transition-colors shrink-0 cursor-pointer"
                        title="Edit trip title"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-[#717975] flex items-center gap-2 pt-1 flex-wrap" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="flex items-center gap-1 font-semibold text-[#00261D]">
                      <Navigation className="w-3.5 h-3.5 text-[#717975]" />
                      <span>{trip.origin || origin}</span>
                    </span>
                    <span>→</span>
                    <span className="flex items-center gap-1 font-semibold text-[#00261D]">
                      <MapPin className="w-3.5 h-3.5 text-[#00261D]" />
                      <span>{trip.destination || destination}</span>
                    </span>
                    <span>•</span>
                    <span>{trip.duration || 4} Days</span>
                    <span>•</span>
                    <span>{trip.travelers || travelers} Traveler(s)</span>
                  </p>
                </div>

                {/* Stat Highlights Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5">
                    <span className="text-[10px] text-[#717975] uppercase font-bold block">Departure</span>
                    <span className="text-sm font-bold text-[#00261D] truncate block">{trip.origin || origin}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5">
                    <span className="text-[10px] text-[#717975] uppercase font-bold block">Destination</span>
                    <span className="text-sm font-bold text-[#00261D] truncate block">{trip.destination || destination}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5">
                    <span className="text-[10px] text-[#717975] uppercase font-bold block">Travelers</span>
                    <span className="text-sm font-bold text-[#00261D]">{trip.travelers || travelers} People</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5">
                    <span className="text-[10px] text-[#717975] uppercase font-bold block">Estimated Cost</span>
                    <span className="text-sm font-bold text-[#420E00]">
                      Rs. {Number(trip.budget_total || budgetAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Budget Breakdown Section ───────────────────────────── */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975]">
                    ESTIMATED ALLOCATION
                  </span>
                  <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Budget Breakdown
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#717975] block">Total Estimate</span>
                  <span className="text-2xl font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    PKR {Number(trip.budget_total || budgetAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                  <span className="text-[10px] text-[#717975] uppercase font-semibold block">Transport</span>
                  <span className="text-sm font-bold text-[#00261D]">
                    PKR {Number(budgetBreakdown.transport || 3000).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                  <span className="text-[10px] text-[#717975] uppercase font-semibold block">Accommodation</span>
                  <span className="text-sm font-bold text-[#00261D]">
                    PKR {Number(budgetBreakdown.accommodation || 4000).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                  <span className="text-[10px] text-[#717975] uppercase font-semibold block">Food</span>
                  <span className="text-sm font-bold text-[#00261D]">
                    PKR {Number(budgetBreakdown.food || 2000).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                  <span className="text-[10px] text-[#717975] uppercase font-semibold block">Activities</span>
                  <span className="text-sm font-bold text-[#00261D]">
                    PKR {Number(budgetBreakdown.activities || 1000).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[#717975] uppercase font-semibold block">Contingency</span>
                  <span className="text-sm font-bold text-[#00261D]">
                    PKR {Number(budgetBreakdown.other || 1000).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Day-by-Day Itinerary with Real Photo Timelines ──────── */}
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975]">
                  SCHEDULE & PHOTO TIMELINE
                </span>
                <h3 className="text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Day-by-Day Itinerary
                </h3>
              </div>

              <div className="space-y-6">
                {itinerary.days.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-5"
                  >
                    <div className="border-b border-black/5 pb-3">
                      <span className="text-xs font-bold text-[#420E00] uppercase tracking-widest block">
                        DAY {day.day_number || dIdx + 1}
                      </span>
                      <h4 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                        {day.title}
                      </h4>
                      {day.summary && (
                        <p className="text-xs sm:text-sm text-[#555E59] mt-1 leading-relaxed">
                          {day.summary}
                        </p>
                      )}
                    </div>

                    {/* Activities List with Exact Hours, Locations, and Thumbnails */}
                    <div className="space-y-3.5">
                      {(day.activities || []).map((act, aIdx) => {
                        const actThumb = act.image_url || heroImage;
                        return (
                          <div
                            key={aIdx}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5 gap-3.5 hover:border-black/15 transition-all"
                          >
                            <div className="flex items-center gap-3.5 w-full sm:w-auto">
                              {/* Activity Image Thumbnail */}
                              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#00261D] border border-black/10">
                                <img
                                  src={actThumb}
                                  alt={act.title}
                                  onError={(e) => {
                                    e.currentTarget.src = heroImage;
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="px-2.5 py-0.5 rounded-full bg-white border border-black/10 text-[10px] font-bold text-[#00261D] shrink-0 flex items-center gap-1 shadow-2xs">
                                    <Clock className="w-3 h-3 text-[#717975]" />
                                    <span>{act.start_time} – {act.end_time}</span>
                                  </div>

                                  {act.category && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-[#717975] border border-black/5">
                                      {act.category}
                                    </span>
                                  )}
                                </div>

                                <h5 className="text-sm font-bold text-[#00261D] mt-1">
                                  {act.title}
                                </h5>
                                <p className="text-xs text-[#555E59] mt-0.5 leading-relaxed">
                                  {act.description}
                                </p>
                                {act.location && (
                                  <p className="text-[11px] text-[#717975] flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{act.location}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {act.estimated_cost > 0 && (
                              <div className="self-end sm:self-center shrink-0 text-right">
                                <span className="text-[10px] text-[#717975] block">Estimated</span>
                                <span className="text-xs font-bold text-[#420E00]">
                                  PKR {Number(act.estimated_cost).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Friday AI Research Advisories ─────────────────────── */}
            {advisories.length > 0 && (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975]">
                    INTELLIGENCE & FIELD GUIDANCE
                  </span>
                  <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Friday Recommends
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {advisories.map((adv, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-3xl bg-[#00261D] text-white space-y-2 relative overflow-hidden shadow-xs"
                    >
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#BBEAD5]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{adv.title}</span>
                      </div>
                      <p className="text-xs text-white/90 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {adv.message}
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#BBEAD5] bg-white/10 px-2.5 py-0.5 rounded-full">
                          AI Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Secondary Conversational AI Refinement ─────────────── */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00261D]">
                <Sparkles className="w-4 h-4 text-[#00261D]" />
                <span>Ask Friday to refine something</span>
              </div>
              <p className="text-xs text-[#717975]">
                Want to tweak this plan? E.g., <em>"Make it 5k cheaper"</em>, <em>"Add more trekking"</em>, or <em>"Include Pine Valley viewpoint rest"</em>.
              </p>

              <form onSubmit={handleRefineTrip} className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Tell Friday what to adjust in this itinerary..."
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  disabled={isRefining}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-full py-3.5 pl-5 pr-14 text-xs sm:text-sm text-[#191C1A] placeholder:text-[#717975] focus:outline-none focus:border-[#00261D]"
                />
                <button
                  type="submit"
                  disabled={!refineInput.trim() || isRefining}
                  className="absolute right-2 p-2 rounded-full bg-[#00261D] text-white hover:bg-[#00261D]/90 disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </form>
            </div>

            {/* ─── Save & Visibility Choice Actions ────────────────────── */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-black/10 shadow-xs space-y-6">
              <div className="text-center space-y-2">
                <h3
                  className="text-3xl sm:text-4xl font-normal text-[#00261D]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  What would you like to do with this trip?
                </h3>
                <p className="text-xs sm:text-sm text-[#717975] max-w-md mx-auto">
                  Save your journey privately to your personal vault, or share it with the Friday community.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-6 rounded-2xl border border-black/10 hover:border-[#00261D] transition-all bg-[#F8FAF6] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-[#00261D]">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-[#00261D]">
                      Keep It Private
                    </h4>
                    <p className="text-xs text-[#717975] leading-relaxed">
                      Only you can view, edit, and organize this itinerary in your personal account.
                    </p>
                  </div>

                  <button
                    onClick={() => handleSetVisibility(false)}
                    disabled={isSavingVisibility}
                    className="w-full py-3 rounded-full border border-black/15 bg-white hover:bg-[#E7E9E5] text-[#00261D] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Keep Private
                  </button>
                </div>

                <div className="p-6 rounded-2xl border border-[#00261D] bg-[#00261D] text-white flex flex-col justify-between space-y-4 shadow-sm">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#BBEAD5]">
                      <Globe className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-white">
                      Post to Friday Community
                    </h4>
                    <p className="text-xs text-white/80 leading-relaxed">
                      Publish to the community feed so fellow travelers can explore and copy your route.
                    </p>
                  </div>

                  <button
                    onClick={() => handleSetVisibility(true)}
                    disabled={isSavingVisibility}
                    className="w-full py-3 rounded-full bg-[#BBEAD5] hover:bg-[#a6e2c8] text-[#00261D] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Post Trip →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: GUIDED TRIP QUESTIONS FLOW (PHASE A) ──────────────────────
  return (
    <div className="w-full flex-1 flex justify-between min-h-screen bg-[#F8FAF6]">
      <main className="flex-1 flex flex-col justify-between px-4 sm:px-8 lg:px-12 py-8 max-w-3xl mx-auto w-full">
        {/* Step Indicator Header */}
        <header className="flex items-center justify-between pb-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="p-2 rounded-full hover:bg-slate-100 text-[#717975] hover:text-black transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
              STEP {currentStep} OF {totalSteps}
            </span>
          </div>

          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((st) => (
              <div
                key={st}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  st === currentStep
                    ? 'w-8 bg-[#00261D]'
                    : st < currentStep
                    ? 'w-4 bg-[#00261D]/40'
                    : 'w-4 bg-black/10'
                }`}
              />
            ))}
          </div>
        </header>

        {/* Dynamic Step Content */}
        <div className="flex-1 py-8 flex flex-col justify-center">
          {/* ─── STEP 1: ORIGIN & DESTINATION ────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <h1
                  className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Where is your journey taking you?
                </h1>
                <p className="text-xs sm:text-sm text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Choose your departure city and destination — Friday will research live routes & photography.
                </p>
              </div>

              {/* Origin / Starting City Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#00261D] uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#00261D]" />
                  <span>Starting From (Departure City)</span>
                </label>
                <input
                  type="text"
                  placeholder="Where are you starting from? (e.g. Lahore, Karachi, Islamabad...)"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-2xl py-4 px-5 text-base font-semibold text-[#191C1A] placeholder-[#717975] focus:outline-none focus:border-[#00261D] shadow-xs transition-all"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {originSuggestions.map((cit, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setOrigin(cit)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        origin.toLowerCase() === cit.toLowerCase()
                          ? 'bg-[#00261D] text-white shadow-2xs'
                          : 'bg-white text-[#717975] border border-black/10 hover:border-black/30'
                      }`}
                    >
                      {cit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Input */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-[#00261D] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#00261D]" />
                  <span>Destination (Where to go)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-[#717975]" />
                  <input
                    type="text"
                    placeholder="Enter any valley, lake, or city (e.g. Pine Valley, Swat, Hunza...)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && destination.trim()) setCurrentStep(2);
                    }}
                    autoFocus
                    className="w-full bg-white border border-black/10 rounded-2xl py-5 pl-15 pr-6 text-lg text-[#191C1A] placeholder-[#717975] focus:outline-none focus:border-[#00261D] shadow-xs transition-all"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block">
                    POPULAR PLACES & VALLEYS
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {popularSuggestions.map((place, idx) => (
                      <button
                        key={idx}
                        onClick={() => setDestination(place)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                          destination === place
                            ? 'bg-[#00261D] text-white shadow-xs scale-105'
                            : 'bg-white text-[#414845] border border-black/10 hover:border-[#00261D]'
                        }`}
                      >
                        {place}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: TRAVELERS (Numeric Stepper 1-10) ─────────────── */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <h1
                  className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  How many people are going?
                </h1>
                <p className="text-xs sm:text-sm text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Including you. Private trips can include up to 10 travelers.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-black/10 shadow-xs flex flex-col items-center justify-center space-y-6">
                <div className="flex items-center gap-8">
                  <button
                    onClick={() => setTravelers((prev) => Math.max(1, prev - 1))}
                    disabled={travelers <= 1}
                    className="w-14 h-14 rounded-full border border-black/15 bg-[#F8FAF6] hover:bg-[#E7E9E5] text-[#00261D] disabled:opacity-30 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Minus className="w-6 h-6" />
                  </button>

                  <div className="text-center min-w-[140px]">
                    <span
                      className="text-6xl sm:text-7xl font-normal text-[#00261D] block"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {travelers}
                    </span>
                    <span className="text-xs uppercase font-bold tracking-wider text-[#717975]">
                      {travelers === 1 ? 'Solo Traveler' : 'Travelers'}
                    </span>
                  </div>

                  <button
                    onClick={() => setTravelers((prev) => Math.min(10, prev + 1))}
                    disabled={travelers >= 10}
                    className="w-14 h-14 rounded-full border border-black/15 bg-[#F8FAF6] hover:bg-[#E7E9E5] text-[#00261D] disabled:opacity-30 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-[11px] text-[#717975]">
                  {travelers >= 10
                    ? 'Maximum group limit reached for private AI-planned expeditions.'
                    : 'Personal AI itineraries are optimized for groups of 1 to 10.'}
                </p>
              </div>
            </div>
          )}

          {/* ─── STEP 3: TRIP DURATION ───────────────────────────────── */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <h1
                  className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  How much time do you have?
                </h1>
                <p className="text-xs sm:text-sm text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Choose an estimated timeframe or specify your exact calendar dates.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {[
                  { id: '1_day', label: '1 Day', sub: 'Quick day escape' },
                  { id: '2-3_days', label: '2–3 Days', sub: 'Weekend getaway' },
                  { id: '4-6_days', label: '4–6 Days', sub: 'Classic valley trip' },
                  { id: '7+_days', label: '7+ Days', sub: 'Grand expedition' },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setDurationOption(opt.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      durationOption === opt.id
                        ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs scale-105'
                        : 'bg-white text-[#191C1A] border-black/10 hover:border-[#00261D]'
                    }`}
                  >
                    <span className="text-lg font-bold block" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {opt.label}
                    </span>
                    <p className={`text-xs ${durationOption === opt.id ? 'text-white/80' : 'text-[#717975]'}`}>
                      {opt.sub}
                    </p>
                  </div>
                ))}
              </div>

              <div
                onClick={() => setDurationOption('exact_dates')}
                className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-4 ${
                  durationOption === 'exact_dates'
                    ? 'bg-white border-[#00261D] shadow-sm ring-1 ring-[#00261D]'
                    : 'bg-white border-black/10 hover:border-black/25'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#00261D]" />
                  <span className="text-sm font-bold text-[#00261D]">Choose Exact Calendar Dates</span>
                </div>

                {durationOption === 'exact_dates' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-[#717975] uppercase block mb-1">Departure Date</label>
                      <input
                        type="date"
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#717975] uppercase block mb-1">Return Date</label>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 4: BUDGET (Default PKR 10,000) ──────────────────── */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <h1
                  className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  What's your budget?
                </h1>
                <p className="text-xs sm:text-sm text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  A rough estimate is enough. Default is set to PKR 10,000.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-black/5 pb-4">
                  <span className="text-xs font-bold text-[#717975] uppercase tracking-wider">
                    CALCULATE BUDGET AS
                  </span>
                  <div className="flex gap-1.5 p-1 rounded-full bg-[#F3F4F0] text-xs font-bold">
                    <button
                      onClick={() => setBudgetType('total_trip')}
                      className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                        budgetType === 'total_trip' ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975]'
                      }`}
                    >
                      Total Trip
                    </button>
                    <button
                      onClick={() => setBudgetType('per_person')}
                      className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                        budgetType === 'per_person' ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975]'
                      }`}
                    >
                      Per Person
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-[#717975]">
                    PKR
                  </span>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl py-4 pl-20 pr-6 text-2xl font-bold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-[#717975] uppercase tracking-wider block">
                    HOW FLEXIBLE IS YOUR BUDGET?
                  </span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'strict', label: 'Strict' },
                      { id: 'some_flexibility', label: 'Some Flexibility' },
                      { id: 'flexible', label: 'Flexible' },
                    ].map((flex) => (
                      <button
                        key={flex.id}
                        onClick={() => setBudgetFlexibility(flex.id)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          budgetFlexibility === flex.id
                            ? 'bg-[#00261D] text-white'
                            : 'bg-[#F8FAF6] text-[#414845] border border-black/10 hover:bg-[#E7E9E5]'
                        }`}
                      >
                        {flex.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 5: ACCOMMODATION ────────────────────────────────── */}
          {currentStep === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <h1
                  className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Where would you like to stay?
                </h1>
                <p className="text-xs sm:text-sm text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  We'll only include accommodation when your trip needs it.
                </p>
                {durationOption === '1_day' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-semibold">
                    <Info className="w-3.5 h-3.5" />
                    <span>You may not need accommodation for a 1-day trip.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { id: 'none', title: 'No stay needed', sub: 'Day trip or independent lodging', minBudget: 0 },
                  { id: 'budget', title: 'Budget stay', sub: 'Clean local guest houses & hostels', minBudget: 0 },
                  { id: 'comfortable', title: 'Comfortable hotel', sub: 'Standard 3-star quality lodges', minBudget: 20000 },
                  { id: 'premium', title: 'Premium retreat', sub: 'Luxury mountain resort & suites', minBudget: 30000 },
                  { id: 'friday_decide', title: 'Let Friday decide', sub: 'Optimized automatically for budget', minBudget: 0 },
                ].map((acc) => {
                  const currentTotalBudget = Number(budgetAmount) || 10000;
                  const isLocked = currentTotalBudget < acc.minBudget;
                  const isSelected = accommodation === acc.id;

                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        if (isLocked) {
                          toast.error(`${acc.title} requires a minimum budget of PKR ${acc.minBudget.toLocaleString()}.`);
                          return;
                        }
                        setAccommodation(acc.id);
                      }}
                      className={`p-5 rounded-2xl border transition-all relative space-y-1.5 ${
                        isLocked
                          ? 'opacity-40 bg-slate-100/70 border-slate-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs cursor-pointer'
                          : 'bg-white text-[#191C1A] border-black/10 hover:border-[#00261D] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold block" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {acc.title}
                        </span>
                        {isLocked && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                            Min. PKR {acc.minBudget / 1000}k
                          </span>
                        )}
                        {isSelected && !isLocked && (
                          <Check className="w-4 h-4 text-[#BBEAD5]" />
                        )}
                      </div>
                      <p className={`text-xs ${isSelected && !isLocked ? 'text-white/80' : 'text-[#717975]'}`}>
                        {acc.sub}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── STEP 6: TRAVEL STYLE & PREFERENCES ──────────────────── */}
          {currentStep === 6 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <h1
                  className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  What kind of trip are you looking for?
                </h1>
                <p className="text-xs sm:text-sm text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Choose as many as feel right.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {styleOptions.map((style, idx) => {
                  const isSelected = selectedStyles.includes(style);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleStyle(style)}
                      className={`px-5 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#00261D] text-white shadow-xs scale-105'
                          : 'bg-white text-[#414845] border border-black/10 hover:border-[#00261D]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{style}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-[#00261D] uppercase tracking-wider block">
                  Anything else? (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell Friday what kind of experience you're hoping for (e.g., 'I prefer quiet places and less crowded locations')..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full p-4 text-xs sm:text-sm bg-white border border-black/10 rounded-2xl focus:outline-none focus:border-[#00261D] shadow-xs"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
            </div>
          )}

          {/* ─── STEP 7: COMPULSORY TRAVELER CONTACT VERIFICATION ────── */}
          {currentStep === 7 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                    Mandatory Contact Verification
                  </span>
                </div>
                <h1
                  className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Who is traveling?
                </h1>
                <p className="text-xs sm:text-sm text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Please provide verified contact details so Friday's AI layer can dispatch WhatsApp briefings & email itineraries.
                </p>
              </div>

              {/* Lead Traveler Card (You) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-black/5 pb-3">
                  <User className="w-4 h-4 text-[#00261D]" />
                  <span className="text-xs font-bold text-[#00261D] uppercase tracking-wider">
                    Lead Traveler (You)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={leadContact.name}
                      onChange={(e) => setLeadContact({ ...leadContact, name: e.target.value })}
                      placeholder="Your Full Name"
                      className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D] font-semibold text-[#00261D]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={leadContact.email}
                      onChange={(e) => setLeadContact({ ...leadContact, email: e.target.value })}
                      placeholder="your.email@domain.com"
                      className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D] font-semibold text-[#00261D]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#420E00] block mb-1">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      value={leadContact.phone}
                      onChange={(e) => setLeadContact({ ...leadContact, phone: e.target.value })}
                      placeholder="+92 300 1234567"
                      className="w-full p-3 text-xs bg-[#F8FAF6] border border-[#00261D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00261D] font-bold text-[#00261D]"
                    />
                  </div>
                </div>
              </div>

              {/* Companions Details (If travelers > 1) */}
              {travelers > 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00261D] uppercase tracking-wider">
                      Co-Travelers & Companions ({companions.length})
                    </span>
                    <span className="text-[11px] text-[#717975]">All fields required</span>
                  </div>

                  {companions.map((comp, cIdx) => (
                    <div
                      key={cIdx}
                      className="bg-white rounded-3xl p-6 border border-black/10 shadow-xs space-y-4"
                    >
                      <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                        <Users className="w-4 h-4 text-[#717975]" />
                        <span className="text-xs font-bold text-[#00261D]">
                          Companion #{cIdx + 2} Details
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#717975] block mb-1">Full Name *</label>
                          <input
                            type="text"
                            placeholder="Companion Name"
                            value={comp.name}
                            onChange={(e) => {
                              const next = [...companions];
                              next[cIdx].name = e.target.value;
                              setCompanions(next);
                            }}
                            className="w-full p-2.5 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#717975] block mb-1">Email Address *</label>
                          <input
                            type="email"
                            placeholder="companion@email.com"
                            value={comp.email}
                            onChange={(e) => {
                              const next = [...companions];
                              next[cIdx].email = e.target.value;
                              setCompanions(next);
                            }}
                            className="w-full p-2.5 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#420E00] block mb-1">Phone / WhatsApp *</label>
                          <input
                            type="tel"
                            placeholder="+92 3XX XXXXXXX"
                            value={comp.phone}
                            onChange={(e) => {
                              const next = [...companions];
                              next[cIdx].phone = e.target.value;
                              setCompanions(next);
                            }}
                            className="w-full p-2.5 text-xs bg-[#F8FAF6] border border-[#00261D] rounded-xl focus:outline-none font-semibold text-[#00261D]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Bottom Navigation Buttons ───────────────────────────── */}
        <footer className="pt-6 border-t border-black/5 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-[#717975] hover:text-black transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              onClick={() => {
                if (currentStep === 1) {
                  if (!origin.trim()) {
                    toast.error('Please enter your departure city.');
                    return;
                  }
                  if (!destination.trim()) {
                    toast.error('Please enter where you want to travel.');
                    return;
                  }
                }
                setCurrentStep(currentStep + 1);
              }}
              className="px-8 py-3.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 shadow-sm cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleGeneratePlan}
              className="px-10 py-4 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all hover:scale-105 shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#BBEAD5]" />
              <span>Plan my trip →</span>
            </button>
          )}
        </footer>
      </main>

      {/* ─── Right Contextual Summary Panel ───────────────────────── */}
      <aside className="hidden xl:flex flex-col w-80 p-8 shrink-0 border-l border-black/10 space-y-6 bg-[#F8FAF6] sticky top-0 h-screen overflow-y-auto">
        <div className="bg-white rounded-3xl p-6 border border-black/10 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00261D] border-b border-black/5 pb-3">
            <Compass className="w-4 h-4 text-[#00261D]" />
            <span>Your Trip</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-[10px] text-[#717975] uppercase font-bold block">From (Departure)</span>
              <span className="font-bold text-[#00261D]">
                {origin || 'Islamabad'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#717975] uppercase font-bold block">To (Destination)</span>
              <span className="font-bold text-[#00261D]">
                {destination || 'Not selected yet'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Travelers</span>
              <span className="font-semibold text-[#00261D]">
                {travelers} {travelers === 1 ? 'Person' : 'People'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Duration</span>
              <span className="font-semibold text-[#00261D]">
                {durationOption === '1_day' && '1 Day'}
                {durationOption === '2-3_days' && '2–3 Days'}
                {durationOption === '4-6_days' && '4–6 Days'}
                {durationOption === '7+_days' && '7+ Days'}
                {durationOption === 'exact_dates' && (departureDate ? `${departureDate} to ${returnDate || '...'}` : 'Exact dates')}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Budget</span>
              <span className="font-semibold text-[#420E00]">
                PKR {Number(budgetAmount || 0).toLocaleString()} ({budgetType === 'total_trip' ? 'Total' : 'Per Person'})
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Stay</span>
              <span className="font-semibold text-[#00261D] capitalize">
                {accommodation.replace('_', ' ')}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Style</span>
              <span className="font-semibold text-[#00261D]">
                {selectedStyles.join(' · ')}
              </span>
            </div>

            {leadContact.phone && (
              <div>
                <span className="text-[10px] text-[#717975] uppercase font-bold block">Lead Contact</span>
                <span className="font-semibold text-emerald-800">
                  {leadContact.phone}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#00261D]/5 border border-black/5 text-xs text-[#555E59] space-y-1">
          <span className="font-bold text-[#00261D] block">Real-time Web Intelligence</span>
          <p className="text-[11px] leading-relaxed">
            Friday fetches real destination photography and routes via web search, and dispatches automated WhatsApp & Email briefings to all registered companions.
          </p>
        </div>
      </aside>
    </div>
  );
}
