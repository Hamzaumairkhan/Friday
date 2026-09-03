import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  Trash2,
  X,
  Landmark,
  Mountain,
  Award,
  Save,
  FileText,
  RefreshCw,
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  Snowflake,
  Wind,
  Droplets,
} from 'lucide-react';
import { tripsService } from '../../services/trips';
import { packagesService } from '../../services/packages';
import { useAuth } from '../../context/AuthContext';
import { getContextualEmoji } from '../../utils/contextualEmoji';
import toast from 'react-hot-toast';

const renderWeatherIcon = (iconName, className = 'w-5 h-5') => {
  switch (iconName) {
    case 'sun':
      return <Sun className={`${className} text-amber-500`} />;
    case 'cloud-sun':
      return <CloudSun className={`${className} text-amber-600`} />;
    case 'cloud-rain':
      return <CloudRain className={`${className} text-blue-500`} />;
    case 'snowflake':
      return <Snowflake className={`${className} text-cyan-500`} />;
    case 'cloud':
    default:
      return <Cloud className={`${className} text-slate-500`} />;
  }
};

const createCleanTravelerDaysSchedule = (numDays = 3) => {
  const count = Math.max(1, Number(numDays) || 3);
  return Array.from({ length: count }, (_, i) => ({
    day_number: i + 1,
    title: '',
    summary: '',
    activities: [
      {
        title: '',
        start_time: '08:30 AM',
        end_time: '12:30 PM',
        time: '08:30 AM - 12:30 PM',
        location: '',
        description: '',
      },
      {
        title: '',
        start_time: '02:30 PM',
        end_time: '06:30 PM',
        time: '02:30 PM - 06:30 PM',
        location: '',
        description: '',
      },
    ],
  }));
};

export default function PlanTripPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripIdParam = searchParams.get('tripId');
  const { backendUser } = useAuth();

  // ─── Flow State ────────────────────────────────────────────────────────
  // 'QUESTIONS' | 'GENERATING' | 'RESULT'
  const [stage, setStage] = useState('QUESTIONS');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // ─── Question Form State ──────────────────────────────────────────────
  const [origin, setOrigin] = useState('Islamabad');
  const [destination, setDestination] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [durationOption, setDurationOption] = useState('2-3_days'); // '1_day' | '2-3_days' | '4-6_days' | '7+_days' | 'custom'
  const [customDays, setCustomDays] = useState('8');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [budgetMode, setBudgetMode] = useState('friday_decide'); // 'friday_decide' | 'custom'
  const [budgetAmount, setBudgetAmount] = useState('10000');
  const [budgetType, setBudgetType] = useState('total_trip'); // 'total_trip' | 'per_person'
  const [budgetFlexibility, setBudgetFlexibility] = useState('some_flexibility'); // 'strict' | 'some_flexibility' | 'flexible'
  const [needHotelStay, setNeedHotelStay] = useState(true);
  const [accommodation, setAccommodation] = useState('friday_decide'); // 'none' | 'budget' | 'comfortable' | 'premium' | 'friday_decide'
  const [selectedStyles, setSelectedStyles] = useState(['Nature', 'Scenic']);
  const travelStylesOptions = [
    { id: 'Nature', label: '🌿 Nature & Valleys' },
    { id: 'Scenic', label: '📸 Scenic Photography' },
    { id: 'Adventure', label: '🧗 Trekking & Adventure' },
    { id: 'Heritage', label: '🕌 Culture & Heritage' },
    { id: 'Relaxed', label: '☕ Relaxed & Family' },
    { id: 'Food', label: '🍲 Local Cuisine' },
  ];

  const autoCalcBudget = () => {
    const days = getTravelerDaysCount();
    const trav = Number(travelers) || 2;
    return Math.max(15000, days * trav * 5500);
  };

  const handleToggleTravelStyle = (styleId) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId) ? prev.filter((s) => s !== styleId) : [...prev, styleId]
    );
  };
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // ─── Pakistan Geo Validation & Auto-Correction State ───────────────────
  const [geoValidation, setGeoValidation] = useState({
    isValid: true,
    wasCorrected: false,
    correctedName: '',
    error: '',
    checking: false,
    region: '',
    suggestions: [],
  });

  const handleSaveDraftAndExit = () => {
    const draftState = {
      origin,
      destination,
      travelers,
      durationOption,
      customDays,
      departureDate,
      returnDate,
      budgetAmount,
      budgetType,
      budgetFlexibility,
      accommodation,
      selectedStyles,
      additionalNotes,
      slotSelections,
      leadContact,
      companions,
      currentStep,
      stage,
      generatedTripId,
      generatedPlan,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('friday_trip_draft', JSON.stringify(draftState));
    setShowExitModal(false);
    toast.success('Trip saved to Drafts! You can resume anytime from My Trips.', { id: 'draft-saved' });
    navigate('/my-trips');
  };

  const handleDiscardAndExit = () => {
    localStorage.removeItem('friday_trip_draft');
    setShowExitModal(false);
    toast('Draft discarded.', { id: 'draft-discarded' });
    navigate('/my-trips');
  };

  // ─── Weather Advisory State ───────────────────────────────────────────
  const [weatherAdvisory, setWeatherAdvisory] = useState(null);
  const [isCheckingWeather, setIsCheckingWeather] = useState(false);

  // Helper to auto calculate return date based on start date & duration
  const updateDatesFromDuration = (startDate, option, customVal) => {
    if (!startDate) return;
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return;

    let days = parseInt(customVal) || 3;
    if (option === '1_day') days = 1;
    else if (option === '2-3_days') days = 3;
    else if (option === '4-6_days') days = 5;
    else if (option === '7+_days') days = 7;
    else if (option === 'custom') days = Math.max(1, parseInt(customVal) || 1);

    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');
    setReturnDate(`${yyyy}-${mm}-${dd}`);
  };

  // ─── Auto-load existing trip draft if passed via URL param ──────────
  useEffect(() => {
    if (!tripIdParam) return;
    const loadTripFromParam = async () => {
      try {
        toast.loading('Loading copied itinerary...', { id: 'load-trip-param' });
        const tripData = await tripsService.getTrip(tripIdParam);
        if (tripData) {
          const tripObj = tripData.trip || tripData;
          setGeneratedTripId(tripData.id || tripObj.id);
          setGeneratedPlan(tripData);
          setStage('RESULT');

          const dest = tripObj.destination || '';
          const orig = tripObj.origin || 'Islamabad';
          const trav = Number(tripObj.travelers) || 2;
          const bTotal = Number(tripObj.budget_total) || 15000;
          const sDate = tripObj.start_date || '';
          const eDate = tripObj.end_date || '';
          const isNoStay = tripObj.accommodation_preference === 'none';

          setOrigin(orig);
          setDestination(dest);
          setTravelers(trav);
          setDepartureDate(sDate);
          setReturnDate(eDate);
          setBudgetAmount(String(bTotal));
          setEditableTitle(tripObj.title || `${dest}, at your pace`);
          setEditableBudget(bTotal);
          setNeedHotelStay(!isNoStay);
          if (tripObj.accommodation_preference) {
            setAccommodation(tripObj.accommodation_preference);
          }

          setEditOverviewForm({
            origin: orig,
            destination: dest,
            travelers: trav,
            start_date: sDate,
            end_date: eDate,
            budget_total: bTotal,
          });

          const bd = tripData.budget_breakdown || {};
          const bTrans = bd.transport !== undefined ? Number(bd.transport) : Math.round(bTotal * (isNoStay ? 0.40 : 0.28));
          const bAccom = bd.accommodation !== undefined ? Number(bd.accommodation) : Math.round(bTotal * (isNoStay ? 0.0 : 0.35));
          const bFood = bd.food !== undefined ? Number(bd.food) : Math.round(bTotal * (isNoStay ? 0.30 : 0.20));
          const bActs = bd.activities !== undefined ? Number(bd.activities) : Math.round(bTotal * (isNoStay ? 0.20 : 0.10));
          const bOther = bd.other !== undefined ? Number(bd.other) : Math.max(0, bTotal - (bTrans + bAccom + bFood + bActs));

          setEditBreakdownForm({
            transport: bTrans,
            accommodation: bAccom,
            food: bFood,
            activities: bActs,
            other: bOther,
          });

          toast.success('Itinerary loaded for editing!', { id: 'load-trip-param' });
        }
      } catch (err) {
        console.error('Failed to load trip from url param:', err);
        toast.error('Could not load specified itinerary.', { id: 'load-trip-param' });
      }
    };
    loadTripFromParam();
  }, [tripIdParam]);

  // ─── Real-time Pakistan Geo-Detection & Spelling Auto-Correction ─────
  useEffect(() => {
    if (!destination || destination.trim().length < 2) {
      setGeoValidation({ isValid: true, wasCorrected: false, correctedName: '', error: '', checking: false, region: '', suggestions: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setGeoValidation((prev) => ({ ...prev, checking: true }));
        const res = await tripsService.validateDestination(destination.trim());
        if (res) {
          if (res.is_valid_pakistan) {
            setGeoValidation({
              isValid: true,
              wasCorrected: Boolean(res.was_corrected),
              correctedName: res.corrected_destination,
              error: '',
              checking: false,
              region: res.region,
              suggestions: [],
            });
            // If it was a typo, auto-update the destination state
            if (res.was_corrected && res.corrected_destination && res.corrected_destination.toLowerCase() !== destination.trim().toLowerCase()) {
              setDestination(res.corrected_destination);
              toast.success(`✨ Auto-corrected to ${res.corrected_destination} (${res.region || 'Pakistan'})`, { id: 'geo-autocorrect' });
            }
          } else {
            setGeoValidation({
              isValid: false,
              wasCorrected: false,
              correctedName: '',
              error: res.error || `Friday exclusively curates expeditions within Pakistan. '${destination}' is outside Pakistan.`,
              suggestions: res.suggestions || ['Hunza', 'Skardu', 'Swat', 'Naran', 'Islamabad', 'Lahore'],
              checking: false,
              region: '',
            });
          }
        }
      } catch (err) {
        console.error('Geo validation error:', err);
        setGeoValidation((prev) => ({ ...prev, checking: false }));
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [destination]);

  // ─── Day-by-Day Structured Itinerary Customizer (Step 7) ───────────────
  const [daysSchedule, setDaysSchedule] = useState(() => createCleanTravelerDaysSchedule(3));
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);

  const getTravelerDaysCount = () => {
    if (departureDate && returnDate) {
      const diff = Math.ceil((new Date(returnDate) - new Date(departureDate)) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) return diff;
    }
    if (durationOption === '1_day') return 1;
    if (durationOption === '2-3_days') return 3;
    if (durationOption === '4-6_days') return 5;
    if (durationOption === '7+_days') return 7;
    if (durationOption === 'custom') return Math.max(1, parseInt(customDays) || 3);
    return 3;
  };

  useEffect(() => {
    const totalDays = getTravelerDaysCount();
    setDaysSchedule((prev) => {
      if (prev.length === totalDays) return prev;
      if (totalDays > prev.length) {
        const added = Array.from({ length: totalDays - prev.length }, (_, i) => ({
          day_number: prev.length + i + 1,
          title: '',
          summary: '',
          activities: [
            {
              title: '',
              start_time: '08:30 AM',
              end_time: '12:30 PM',
              time: '08:30 AM - 12:30 PM',
              location: '',
              description: '',
            },
            {
              title: '',
              start_time: '02:30 PM',
              end_time: '06:30 PM',
              time: '02:30 PM - 06:30 PM',
              location: '',
              description: '',
            },
          ],
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, totalDays);
    });
  }, [departureDate, returnDate, durationOption, customDays]);

  const updateDayField = (dIdx, field, value) => {
    setDaysSchedule((prev) => {
      const next = [...prev];
      next[dIdx] = { ...next[dIdx], [field]: value };
      return next;
    });
  };

  const updateActivityField = (dIdx, aIdx, field, value) => {
    setDaysSchedule((prev) => {
      const next = [...prev];
      const targetDay = next[dIdx];
      const acts = [...(targetDay.activities || [])];
      acts[aIdx] = { ...acts[aIdx], [field]: value };
      next[dIdx] = { ...targetDay, activities: acts };
      return next;
    });
  };

  const addActivityToDay = (dayIndex) => {
    setDaysSchedule((prev) => {
      const next = [...prev];
      const targetDay = next[dayIndex];
      const acts = [...(targetDay.activities || [])];
      acts.push({
        title: '',
        start_time: '02:00 PM',
        end_time: '05:00 PM',
        time: '02:00 PM - 05:00 PM',
        location: '',
        description: '',
      });
      next[dayIndex] = { ...targetDay, activities: acts };
      return next;
    });
  };

  const removeActivityFromDay = (dayIndex, actIndex) => {
    setDaysSchedule((prev) => {
      const next = [...prev];
      const targetDay = next[dayIndex];
      const acts = (targetDay.activities || []).filter((_, idx) => idx !== actIndex);
      next[dayIndex] = { ...targetDay, activities: acts };
      return next;
    });
  };

  const addDayManually = () => {
    setDaysSchedule((prev) => {
      const nextNum = prev.length + 1;
      const newDay = {
        day_number: nextNum,
        title: '',
        summary: '',
        activities: [
          {
            title: '',
            start_time: '08:30 AM',
            end_time: '12:30 PM',
            time: '08:30 AM - 12:30 PM',
            location: '',
            description: '',
          },
          {
            title: '',
            start_time: '02:30 PM',
            end_time: '06:30 PM',
            time: '02:30 PM - 06:30 PM',
            location: '',
            description: '',
          },
        ],
      };
      return [...prev, newDay];
    });
    toast.success('New day added to itinerary!');
  };

  const removeDay = (dayIndex) => {
    setDaysSchedule((prev) => {
      const filtered = prev.filter((_, idx) => idx !== dayIndex);
      return filtered.map((d, i) => ({
        ...d,
        day_number: i + 1,
      }));
    });
  };

  const handleAutoGenerateItinerary = async () => {
    if (!destination.trim()) {
      toast.error('Please specify your destination first.');
      return;
    }
    setIsGeneratingItinerary(true);
    try {
      const res = await packagesService.generateItinerary({
        destination: destination.trim(),
        duration_days: daysSchedule.length || getTravelerDaysCount(),
        trip_style: selectedStyles?.join(', ') || 'Scenic Exploration',
        accommodation_type: accommodation || 'Hotel',
      });
      const rawDays = (res && (res.days || res.days_schedule)) || [];
      if (Array.isArray(rawDays) && rawDays.length > 0) {
        setDaysSchedule(rawDays);
        toast.success(`AI Day-by-Day schedule generated for ${destination}!`);
      } else {
        toast.error('Could not generate schedule. Please try again.');
      }
    } catch (err) {
      console.error('Itinerary generation error:', err);
      toast.error('AI generation unavailable right now.');
    } finally {
      setIsGeneratingItinerary(false);
    }
  };

  const validateTravelerStep = (stepNumber) => {
    if (stepNumber === 1) {
      if (!origin.trim()) {
        toast.error('Starting / Departure city is required before moving to next step.');
        return false;
      }
      if (!destination.trim()) {
        toast.error('Destination is required before moving to next step.');
        return false;
      }
    } else if (stepNumber === 2) {
      if (!travelers || Number(travelers) < 1) {
        toast.error('Please select at least 1 traveler.');
        return false;
      }
      if (!leadContact.name?.trim()) {
        toast.error('Lead traveler full name is required.');
        return false;
      }
      if (!leadContact.email?.trim()) {
        toast.error('Lead traveler email address is required.');
        return false;
      }
      if (!leadContact.phone?.trim()) {
        toast.error('Lead traveler phone / WhatsApp number is required.');
        return false;
      }
      if (travelers > 1) {
        for (let i = 0; i < companions.length; i++) {
          const c = companions[i];
          if (!c.name?.trim()) {
            toast.error(`Please enter full name for Companion #${i + 2}.`);
            return false;
          }
          if (!c.email?.trim()) {
            toast.error(`Please enter email for Companion #${i + 2}.`);
            return false;
          }
          if (!c.phone?.trim()) {
            toast.error(`Please enter phone / WhatsApp number for Companion #${i + 2}.`);
            return false;
          }
        }
      }
    } else if (stepNumber === 3) {
      if (!departureDate) {
        toast.error('Departure date is required before proceeding.');
        return false;
      }
      if (durationOption === 'custom' && (!customDays || Number(customDays) < 1)) {
        toast.error('Please enter a valid number of days.');
        return false;
      }
    } else if (stepNumber === 4) {
      if (!budgetAmount || Number(budgetAmount) <= 0) {
        toast.error('Please specify a valid budget amount in PKR.');
        return false;
      }
      if (!accommodation) {
        toast.error('Please select your preferred stay / accommodation.');
        return false;
      }
    }
    return true;
  };

  const handleStepClick = (targetStep) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    for (let s = currentStep; s < targetStep; s++) {
      if (!validateTravelerStep(s)) {
        return;
      }
    }
    setCurrentStep(targetStep);
  };

  const [slotOptions, setSlotOptions] = useState(null);
  const [slotSelections, setSlotSelections] = useState({
    morning: 'option_d',
    afternoon: 'option_d',
    evening: 'option_d',
  });

  // Fetch Weather Advisory when Destination or Departure Date changes
  useEffect(() => {
    if (destination.trim() && departureDate) {
      let daysCount = parseInt(customDays) || 3;
      if (departureDate && returnDate) {
        const diff = Math.ceil((new Date(returnDate) - new Date(departureDate)) / (1000 * 60 * 60 * 24)) + 1;
        if (diff > 0) daysCount = diff;
      } else if (durationOption === '1_day') {
        daysCount = 1;
      } else if (durationOption === '2-3_days') {
        daysCount = 3;
      } else if (durationOption === '4-6_days') {
        daysCount = 5;
      } else if (durationOption === '7+_days') {
        daysCount = 7;
      }

      setIsCheckingWeather(true);
      tripsService
        .checkWeather(destination.trim(), departureDate, daysCount)
        .then((res) => setWeatherAdvisory(res))
        .catch(() => setWeatherAdvisory(null))
        .finally(() => setIsCheckingWeather(false));
    } else {
      setWeatherAdvisory(null);
    }
  }, [destination, departureDate, customDays, returnDate, durationOption]);

  // Fetch 4 Slot Options when destination changes
  useEffect(() => {
    if (destination.trim()) {
      tripsService
        .getSlotOptions(destination.trim())
        .then((res) => setSlotOptions(res))
        .catch(() => setSlotOptions(null));
    }
  }, [destination]);

  // Auto-adjust accommodation selection based on realistic Pakistan market rates
  useEffect(() => {
    const total = budgetType === 'per_person'
      ? (Number(budgetAmount) || 10000) * Number(travelers || 1)
      : (Number(budgetAmount) || 10000);

    if (total < 40000 && (accommodation === 'comfortable' || accommodation === 'premium')) {
      setAccommodation('budget');
    } else if (total < 80000 && accommodation === 'premium') {
      setAccommodation('comfortable');
    }
  }, [budgetAmount, budgetType, travelers]);

  // ─── Step 8: Compulsory Traveler Contact Details ───────────────────────
  const [leadContact, setLeadContact] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [companions, setCompanions] = useState([]);
  const [inviteCompanions, setInviteCompanions] = useState(false);

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
  const [showMembersPublicly, setShowMembersPublicly] = useState(false);
  const [allowCloning, setAllowCloning] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // ─── Editable Plan State (A-to-Z Customizer) ─────────────────────────
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editableBudget, setEditableBudget] = useState('');

  // Overview Edit Modal
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [editOverviewForm, setEditOverviewForm] = useState({
    origin: '',
    destination: '',
    travelers: 2,
    start_date: '',
    end_date: '',
    budget_total: 10000,
  });

  // Budget Breakdown Edit Modal
  const [isEditingBreakdown, setIsEditingBreakdown] = useState(false);
  const [editBreakdownForm, setEditBreakdownForm] = useState({
    transport: 3000,
    accommodation: 4000,
    food: 2000,
    activities: 1000,
    other: 1000,
  });

  // Members Roster Edit Modal
  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [editLeadContact, setEditLeadContact] = useState({ name: '', email: '', phone: '' });
  const [editCompanions, setEditCompanions] = useState([]);

  // Day & Activity CRUD
  const [editingDay, setEditingDay] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
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
    'Generating your customized private expedition workspace...',
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

  // ─── Draft Management: Restore on Mount (via ?tripId or localStorage) ──
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tripIdParam = searchParams.get('tripId');
    const isNewParam = searchParams.get('new');

    if (isNewParam) {
      localStorage.removeItem('friday_trip_draft');
      return;
    }

    if (tripIdParam) {
      tripsService
        .getTrip(tripIdParam)
        .then(async (tripData) => {
          if (tripData) {
            // Lock check: If already published, redirect to locked Trip Details view
            if (tripData.status && tripData.status !== 'DRAFT') {
              toast('This expedition is already published and locked.', { id: 'trip-locked' });
              navigate(`/trips/${tripData.id}`);
              return;
            }

            const itin = await tripsService.getItinerary(tripIdParam).catch(() => null);
            const budgetData = await tripsService.getBudget(tripIdParam).catch(() => null);
            setGeneratedTripId(tripData.id);
            setOrigin(tripData.origin || 'Islamabad');
            setDestination(tripData.destination || '');
            setTravelers(tripData.travelers || 2);
            setDepartureDate(tripData.start_date || '');
            setReturnDate(tripData.end_date || '');
            setBudgetAmount(String(tripData.budget_total || 10000));
            setGeneratedPlan({
              id: tripData.id,
              trip: tripData,
              itinerary: itin || { days: [] },
              budget_breakdown: budgetData?.category_totals || {
                transport: 3000,
                accommodation: 4000,
                food: 2000,
                activities: 1000,
                other: 1000,
                total: tripData.budget_total || 10000,
              },
              advisories: tripData.advisories || [],
            });
            setEditableTitle(tripData.title || `${tripData.destination}, at your pace`);
            setEditableBudget(tripData.budget_total || 10000);
            setIsPublic(Boolean(tripData.is_public));
            setStage('RESULT');
            toast('Trip loaded from Drafts. You can edit and publish anytime!', { id: 'draft-resumed' });
          }
        })
        .catch((err) => {
          console.error('Failed to load draft trip:', err);
        });
    } else {
      try {
        const savedDraftStr = localStorage.getItem('friday_trip_draft');
        if (savedDraftStr) {
          const draft = JSON.parse(savedDraftStr);
          if (draft && draft.destination) {
            if (draft.origin) setOrigin(draft.origin);
            if (draft.destination) setDestination(draft.destination);
            if (draft.travelers) setTravelers(draft.travelers);
            if (draft.durationOption) setDurationOption(draft.durationOption);
            if (draft.customDays) setCustomDays(draft.customDays);
            if (draft.departureDate) setDepartureDate(draft.departureDate);
            if (draft.returnDate) setReturnDate(draft.returnDate);
            if (draft.budgetAmount) setBudgetAmount(draft.budgetAmount);
            if (draft.budgetType) setBudgetType(draft.budgetType);
            if (draft.budgetFlexibility) setBudgetFlexibility(draft.budgetFlexibility);
            if (draft.accommodation) setAccommodation(draft.accommodation);
            if (draft.selectedStyles) setSelectedStyles(draft.selectedStyles);
            if (draft.additionalNotes) setAdditionalNotes(draft.additionalNotes);
            if (draft.slotSelections) setSlotSelections(draft.slotSelections);
            if (draft.leadContact) setLeadContact(draft.leadContact);
            if (draft.companions) setCompanions(draft.companions);
            if (draft.currentStep) setCurrentStep(draft.currentStep);
            if (draft.stage) setStage(draft.stage);
            if (draft.generatedTripId) setGeneratedTripId(draft.generatedTripId);
            if (draft.generatedPlan) setGeneratedPlan(draft.generatedPlan);

            toast('Trip saved to Draft. Resumed where you left off!', { id: 'draft-resumed' });
          }
        }
      } catch (err) {
        console.error('Error restoring draft:', err);
      }
    }
  }, []);

  // ─── Draft Management: Auto-Save State to localStorage ─────────────────
  useEffect(() => {
    if (stage === 'RESULT' && isPublished) {
      localStorage.removeItem('friday_trip_draft');
      return;
    }

    if (destination.trim() || currentStep > 1 || stage === 'RESULT') {
      const draftState = {
        origin,
        destination,
        travelers,
        durationOption,
        customDays,
        departureDate,
        returnDate,
        budgetAmount,
        budgetType,
        budgetFlexibility,
        accommodation,
        selectedStyles,
        additionalNotes,
        slotSelections,
        leadContact,
        companions,
        currentStep,
        stage,
        generatedTripId,
        generatedPlan,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('friday_trip_draft', JSON.stringify(draftState));
    }
  }, [
    origin,
    destination,
    travelers,
    durationOption,
    customDays,
    departureDate,
    returnDate,
    budgetAmount,
    budgetType,
    budgetFlexibility,
    accommodation,
    selectedStyles,
    additionalNotes,
    slotSelections,
    leadContact,
    companions,
    currentStep,
    stage,
    generatedTripId,
    generatedPlan,
    isPublished,
  ]);

  const originSuggestions = [
    'Islamabad',
    'Lahore',
    'Karachi',
    'Rawalpindi',
    'Peshawar',
    'Faisalabad',
    'Multan',
  ];

  const famousTourismCities = [
    'Lahore',
    'Islamabad & Rawalpindi',
    'Peshawar',
    'Murree & Nathia Gali',
    'Skardu City',
    'Gilgit City',
    'Karachi',
    'Gwadar',
    'Bahawalpur & Cholistan',
    'Multan',
    'Abbottabad & Khanpur Dam',
    'Muzaffarabad',
    'Quetta & Ziarat',
  ];

  const popularValleys = [
    'Hunza Valley',
    'Skardu & Deosai',
    'Swat & Kalam',
    'Naran & Kaghan',
    'Fairy Meadows',
    'Kumrat & Jahaz Banda',
    'Chitral & Kalash',
    'Attabad Lake',
    'Neelum Valley',
    'Passu Cones',
    'Basho Valley',
    'Shogran & Siri Paye',
    'Pine Valley',
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

  // ─── Curated Diverse Pakistan Tourism Pool for Friday AI Recommendations ──
  const allPakistanDestinationsPool = [
    {
      title: 'Hunza Valley',
      subtitle: 'Altit Fort, Attabad Lake & Passu Cones',
      category: 'Alpine Glory',
      tag: 'Glaciers & Forts',
    },
    {
      title: 'Skardu & Deosai Plains',
      subtitle: 'Cold Desert, Shangrila & Upper Kachura Lake',
      category: 'High Altitude',
      tag: 'Wilderness & Lakes',
    },
    {
      title: 'Kumrat & Jahaz Banda',
      subtitle: 'Katora Glacial Lake & Majestic Pine Canopies',
      category: 'Forest Paradise',
      tag: 'Alpine Meadows',
    },
    {
      title: 'Fairy Meadows & Nanga Parbat',
      subtitle: 'Raikot Glacier & Killer Mountain Basecamp',
      category: 'Epic Trekking',
      tag: 'Iconic Peak',
    },
    {
      title: 'Swat & Kalam Valley',
      subtitle: 'Mahodand Lake, Malam Jabba Ski Resort & Ushu',
      category: 'Switzerland of East',
      tag: 'Rivers & Peaks',
    },
    {
      title: 'Neelum Valley & Arang Kel',
      subtitle: 'Ratti Gali Lake, Sharda Peeth & River Keran',
      category: 'Kashmir Emerald',
      tag: 'Lush Valleys',
    },
    {
      title: 'Naran & Kaghan Valley',
      subtitle: 'Saif-ul-Malook, Babusar Pass & Lulusar Lake',
      category: 'Mountain Pass',
      tag: 'Legends & Lakes',
    },
    {
      title: 'Chitral & Kalash Valley',
      subtitle: 'Shandur Polo, Tirich Mir & Indigenous Culture',
      category: 'Living Heritage',
      tag: 'Ancient Traditions',
    },
    {
      title: 'Gwadar & Makran Coastal Highway',
      subtitle: 'Princess of Hope, Hammerhead & Ormara Beach',
      category: 'Coastal Cliffs',
      tag: 'Arabian Sea Vistas',
    },
    {
      title: 'Shounter Pass & Astore',
      subtitle: 'Chitta Katha Lake, Rama Meadows & Glaciers',
      category: 'Offbeat Treks',
      tag: 'Untouched Beauty',
    },
    {
      title: 'Gorakh Hill Station',
      subtitle: 'Sindh High Peak, Benazir Viewpoint & Stargazing',
      category: 'Desert Elevation',
      tag: 'Celestial Skies',
    },
    {
      title: 'Bahawalpur & Cholistan Desert',
      subtitle: 'Derawar Fort, Noor Mahal & Royal Heritage',
      category: 'Palaces & Dunes',
      tag: 'Royal History',
    },
    {
      title: 'Lahore Cultural Corridor',
      subtitle: 'Badshahi Mosque, Lahore Fort & Food Street',
      category: 'Mughal Splendor',
      tag: 'Gastronomy & Art',
    },
    {
      title: 'Islamabad & Margalla Hills',
      subtitle: 'Faisal Mosque, Daman-e-Koh & Monal Ridge',
      category: 'Capital Panorama',
      tag: 'Trails & Architecture',
    },
    {
      title: 'Ziarat & Quetta Valley',
      subtitle: 'Ancient Juniper Forests & Quaid Residency',
      category: 'Juniper Highlands',
      tag: 'Historical Serenity',
    },
    {
      title: 'Basho Valley & Katpana',
      subtitle: 'Hidden Pine Valleys & Cold Desert Sand Dunes',
      category: 'Baltistan Secret',
      tag: 'Pine & Sand',
    },
  ];

  const [recommendedDestinations, setRecommendedDestinations] = useState([]);
  const [isFridayRecommending, setIsFridayRecommending] = useState(false);

  const handleLetFridayRecommend = () => {
    // Pick 4 unique random destinations from the pool
    const shuffled = [...allPakistanDestinationsPool].sort(() => 0.5 - Math.random());
    const picked4 = shuffled.slice(0, 4);
    setRecommendedDestinations(picked4);
    setIsFridayRecommending(true);
    toast.success('Friday AI selected 4 top tourism destinations across Pakistan!');
  };

  const toggleStyle = (style) => {
    if (selectedStyles.includes(style)) {
      if (selectedStyles.length > 1) {
        setSelectedStyles(selectedStyles.filter((s) => s !== style));
      }
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleOptimizeBudgetAndStay = () => {
    let daysCount = 3;
    if (durationOption === '1_day') daysCount = 1;
    else if (durationOption === '2-3_days') daysCount = 3;
    else if (durationOption === '4-6_days') daysCount = 5;
    else if (durationOption === '7+_days') daysCount = 7;
    else if (durationOption === 'custom') daysCount = Math.max(1, parseInt(customDays) || 3);
    else if (departureDate && returnDate) {
      const diff = Math.ceil((new Date(returnDate) - new Date(departureDate)) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) daysCount = diff;
    }

    const recPerPerson = Math.max(12000, daysCount * 4500);
    setBudgetType('per_person');
    setBudgetAmount(String(recPerPerson));
    setBudgetFlexibility('some_flexibility');
    setAccommodation('comfortable');
    toast.success(`Friday optimized budget (PKR ${recPerPerson.toLocaleString()}/person) and comfortable stay for ${daysCount} days!`);
  };

  // ─── Submission Handler with Contact Validations ───────────────────────
  const handleGeneratePlan = async () => {
    if (!destination.trim()) {
      toast.error('Please enter a destination.');
      setCurrentStep(1);
      return;
    }

    if (!geoValidation.isValid) {
      toast.error(geoValidation.error || `Friday exclusively curates expeditions within Pakistan. '${destination}' is outside Pakistan.`);
      setCurrentStep(1);
      return;
    }

    if (!origin.trim()) {
      toast.error('Please enter your starting/departure city.');
      setCurrentStep(1);
      return;
    }

    // Validate Lead Contact Phone & Email
    if (!leadContact.name.trim() || !leadContact.email.trim() || !leadContact.phone.trim()) {
      toast.error('Your complete contact details (Name, Email, WhatsApp) are required.');
      setCurrentStep(2);
      return;
    }

    // Validate Companions (Only if user opted into inviting co-travelers)
    if (travelers > 1 && inviteCompanions) {
      for (let i = 0; i < companions.length; i++) {
        const c = companions[i];
        if (!c.name.trim() || !c.phone.trim() || !c.email.trim()) {
          toast.error(`Please provide complete details (Name, Email, WhatsApp) for Companion #${i + 2}, or click "Skip Co-Travelers".`);
          return;
        }
      }
    }

    if (!departureDate) {
      toast.error('Departure date is required.');
      return;
    }

    const finalBudget = budgetMode === 'friday_decide' ? autoCalcBudget() : (Number(budgetAmount) || 10000);

    if (budgetMode === 'custom' && (!budgetAmount || Number(budgetAmount) <= 0)) {
      toast.error('Please enter a valid budget.');
      return;
    }

    setStage('GENERATING');
    setLoadingStageIdx(0);

    let daysCount = 3;
    if (durationOption === '1_day') daysCount = 1;
    else if (durationOption === '2-3_days') daysCount = 3;
    else if (durationOption === '4-6_days') daysCount = 5;
    else if (durationOption === '7+_days') daysCount = 7;
    else if (durationOption === 'custom') daysCount = Math.max(1, parseInt(customDays) || 8);
    else if (departureDate && returnDate) {
      const diff = Math.ceil((new Date(returnDate) - new Date(departureDate)) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) daysCount = diff;
    }

    const payload = {
      destination_query: destination.trim(),
      origin: origin.trim() || 'Islamabad',
      travelers: Number(travelers),
      duration: durationOption === 'custom' ? `${customDays}_days` : durationOption,
      duration_days: daysCount,
      departure_date: departureDate || null,
      return_date: returnDate || null,
      budget: finalBudget,
      budget_type: budgetType,
      budget_flexibility: budgetFlexibility,
      accommodation_preference: needHotelStay ? accommodation : 'none',
      travel_styles: selectedStyles,
      additional_preferences: additionalNotes.trim() || null,
      slot_preferences: slotSelections,
      days_schedule: daysSchedule,
      lead_contact: leadContact,
      companions: (travelers > 1 && inviteCompanions) ? companions : [],
      show_members_publicly: showMembersPublicly,
      allow_cloning: allowCloning,
    };

    try {
      const response = await tripsService.guidedPlan(payload);
      setGeneratedTripId(response.id);
      setGeneratedPlan(response);
      const bTotal = Number(response.trip?.budget_total || response.budget_breakdown?.total || budgetAmount || 10000);
      const bTrans = response.budget_breakdown?.transport !== undefined ? Number(response.budget_breakdown.transport) : Math.round(bTotal * 0.28);
      const bAccom = response.budget_breakdown?.accommodation !== undefined ? Number(response.budget_breakdown.accommodation) : Math.round(bTotal * 0.35);
      const bFood = response.budget_breakdown?.food !== undefined ? Number(response.budget_breakdown.food) : Math.round(bTotal * 0.20);
      const bActs = response.budget_breakdown?.activities !== undefined ? Number(response.budget_breakdown.activities) : Math.round(bTotal * 0.10);
      const bOther = response.budget_breakdown?.other !== undefined ? Number(response.budget_breakdown.other) : Math.max(0, bTotal - (bTrans + bAccom + bFood + bActs));

      setEditableTitle(response.trip?.title || `${destination.trim()}, at your pace`);
      setEditableBudget(bTotal);
      setEditOverviewForm({
        origin: response.trip?.origin || origin.trim() || 'Islamabad',
        destination: response.trip?.destination || destination.trim(),
        travelers: response.trip?.travelers || Number(travelers) || 2,
        start_date: response.trip?.start_date || departureDate || '',
        end_date: response.trip?.end_date || returnDate || '',
        budget_total: bTotal,
      });
      setEditBreakdownForm({
        transport: bTrans,
        accommodation: bAccom,
        food: bFood,
        activities: bActs,
        other: bOther,
      });
      setEditLeadContact(leadContact);
      setEditCompanions(companions);
      setIsPublic(Boolean(response.trip?.is_public));
      setShowMembersPublicly(Boolean(response.trip?.show_members_publicly));
      setAllowCloning(response.trip?.allow_cloning !== undefined ? Boolean(response.trip.allow_cloning) : true);
      setStage('RESULT');
      toast.success('Your bespoke Friday itinerary has been generated!');
    } catch (err) {
      console.error('Error generating guided plan:', err);
      toast.error('Friday could not complete planning. Please try again.');
      setStage('QUESTIONS');
    }
  };

  // ─── Publish Trip Handler (Public vs Private & Dispatches) ────────────
  const handlePublishTrip = async () => {
    if (!generatedTripId) return;
    setIsPublishing(true);
    try {
      const res = await tripsService.publishTrip(generatedTripId, {
        is_public: isPublic,
        show_members_publicly: showMembersPublicly,
        allow_cloning: allowCloning,
      });
      setIsPublished(true);
      localStorage.removeItem('friday_trip_draft');
      toast.success(res.message || 'Expedition published! Plan is locked and dispatches sent.', { id: 'publish-toast' });
      // Redirect to the locked Trip Details page
      navigate(`/trips/${generatedTripId}`);
    } catch (err) {
      console.error('Error publishing trip:', err);
      toast.error('Failed to publish expedition.');
    } finally {
      setIsPublishing(false);
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
      toast.loading('Synchronizing itinerary & day-by-day activity costs...', { id: 'budget-replan' });
      await tripsService.updateTrip(generatedTripId, {
        budget_total: val,
        budget_per_person: Math.round(val / Math.max(1, travelers)),
      });
      // Load freshly reconciled trip & day costs
      const freshTrip = await tripsService.getTrip(generatedTripId);
      if (freshTrip) {
        setGeneratedPlan(freshTrip);
        if (freshTrip.itinerary?.days && freshTrip.itinerary.days.length > 0) {
          setDaysSchedule(freshTrip.itinerary.days);
        }
      }
      setIsEditingBudget(false);
      toast.success(`✨ Budget updated to PKR ${val.toLocaleString()} & day-by-day schedule recalculated!`, { id: 'budget-replan' });
    } catch {
      toast.error('Failed to update budget.', { id: 'budget-replan' });
    }
  };

  // ─── Save Overview (Origin, Destination, Dates, Group Size, Budget) ────
  const handleSaveOverview = async (e) => {
    e?.preventDefault();
    if (!generatedTripId) return;
    try {
      const valBudget = Number(editOverviewForm.budget_total) || 10000;
      const valTravelers = Number(editOverviewForm.travelers) || 2;
      toast.loading('Synchronizing trip overview & budget allocations...', { id: 'save-overview' });
      await tripsService.updateTrip(generatedTripId, {
        origin: editOverviewForm.origin.trim(),
        destination: editOverviewForm.destination.trim(),
        travelers: valTravelers,
        budget_total: valBudget,
        budget_per_person: Math.round(valBudget / Math.max(1, valTravelers)),
        start_date: editOverviewForm.start_date || null,
        end_date: editOverviewForm.end_date || null,
      });
      const freshTrip = await tripsService.getTrip(generatedTripId);
      if (freshTrip) {
        setGeneratedPlan(freshTrip);
        if (freshTrip.itinerary?.days && freshTrip.itinerary.days.length > 0) {
          setDaysSchedule(freshTrip.itinerary.days);
        }
      }
      setOrigin(editOverviewForm.origin.trim());
      setDestination(editOverviewForm.destination.trim());
      setIsEditingOverview(false);
      toast.success('Trip overview & day costs synchronized.', { id: 'save-overview' });
    } catch {
      toast.error('Failed to update trip overview.', { id: 'save-overview' });
    }
  };

  // ─── Save Budget Allocation Breakdown ──────────────────────────────────
  const handleSaveBreakdown = async (e) => {
    e?.preventDefault();
    if (!generatedTripId) return;
    const transport = Number(editBreakdownForm.transport) || 0;
    const accommodation = Number(editBreakdownForm.accommodation) || 0;
    const food = Number(editBreakdownForm.food) || 0;
    const activities = Number(editBreakdownForm.activities) || 0;
    const other = Number(editBreakdownForm.other) || 0;
    const newTotal = transport + accommodation + food + activities + other;

    try {
      if (newTotal > 0 && newTotal !== Number(generatedPlan.trip?.budget_total)) {
        await tripsService.updateTrip(generatedTripId, {
          budget_total: newTotal,
          budget_per_person: Math.round(newTotal / Math.max(1, travelers)),
        });
      }
      setGeneratedPlan((prev) => ({
        ...prev,
        trip: {
          ...prev.trip,
          budget_total: newTotal > 0 ? newTotal : prev.trip?.budget_total,
        },
        budget_breakdown: {
          transport,
          accommodation,
          food,
          activities,
          other,
          total: newTotal,
        },
      }));
      setIsEditingBreakdown(false);
      toast.success('Budget allocation breakdown updated.');
    } catch {
      toast.error('Failed to update budget breakdown.');
    }
  };

  // ─── AI Budget Optimization & Plan Re-generation Handler ─────────────
  const handleOptimizeAndReplan = async (customParams = {}) => {
    setIsRefining(true);
    try {
      const originVal = (customParams.origin || editOverviewForm.origin || origin || 'Islamabad').trim();
      const destVal = (customParams.destination || editOverviewForm.destination || destination || 'Islamabad').trim();
      const travVal = Number(customParams.travelers || editOverviewForm.travelers || travelers) || 2;
      const budgetVal = Number(customParams.budget_total || editOverviewForm.budget_total || budgetAmount) || 15000;
      const startVal = customParams.start_date || editOverviewForm.start_date || departureDate || null;
      const endVal = customParams.end_date || editOverviewForm.end_date || returnDate || null;

      let daysCount = 3;
      if (startVal && endVal) {
        const diff = Math.ceil((new Date(endVal) - new Date(startVal)) / (1000 * 60 * 60 * 24)) + 1;
        if (diff > 0) daysCount = diff;
      } else if (customParams.duration_days) {
        daysCount = customParams.duration_days;
      } else {
        daysCount = getTravelerDaysCount() || 3;
      }

      const payload = {
        destination_query: destVal,
        origin: originVal,
        travelers: travVal,
        duration: `${daysCount}_days`,
        duration_days: daysCount,
        departure_date: startVal,
        return_date: endVal,
        budget: budgetVal,
        budget_type: 'total_trip',
        accommodation_preference: (needHotelStay && accommodation !== 'none') ? accommodation : 'none',
        travel_styles: selectedStyles,
        lead_contact: leadContact,
        companions: companions,
      };

      const response = await tripsService.guidedPlan(payload);
      if (response) {
        setGeneratedTripId(response.id);
        setGeneratedPlan(response);
        const isNoStay = accommodation === 'none' || !needHotelStay;
        const bTotal = Number(response.trip?.budget_total || response.budget_breakdown?.total || budgetVal);
        const bTrans = response.budget_breakdown?.transport !== undefined ? Number(response.budget_breakdown.transport) : Math.round(bTotal * (isNoStay ? 0.40 : 0.28));
        const bAccom = response.budget_breakdown?.accommodation !== undefined ? Number(response.budget_breakdown.accommodation) : Math.round(bTotal * (isNoStay ? 0.0 : 0.35));
        const bFood = response.budget_breakdown?.food !== undefined ? Number(response.budget_breakdown.food) : Math.round(bTotal * (isNoStay ? 0.30 : 0.20));
        const bActs = response.budget_breakdown?.activities !== undefined ? Number(response.budget_breakdown.activities) : Math.round(bTotal * (isNoStay ? 0.20 : 0.10));
        const bOther = response.budget_breakdown?.other !== undefined ? Number(response.budget_breakdown.other) : Math.max(0, bTotal - (bTrans + bAccom + bFood + bActs));

        setEditableTitle(response.trip?.title || `${destVal}, at your pace`);
        setEditableBudget(bTotal);
        setOrigin(originVal);
        setDestination(destVal);
        setTravelers(travVal);
        setDepartureDate(startVal || '');
        setReturnDate(endVal || '');
        setBudgetAmount(String(bTotal));

        setEditOverviewForm({
          origin: originVal,
          destination: destVal,
          travelers: travVal,
          start_date: startVal || '',
          end_date: endVal || '',
          budget_total: bTotal,
        });
        setEditBreakdownForm({
          transport: bTrans,
          accommodation: bAccom,
          food: bFood,
          activities: bActs,
          other: bOther,
        });
        setIsEditingOverview(false);
        setIsEditingBreakdown(false);
        toast.success('Itinerary & budget breakdown successfully re-optimized and regenerated!');
      }
    } catch (err) {
      console.error('Re-optimization error:', err);
      toast.error('Could not regenerate plan. Please check inputs.');
    } finally {
      setIsRefining(false);
    }
  };

  // ─── Save Members / Contacts Roster ────────────────────────────────────
  const handleSaveMembers = async (e) => {
    e?.preventDefault();
    if (!generatedTripId) return;
    try {
      const prefs = generatedPlan.trip?.preferences || {};
      const updatedPrefs = {
        ...prefs,
        lead_contact: editLeadContact,
        companions: editCompanions,
      };
      await tripsService.updateTrip(generatedTripId, {
        preferences: updatedPrefs,
      });
      setLeadContact(editLeadContact);
      setCompanions(editCompanions);
      setGeneratedPlan((prev) => ({
        ...prev,
        trip: {
          ...prev.trip,
          preferences: updatedPrefs,
        },
      }));
      setIsEditingMembers(false);
      toast.success('Expedition members roster updated.');
    } catch {
      toast.error('Failed to update members roster.');
    }
  };

  // ─── Save Day Title / Summary ──────────────────────────────────────────
  const handleSaveDay = async () => {
    if (!editingDay || !generatedTripId) return;
    try {
      await tripsService.updateDay(generatedTripId, editingDay.id, {
        title: editingDay.title,
        summary: editingDay.summary,
      });
      setGeneratedPlan((prev) => {
        if (!prev || !prev.itinerary) return prev;
        return {
          ...prev,
          itinerary: {
            ...prev.itinerary,
            days: (prev.itinerary.days || []).map((d) => (d.id === editingDay.id ? { ...d, title: editingDay.title, summary: editingDay.summary } : d)),
          },
        };
      });
      setEditingDay(null);
      toast.success('Day schedule updated.');
    } catch {
      toast.error('Failed to update day.');
    }
  };

  // ─── Add Day to Itinerary ──────────────────────────────────────────────
  const handleAddDay = async () => {
    if (!generatedTripId) return;
    try {
      const existingDays = generatedPlan?.itinerary?.days || [];
      const nextNum = existingDays.length + 1;
      const createdDay = await tripsService.addDay(generatedTripId, {
        title: `Day ${nextNum}: Exploration & Highlights of ${destination || 'Destination'}`,
        summary: `Custom exploration, regional sightseeing, and leisure time.`,
      });
      setGeneratedPlan((prev) => {
        if (!prev || !prev.itinerary) return prev;
        return {
          ...prev,
          trip: { ...prev.trip, duration: nextNum },
          itinerary: {
            ...prev.itinerary,
            days: [...(prev.itinerary.days || []), createdDay],
          },
        };
      });
      toast.success(`Day ${nextNum} added to your itinerary!`);
    } catch {
      toast.error('Failed to add new day.');
    }
  };

  // ─── Delete Day from Itinerary ─────────────────────────────────────────
  const handleDeleteDay = async (dayId, dayNum) => {
    if (!window.confirm(`Are you sure you want to remove Day ${dayNum} from your itinerary?`)) return;
    if (!generatedTripId) return;
    try {
      await tripsService.deleteDay(generatedTripId, dayId);
      setGeneratedPlan((prev) => {
        if (!prev || !prev.itinerary) return prev;
        const remaining = (prev.itinerary.days || []).filter((d) => d.id !== dayId);
        return {
          ...prev,
          trip: { ...prev.trip, duration: Math.max(1, remaining.length) },
          itinerary: {
            ...prev.itinerary,
            days: remaining,
          },
        };
      });
      toast.success(`Day ${dayNum} removed from itinerary.`);
    } catch {
      toast.error('Failed to delete day.');
    }
  };

  // ─── Save Activity Stop ────────────────────────────────────────────────
  const handleSaveActivity = async () => {
    if (!editingActivity || !generatedTripId) return;
    try {
      await tripsService.updateActivity(generatedTripId, editingActivity.id, {
        title: editingActivity.title,
        category: editingActivity.category,
        location: editingActivity.location,
        start_time: editingActivity.start_time,
        end_time: editingActivity.end_time,
        duration_minutes: editingActivity.duration_minutes,
        estimated_cost: editingActivity.estimated_cost,
        map_url: editingActivity.map_url,
      });
      setGeneratedPlan((prev) => {
        if (!prev || !prev.itinerary) return prev;
        return {
          ...prev,
          itinerary: {
            ...prev.itinerary,
            days: (prev.itinerary.days || []).map((d) => ({
              ...d,
              activities: (d.activities || []).map((a) => (a.id === editingActivity.id ? { ...a, ...editingActivity, notes: editingActivity.map_url } : a)),
            })),
          },
        };
      });
      setEditingActivity(null);
      toast.success('Stop details updated.');
    } catch {
      toast.error('Failed to update stop.');
    }
  };

  // ─── Add Activity Stop ─────────────────────────────────────────────────
  const handleAddActivity = async (dayId) => {
    if (!newActivityForm.title.trim() || !generatedTripId) {
      toast.error('Please enter an activity title.');
      return;
    }
    try {
      const created = await tripsService.addActivity(generatedTripId, dayId, newActivityForm);
      setGeneratedPlan((prev) => {
        if (!prev || !prev.itinerary) return prev;
        return {
          ...prev,
          itinerary: {
            ...prev.itinerary,
            days: (prev.itinerary.days || []).map((d) => (d.id === dayId ? { ...d, activities: [...(d.activities || []), created] } : d)),
          },
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
      toast.success('New stop added to your itinerary!');
    } catch {
      toast.error('Failed to add stop.');
    }
  };

  // ─── Delete Activity Stop ──────────────────────────────────────────────
  const handleDeleteActivity = async (dayId, activityId) => {
    if (!window.confirm('Are you sure you want to remove this stop from your itinerary?')) return;
    if (!generatedTripId) return;
    try {
      await tripsService.deleteActivity(generatedTripId, activityId);
      setGeneratedPlan((prev) => {
        if (!prev || !prev.itinerary) return prev;
        return {
          ...prev,
          itinerary: {
            ...prev.itinerary,
            days: (prev.itinerary.days || []).map((d) => (d.id === dayId ? { ...d, activities: (d.activities || []).filter((a) => a.id !== activityId) } : d)),
          },
        };
      });
      toast.success('Stop removed.');
    } catch {
      toast.error('Failed to remove stop.');
    }
  };

  // ─── Secondary Conversational Refinement ──────────────────────────────
  const handleRefineWithPrompt = async (customPrompt) => {
    const msg = (customPrompt || refineInput || '').trim();
    if (!msg || isRefining || !generatedTripId) return;

    setRefineInput('');
    setIsRefining(true);

    try {
      const res = await tripsService.replanTrip(generatedTripId, { message: msg });
      toast.success(res.message || 'Itinerary refined successfully!');
      const updated = await tripsService.getTrip(generatedTripId);
      const updatedItin = await tripsService.getItinerary(generatedTripId).catch(() => null);
      const updatedBudget = await tripsService.getBudget(generatedTripId).catch(() => null);
      if (updated) {
        setGeneratedPlan((prev) => ({
          ...prev,
          trip: updated,
          itinerary: updatedItin || prev.itinerary,
          budget_breakdown: updatedBudget || prev.budget_breakdown,
        }));
      }
    } catch (err) {
      console.error('Refinement error:', err);
      toast.error('Could not refine trip. Try phrasing differently.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleRefineTrip = (e) => {
    e?.preventDefault();
    handleRefineWithPrompt(refineInput);
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
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#717975] block">
              FRIDAY AI EXPEDITION ENGINE
            </span>
            <h1
              className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Generating your trip to {destination || 'your destination'}
            </h1>
            <p className="text-sm text-[#717975] italic" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Live route synthesis and intelligent travel planning from {origin || 'your city'} to {destination || 'destination'}.
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

    const destName = trip.destination || destination;
    const rawImage = trip.image_url;
    const isInvalidImage = !rawImage || rawImage.includes('instagram') || rawImage.includes('fbsbx') || rawImage.includes('panoramic_lake') || rawImage.includes('stitch_asset_6') || rawImage.startsWith('/images/stitch/');
    const heroImage = isInvalidImage ? null : rawImage;

    return (
      <div className="w-full flex-1 flex justify-center min-h-screen bg-[#F8FAF6]">
        <div className="w-full max-w-3xl px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
          {/* Top Label & Actions */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#717975] truncate">
              YOUR FRIDAY PLAN
            </span>
            <button
              onClick={() => setStage('QUESTIONS')}
              className="text-xs font-semibold text-[#00261D] hover:underline flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Adjust Preferences</span>
            </button>
          </div>

          {/* Editorial Heading & Trip Overview Hero with Real Web Photo Banner */}
          <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-black/10 shadow-xs">
            {/* Real Web Photography Banner */}
            <div className="relative h-52 sm:h-72 w-full bg-gradient-to-br from-[#001E17] via-[#00261D] to-[#011410] overflow-hidden flex items-center justify-center">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={destName}
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
                <span className="text-6xl sm:text-7xl mb-2 select-none">{getContextualEmoji(destName, trip.title)}</span>
                <span className="text-xs uppercase tracking-widest font-semibold opacity-70">
                  {destName || 'Expedition'}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white space-y-1 sm:space-y-1.5">
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/20 backdrop-blur-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#BBEAD5] inline-block">
                  Live Web Researched Route
                </span>
                <h2
                  className="text-2xl sm:text-4xl font-normal text-white leading-tight break-words"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  From {trip.origin || origin} to {trip.destination || destination}
                </h2>
              </div>
            </div>

            <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
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

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-xs sm:text-sm text-[#717975] flex items-center gap-2 flex-wrap" style={{ fontFamily: 'Inter, sans-serif' }}>
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

                    <button
                      type="button"
                      onClick={() => setIsEditingOverview(!isEditingOverview)}
                      className="px-3.5 py-1.5 rounded-full border border-black/15 hover:border-[#00261D] bg-[#F8FAF6] text-xs font-bold text-[#00261D] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap self-start sm:self-auto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isEditingOverview ? 'Close' : 'Edit Overview'}</span>
                    </button>
                  </div>
                </div>

                {/* Overview In-Place Form */}
                {isEditingOverview ? (
                  <form onSubmit={handleSaveOverview} className="p-5 rounded-2xl bg-[#F8FAF6] border border-black/10 space-y-4 animate-in fade-in duration-200">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#00261D]">Edit Expedition Overview</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Departure City (Origin)</label>
                        <input
                          type="text"
                          value={editOverviewForm.origin}
                          onChange={(e) => setEditOverviewForm((prev) => ({ ...prev, origin: e.target.value }))}
                          className="w-full p-3 bg-white border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Destination</label>
                        <input
                          type="text"
                          value={editOverviewForm.destination}
                          onChange={(e) => setEditOverviewForm((prev) => ({ ...prev, destination: e.target.value }))}
                          className="w-full p-3 bg-white border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Departure Date</label>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={editOverviewForm.start_date}
                          onChange={(e) => setEditOverviewForm((prev) => ({ ...prev, start_date: e.target.value }))}
                          className="w-full p-3 bg-white border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Return Date</label>
                        <input
                          type="date"
                          min={editOverviewForm.start_date || new Date().toISOString().split('T')[0]}
                          value={editOverviewForm.end_date}
                          onChange={(e) => setEditOverviewForm((prev) => ({ ...prev, end_date: e.target.value }))}
                          className="w-full p-3 bg-white border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Travelers Count</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editOverviewForm.travelers}
                          onChange={(e) => setEditOverviewForm((prev) => ({ ...prev, travelers: Number(e.target.value) }))}
                          className="w-full p-3 bg-white border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Total Estimated Budget (PKR)</label>
                        <input
                          type="number"
                          min="1000"
                          value={editOverviewForm.budget_total}
                          onChange={(e) => setEditOverviewForm((prev) => ({ ...prev, budget_total: Number(e.target.value) }))}
                          className="w-full p-3 bg-white border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-black/5 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingOverview(false)}
                        className="px-4 py-2 rounded-full border border-black/10 bg-white text-xs font-bold text-[#717975] hover:text-black cursor-pointer text-center whitespace-nowrap"
                      >
                        Cancel
                      </button>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-full border border-black/15 bg-white hover:bg-slate-100 text-[#00261D] text-xs font-bold cursor-pointer shadow-2xs transition-all text-center whitespace-nowrap"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOptimizeAndReplan(editOverviewForm)}
                          className="px-6 py-2.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold cursor-pointer shadow-md flex items-center justify-center gap-2 hover:scale-102 transition-all whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#BBEAD5]" />
                          <span>⚡ Regenerate Plan</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* Stat Highlights Pills */
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
                )}
              </div>
            </div>

            {/* ─── Expedition Members Roster (Before Publishing) ──────── */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975]">
                    EXPEDITION CREW & ROSTER
                  </span>
                  <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Trip Members ({1 + (companions?.length || 0)})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingMembers(!isEditingMembers)}
                  className="px-3.5 py-1.5 rounded-full border border-black/15 hover:border-[#00261D] bg-[#F8FAF6] text-xs font-bold text-[#00261D] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isEditingMembers ? 'Close' : 'Edit Contacts'}</span>
                </button>
              </div>

              {/* Members Edit Form */}
              {isEditingMembers ? (
                <form onSubmit={handleSaveMembers} className="space-y-4 p-5 rounded-2xl bg-[#F8FAF6] border border-black/10 animate-in fade-in duration-200">
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#00261D]">Lead Traveler</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Name"
                        value={editLeadContact.name}
                        onChange={(e) => setEditLeadContact((prev) => ({ ...prev, name: e.target.value }))}
                        className="p-3 bg-white border border-black/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00261D]"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={editLeadContact.email}
                        onChange={(e) => setEditLeadContact((prev) => ({ ...prev, email: e.target.value }))}
                        className="p-3 bg-white border border-black/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00261D]"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="WhatsApp / Phone"
                        value={editLeadContact.phone}
                        onChange={(e) => setEditLeadContact((prev) => ({ ...prev, phone: e.target.value }))}
                        className="p-3 bg-white border border-black/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00261D]"
                        required
                      />
                    </div>
                  </div>

                  {editCompanions.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-black/5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#00261D]">Co-Travelers ({editCompanions.length})</h5>
                      {editCompanions.map((comp, cIdx) => (
                        <div key={cIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="text"
                            placeholder={`Traveler ${cIdx + 2} Name`}
                            value={comp.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditCompanions((prev) => prev.map((item, i) => (i === cIdx ? { ...item, name: val } : item)));
                            }}
                            className="p-3 bg-white border border-black/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00261D]"
                            required
                          />
                          <input
                            type="email"
                            placeholder={`Traveler ${cIdx + 2} Email`}
                            value={comp.email}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditCompanions((prev) => prev.map((item, i) => (i === cIdx ? { ...item, email: val } : item)));
                            }}
                            className="p-3 bg-white border border-black/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00261D]"
                            required
                          />
                          <input
                            type="tel"
                            placeholder={`Traveler ${cIdx + 2} Phone`}
                            value={comp.phone}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditCompanions((prev) => prev.map((item, i) => (i === cIdx ? { ...item, phone: val } : item)));
                            }}
                            className="p-3 bg-white border border-black/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00261D]"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingMembers(false)}
                      className="px-4 py-2 rounded-full border border-black/10 bg-white text-xs font-bold text-[#717975] hover:text-black cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold cursor-pointer shadow-2xs"
                    >
                      Save Contacts
                    </button>
                  </div>
                </form>
              ) : (
                /* Members Cards Display */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Lead Traveler Card */}
                  <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 flex items-start gap-3.5">
                    {backendUser?.picture ? (
                      <img
                        src={backendUser.picture}
                        alt={leadContact.name || 'Lead Traveler'}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border border-black/10 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#00261D] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {(leadContact.name || 'L').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[#00261D] truncate block">
                          {leadContact.name || backendUser?.name || 'Lead Traveler'}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                          <Award className="w-2.5 h-2.5 text-emerald-800" />
                          <span>Host</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-[#717975] flex items-center gap-1 mt-1 truncate">
                        <Mail className="w-3 h-3 text-[#717975] shrink-0" />
                        <span>{leadContact.email || backendUser?.email || 'No email provided'}</span>
                      </p>
                      {leadContact.phone && (
                        <p className="text-[11px] text-[#717975] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#717975] shrink-0" />
                          <span>{leadContact.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Companions Cards */}
                  {companions.map((comp, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/5 flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-[#E7E9E5] text-[#00261D] flex items-center justify-center font-bold text-sm shrink-0 border border-black/5">
                        {(comp.name || `T${idx + 2}`).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[#00261D] truncate block">
                            {comp.name || `Traveler ${idx + 2}`}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E7E9E5] text-[#414845] border border-black/5">
                            Co-Traveler
                          </span>
                        </div>
                        <p className="text-[11px] text-[#717975] flex items-center gap-1 mt-1 truncate">
                          <Mail className="w-3 h-3 text-[#717975] shrink-0" />
                          <span>{comp.email || 'No email provided'}</span>
                        </p>
                        {comp.phone && (
                          <p className="text-[11px] text-[#717975] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#717975] shrink-0" />
                            <span>{comp.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Budget Breakdown Section with Inline Editor ────────── */}
            {(() => {
              const totalEst = Number(trip.budget_total || budgetAmount || 10000);
              const isNoStay = accommodation === 'none' || !needHotelStay;
              const bTrans = budgetBreakdown.transport !== undefined ? Number(budgetBreakdown.transport) : Math.round(totalEst * (isNoStay ? 0.40 : 0.28));
              const bAccom = budgetBreakdown.accommodation !== undefined ? Number(budgetBreakdown.accommodation) : Math.round(totalEst * (isNoStay ? 0.0 : 0.35));
              const bFood = budgetBreakdown.food !== undefined ? Number(budgetBreakdown.food) : Math.round(totalEst * (isNoStay ? 0.30 : 0.20));
              const bActs = budgetBreakdown.activities !== undefined ? Number(budgetBreakdown.activities) : Math.round(totalEst * (isNoStay ? 0.20 : 0.10));
              const bOther = budgetBreakdown.other !== undefined
                ? Number(budgetBreakdown.other)
                : Math.max(0, totalEst - (bTrans + bAccom + bFood + bActs));
              const displaySum = bTrans + bAccom + bFood + bActs + bOther;

              return (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-6">
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975]">
                        ESTIMATED ALLOCATION
                      </span>
                      <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                        Budget Breakdown
                      </h3>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOptimizeAndReplan({ budget_total: totalEst })}
                          className="px-3.5 py-1.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs hover:scale-102 cursor-pointer whitespace-nowrap"
                          title="AI Budget Optimization for destination & season"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#BBEAD5]" />
                          <span>⚡ AI Optimize</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsEditingBreakdown(!isEditingBreakdown)}
                          className="px-3.5 py-1.5 rounded-full border border-black/15 hover:border-[#00261D] bg-[#F8FAF6] text-xs font-bold text-[#00261D] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{isEditingBreakdown ? 'Close' : 'Edit Budget'}</span>
                        </button>
                      </div>

                      <div className="text-left sm:text-right sm:pl-2 sm:border-l border-black/10">
                        <span className="text-[10px] text-[#717975] uppercase font-bold block">Total Estimate</span>
                        <span className="text-2xl font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                          PKR {displaySum.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isEditingBreakdown ? (
                    <form onSubmit={handleSaveBreakdown} className="space-y-4 p-5 rounded-2xl bg-[#F8FAF6] border border-black/10 animate-in fade-in duration-200">
                      {/* Overall Total Budget Editor */}
                      <div className="p-4 bg-white rounded-xl border border-black/10 space-y-2">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <label className="text-xs font-bold text-[#00261D] uppercase">
                            Overall Trip Budget (PKR)
                          </label>
                          <span className="text-[11px] text-[#717975]">
                            Adjusting overall budget auto-rebalances breakdown and regenerates activity costs
                          </span>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                          <div className="relative flex-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#717975]">PKR</span>
                            <input
                              type="number"
                              value={editOverviewForm.budget_total || displaySum}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setEditOverviewForm((prev) => ({ ...prev, budget_total: val }));
                                const isNoStay = accommodation === 'none' || !needHotelStay;
                                setEditBreakdownForm({
                                  transport: Math.round(val * (isNoStay ? 0.40 : 0.28)),
                                  accommodation: Math.round(val * (isNoStay ? 0.0 : 0.35)),
                                  food: Math.round(val * (isNoStay ? 0.30 : 0.20)),
                                  activities: Math.round(val * (isNoStay ? 0.20 : 0.10)),
                                  other: Math.round(val * (isNoStay ? 0.10 : 0.07)),
                                });
                              }}
                              className="w-full p-2.5 pl-12 bg-[#F8FAF6] border border-black/15 rounded-xl text-base font-bold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOptimizeAndReplan({ budget_total: editOverviewForm.budget_total || displaySum })}
                            disabled={isRefining}
                            className="px-4 py-2.5 bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-102 whitespace-nowrap w-full sm:w-auto"
                          >
                            {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BBEAD5]" /> : <Sparkles className="w-3.5 h-3.5 text-[#BBEAD5]" />}
                            <span>⚡ Re-Optimize</span>
                          </button>
                        </div>
                      </div>

                      {/* Individual Category Allocations */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Transport (PKR)</label>
                          <input
                            type="number"
                            value={editBreakdownForm.transport}
                            onChange={(e) => setEditBreakdownForm((prev) => ({ ...prev, transport: Number(e.target.value) }))}
                            className="w-full p-2.5 bg-white border border-black/10 rounded-xl font-bold text-[#00261D] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Accommodation</label>
                          <input
                            type="number"
                            value={editBreakdownForm.accommodation}
                            onChange={(e) => setEditBreakdownForm((prev) => ({ ...prev, accommodation: Number(e.target.value) }))}
                            className="w-full p-2.5 bg-white border border-black/10 rounded-xl font-bold text-[#00261D] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Food</label>
                          <input
                            type="number"
                            value={editBreakdownForm.food}
                            onChange={(e) => setEditBreakdownForm((prev) => ({ ...prev, food: Number(e.target.value) }))}
                            className="w-full p-2.5 bg-white border border-black/10 rounded-xl font-bold text-[#00261D] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Activities</label>
                          <input
                            type="number"
                            value={editBreakdownForm.activities}
                            onChange={(e) => setEditBreakdownForm((prev) => ({ ...prev, activities: Number(e.target.value) }))}
                            className="w-full p-2.5 bg-white border border-black/10 rounded-xl font-bold text-[#00261D] focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Contingency</label>
                          <input
                            type="number"
                            value={editBreakdownForm.other}
                            onChange={(e) => setEditBreakdownForm((prev) => ({ ...prev, other: Number(e.target.value) }))}
                            className="w-full p-2.5 bg-white border border-black/10 rounded-xl font-bold text-[#00261D] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-black/5 flex-wrap gap-2">
                        <span className="text-xs font-bold text-[#00261D]">
                          Calculated Total: PKR {(
                            (Number(editBreakdownForm.transport) || 0) +
                            (Number(editBreakdownForm.accommodation) || 0) +
                            (Number(editBreakdownForm.food) || 0) +
                            (Number(editBreakdownForm.activities) || 0) +
                            (Number(editBreakdownForm.other) || 0)
                          ).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingBreakdown(false)}
                            className="px-4 py-2 rounded-full border border-black/10 bg-white text-xs font-bold text-[#717975] hover:text-black cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold cursor-pointer shadow-2xs"
                          >
                            Save Breakdown
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                        <span className="text-[10px] text-[#717975] uppercase font-semibold block">Transport</span>
                        <span className="text-sm font-bold text-[#00261D]">
                          PKR {bTrans.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                        <span className="text-[10px] text-[#717975] uppercase font-semibold block">Accommodation</span>
                        <span className="text-sm font-bold text-[#00261D]">
                          PKR {bAccom.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                        <span className="text-[10px] text-[#717975] uppercase font-semibold block">Food</span>
                        <span className="text-sm font-bold text-[#00261D]">
                          PKR {bFood.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5">
                        <span className="text-[10px] text-[#717975] uppercase font-semibold block">Activities</span>
                        <span className="text-sm font-bold text-[#00261D]">
                          PKR {bActs.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-[#717975] uppercase font-semibold block">Contingency</span>
                        <span className="text-sm font-bold text-[#00261D]">
                          PKR {bOther.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─── Day-by-Day Itinerary with Real Photo Timelines ──────── */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975]">
                    SCHEDULE & PHOTO TIMELINE
                  </span>
                  <h3 className="text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Day-by-Day Itinerary ({itinerary.days.length} Days)
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleAddDay}
                  className="px-5 py-2.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto hover:scale-105"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Day</span>
                </button>
              </div>

              <div className="space-y-6">
                {itinerary.days.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-5"
                  >
                    <div className="border-b border-black/5 pb-3 flex items-start justify-between gap-4">
                      <div>
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

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingDay({ ...day, id: day.id || dIdx + 1 })}
                          className="p-2 rounded-full hover:bg-slate-100 text-[#717975] hover:text-[#00261D] transition-colors cursor-pointer"
                          title="Edit day title/summary"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingActivityDayId(day.id || dIdx + 1);
                            setNewActivityForm({
                              title: '',
                              category: 'SIGHTSEEING',
                              location: day.title || '',
                              start_time: '09:00 AM',
                              end_time: '11:30 AM',
                              duration_minutes: 150,
                              estimated_cost: 0,
                              map_url: '',
                            });
                          }}
                          className="px-3 py-1.5 rounded-full bg-[#F8FAF6] hover:bg-[#E7E9E5] border border-black/10 text-xs font-bold text-[#00261D] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Stop</span>
                        </button>
                        {itinerary.days.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDay(day.id || dIdx + 1, day.day_number || dIdx + 1)}
                            className="p-2 rounded-full hover:bg-red-50 text-[#717975] hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete this entire day"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Activities List with Exact Hours, Locations, and Thumbnails */}
                    <div className="space-y-3.5">
                      {(day.activities || []).map((act, aIdx) => {
                        const actThumb = act.image_url || heroImage;
                        return (
                          <div
                            key={aIdx}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl bg-[#F8FAF6] border border-black/5 gap-3.5 hover:border-black/15 transition-all group"
                          >
                            <div className="flex items-center gap-3.5 w-full sm:w-auto flex-1">
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

                              <div className="min-w-0 flex-1">
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
                                <p className="text-xs text-[#555E59] mt-0.5 leading-relaxed line-clamp-2">
                                  {act.description}
                                </p>
                                {act.location && (
                                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                                    <p className="text-[11px] text-[#717975] flex items-center gap-1 truncate max-w-xs">
                                      <MapPin className="w-3 h-3 text-[#00261D] shrink-0" />
                                      <span className="truncate">{act.location}</span>
                                    </p>
                                    {(act.notes || act.map_url) && (
                                      <a
                                        href={act.notes || act.map_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00261D] text-[#BBEAD5] hover:bg-[#00261D]/90 text-[10px] font-bold tracking-wide transition-all shadow-2xs hover:scale-105 whitespace-nowrap"
                                        title="Open location in Google Maps"
                                      >
                                        <Navigation className="w-2.5 h-2.5" />
                                        <span>View Map</span>
                                      </a>
                                    )}
                                    {act.latitude && act.longitude && (
                                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                                        ✓ Verified ({act.latitude.toFixed(2)}°, {act.longitude.toFixed(2)}°)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5">
                              {act.estimated_cost > 0 && (
                                <div className="text-left sm:text-right">
                                  <span className="text-[10px] text-[#717975] block">Estimated</span>
                                  <span className="text-xs font-bold text-[#420E00]">
                                    PKR {Number(act.estimated_cost).toLocaleString()}
                                  </span>
                                </div>
                              )}

                              {/* Edit & Delete Stop Buttons */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingActivity({ ...act, id: act.id || aIdx + 1, day_id: day.id || dIdx + 1 })}
                                  className="p-2 rounded-full hover:bg-slate-200 text-[#717975] hover:text-[#00261D] transition-colors cursor-pointer"
                                  title="Edit stop"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteActivity(day.id || dIdx + 1, act.id || aIdx + 1)}
                                  className="p-2 rounded-full hover:bg-red-50 text-[#717975] hover:text-red-600 transition-colors cursor-pointer"
                                  title="Remove stop"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Day Edit Modal ─────────────────────────────────────── */}
            {editingDay && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-black/10 space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-black/5 pb-3">
                    <h3 className="text-xl font-bold text-[#00261D]">Edit Day Schedule Details</h3>
                    <button
                      type="button"
                      onClick={() => setEditingDay(null)}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-[#717975] hover:text-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Day Title</label>
                      <input
                        type="text"
                        value={editingDay.title || ''}
                        onChange={(e) => setEditingDay((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl text-sm font-bold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#717975] uppercase block mb-1">Day Summary / Overview</label>
                      <textarea
                        rows="4"
                        value={editingDay.summary || ''}
                        onChange={(e) => setEditingDay((prev) => ({ ...prev, summary: e.target.value }))}
                        className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl text-xs text-[#191C1A] focus:outline-none focus:border-[#00261D]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                    <button
                      type="button"
                      onClick={() => setEditingDay(null)}
                      className="px-4 py-2 rounded-full border border-black/10 text-xs font-bold text-[#717975] hover:text-black cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDay}
                      className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold cursor-pointer shadow-2xs"
                    >
                      Save Day Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Activity Edit Modal ─────────────────────────────────── */}
            {editingActivity && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-black/10 space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-black/5 pb-3">
                    <h3 className="text-xl font-bold text-[#00261D]">Edit Activity Stop</h3>
                    <button
                      type="button"
                      onClick={() => setEditingActivity(null)}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-[#717975] hover:text-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Stop Title *</label>
                      <input
                        type="text"
                        value={editingActivity.title || ''}
                        onChange={(e) => setEditingActivity((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-bold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Category</label>
                        <select
                          value={editingActivity.category || 'SIGHTSEEING'}
                          onChange={(e) => setEditingActivity((prev) => ({ ...prev, category: e.target.value }))}
                          className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                        >
                          <option value="SIGHTSEEING">Sightseeing</option>
                          <option value="FOOD">Food & Dining</option>
                          <option value="TRANSPORT">Transport</option>
                          <option value="ACCOMMODATION">Accommodation</option>
                          <option value="ACTIVITY">Activity / Trek</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Estimated Cost (PKR)</label>
                        <input
                          type="number"
                          value={editingActivity.estimated_cost || 0}
                          onChange={(e) => setEditingActivity((prev) => ({ ...prev, estimated_cost: Number(e.target.value) }))}
                          className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Start Time</label>
                        <input
                          type="text"
                          placeholder="e.g. 09:00 AM"
                          value={editingActivity.start_time || ''}
                          onChange={(e) => setEditingActivity((prev) => ({ ...prev, start_time: e.target.value }))}
                          className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">End Time</label>
                        <input
                          type="text"
                          placeholder="e.g. 11:30 AM"
                          value={editingActivity.end_time || ''}
                          onChange={(e) => setEditingActivity((prev) => ({ ...prev, end_time: e.target.value }))}
                          className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Location / Landmark</label>
                      <input
                        type="text"
                        placeholder="e.g. Faisal Mosque, Islamabad"
                        value={editingActivity.location || ''}
                        onChange={(e) => setEditingActivity((prev) => ({ ...prev, location: e.target.value }))}
                        className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                    <button
                      type="button"
                      onClick={() => setEditingActivity(null)}
                      className="px-4 py-2 rounded-full border border-black/10 text-xs font-bold text-[#717975] hover:text-black cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveActivity}
                      className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold cursor-pointer shadow-2xs"
                    >
                      Save Stop
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Add Activity Modal ──────────────────────────────────── */}
            {addingActivityDayId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-black/10 space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-black/5 pb-3">
                    <h3 className="text-xl font-bold text-[#00261D]">Add New Activity Stop</h3>
                    <button
                      type="button"
                      onClick={() => setAddingActivityDayId(null)}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-[#717975] hover:text-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Stop Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Sunset Tea at Monal Viewpoint"
                        value={newActivityForm.title}
                        onChange={(e) => setNewActivityForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-bold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Category</label>
                        <select
                          value={newActivityForm.category}
                          onChange={(e) => setNewActivityForm((prev) => ({ ...prev, category: e.target.value }))}
                          className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                        >
                          <option value="SIGHTSEEING">Sightseeing</option>
                          <option value="FOOD">Food & Dining</option>
                          <option value="TRANSPORT">Transport</option>
                          <option value="ACCOMMODATION">Accommodation</option>
                          <option value="ACTIVITY">Activity / Trek</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Estimated Cost (PKR)</label>
                        <input
                          type="number"
                          value={newActivityForm.estimated_cost}
                          onChange={(e) => setNewActivityForm((prev) => ({ ...prev, estimated_cost: Number(e.target.value) }))}
                          className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Start Time</label>
                        <input
                          type="text"
                          placeholder="09:00 AM"
                          value={newActivityForm.start_time}
                          onChange={(e) => setNewActivityForm((prev) => ({ ...prev, start_time: e.target.value }))}
                          className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">End Time</label>
                        <input
                          type="text"
                          placeholder="11:30 AM"
                          value={newActivityForm.end_time}
                          onChange={(e) => setNewActivityForm((prev) => ({ ...prev, end_time: e.target.value }))}
                          className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Location / Landmark</label>
                      <input
                        type="text"
                        placeholder="e.g. Margalla Hills Trail 3"
                        value={newActivityForm.location}
                        onChange={(e) => setNewActivityForm((prev) => ({ ...prev, location: e.target.value }))}
                        className="w-full p-3 bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                    <button
                      type="button"
                      onClick={() => setAddingActivityDayId(null)}
                      className="px-4 py-2 rounded-full border border-black/10 text-xs font-bold text-[#717975] hover:text-black cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddActivity(addingActivityDayId)}
                      className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold cursor-pointer shadow-2xs whitespace-nowrap"
                    >
                      Add Stop
                    </button>
                  </div>
                </div>
              </div>
            )}

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
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00261D]">
                  <Sparkles className="w-4 h-4 text-[#00261D]" />
                  <span>Ask Friday to refine something</span>
                </div>
                {isRefining && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#00261D] animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recalculating plan...</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#717975]">
                Select a quick adjustment option below or enter your own custom tweak (e.g., <em>"Make it 5k cheaper"</em> or <em>"Add local food stops"</em>).
              </p>

              {/* Quick Refinement Options */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: '💰 Make it Cheaper (-20%)', prompt: 'Make this trip cheaper and optimize budget' },
                  { label: '📉 Cut Budget by 5,000', prompt: 'Make it 5k cheaper' },
                  { label: '💎 Upgrade to Luxury (+30%)', prompt: 'Upgrade accommodation and transport to luxury' },
                  { label: '🌿 Add Scenic Nature & Views', prompt: 'Include more scenic viewpoints and nature exploration' },
                  { label: '🍽️ Include Local Food Stops', prompt: 'Add authentic local dining and traditional cuisine stops' },
                  { label: '🥾 Add Mountain Hiking', prompt: 'Add hiking and trekking trails to the daily schedule' },
                ].map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={isRefining}
                    onClick={() => handleRefineWithPrompt(opt.prompt)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#F8FAF6] hover:bg-[#00261D] hover:text-white text-[#00261D] border border-black/10 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom Tweak Input Form */}
              <form onSubmit={handleRefineTrip} className="relative flex items-center pt-2">
                <input
                  type="text"
                  placeholder="Or type a custom adjustment for Friday..."
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  disabled={isRefining}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-full py-3.5 pl-5 pr-14 text-xs sm:text-sm text-[#191C1A] placeholder:text-[#717975] focus:outline-none focus:border-[#00261D]"
                />
                <button
                  type="submit"
                  disabled={!refineInput.trim() || isRefining}
                  className="absolute right-2 p-2 rounded-full bg-[#00261D] text-white hover:bg-[#00261D]/90 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                >
                  {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </form>
            </div>

            {/* ─── Publish & Expedition Access Choice ─────────────────── */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-black/10 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975]">
                    EXPEDITION STATUS & VISIBILITY
                  </span>
                  <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Publish & Dispatch Trip
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#F3F4F0] p-1 rounded-full text-xs font-bold border border-black/10">
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                        !isPublic ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975] hover:text-black'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private</span>
                    </button>
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPublic ? 'bg-emerald-800 text-white shadow-2xs' : 'text-[#717975] hover:text-black'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#555E59] leading-relaxed">
                {isPublic
                  ? 'Your itinerary will be published to the Friday Community Explore feed, and full itineraries with clickable Google Maps links will be dispatched via Email and WhatsApp.'
                  : 'Your itinerary will be saved privately in your Expedition Vault. Full itineraries with Google Maps links will be dispatched via Email and WhatsApp.'}
              </p>

              {isPublic && (
                <div className="bg-[#F8FAF6] rounded-3xl p-6 sm:p-7 border border-black/10 shadow-2xs space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 border-b border-black/5 pb-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#00261D]" />
                    <span className="text-xs font-bold text-[#00261D] uppercase tracking-wider">
                      Community Feed Privacy Preference *
                    </span>
                  </div>
                  <p className="text-xs text-[#717975] leading-relaxed">
                    If this expedition is shared or published to the public explore feed, decide how traveler identities should be displayed to other travelers:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowMembersPublicly(false)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        !showMembersPublicly
                          ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                          : 'bg-white text-[#414845] border-black/10 hover:border-black/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!showMembersPublicly ? 'bg-white/20 text-[#BBEAD5]' : 'bg-black/5 text-[#00261D]'}`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>Hide Traveler Names</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${!showMembersPublicly ? 'bg-[#BBEAD5] text-[#00261D]' : 'bg-black/5 text-[#717975]'}`}>Recommended</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${!showMembersPublicly ? 'text-white/80' : 'text-[#717975]'}`}>
                          Public viewers only see group count (e.g. "{travelers} Travelers"). Names, emails & phone numbers remain 100% confidential.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMembersPublicly(true)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        showMembersPublicly
                          ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                          : 'bg-white text-[#414845] border-black/10 hover:border-black/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${showMembersPublicly ? 'bg-white/20 text-[#BBEAD5]' : 'bg-black/5 text-[#00261D]'}`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold">
                          <span>Display Member Profiles</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${showMembersPublicly ? 'text-white/80' : 'text-[#717975]'}`}>
                          Public community viewers can see traveler names and profile avatars on the public community feed.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Community Copying & Customization Permission (Shown only when Public) */}
              {isPublic && (
                <div className="bg-[#F8FAF6] rounded-3xl p-6 sm:p-7 border border-black/10 shadow-2xs space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 border-b border-black/5 pb-2.5">
                    <Copy className="w-4 h-4 text-[#00261D]" />
                    <span className="text-xs font-bold text-[#00261D] uppercase tracking-wider">
                      Community Itinerary Copying & Customization *
                    </span>
                  </div>
                  <p className="text-xs text-[#717975] leading-relaxed">
                    Allow other travelers across Pakistan to clone this itinerary into their private draft and customize it for their own group?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setAllowCloning(true)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        allowCloning
                          ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                          : 'bg-white text-[#414845] border-black/10 hover:border-black/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${allowCloning ? 'bg-white/20 text-[#BBEAD5]' : 'bg-black/5 text-[#00261D]'}`}>
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>Yes, Allow Copying</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${allowCloning ? 'bg-[#BBEAD5] text-[#00261D]' : 'bg-black/5 text-[#717975]'}`}>Recommended</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${allowCloning ? 'text-white/80' : 'text-[#717975]'}`}>
                          Fellow travelers can clone this itinerary, customize their own companion details, dates, and budget.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAllowCloning(false)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        !allowCloning
                          ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                          : 'bg-white text-[#414845] border border-black/10 hover:border-black/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!allowCloning ? 'bg-white/20 text-[#BBEAD5]' : 'bg-black/5 text-[#00261D]'}`}>
                        <X className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold">
                          <span>No, Prevent Copying</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${!allowCloning ? 'text-white/80' : 'text-[#717975]'}`}>
                          Keep this itinerary view-only. Other travelers cannot copy or fork it to their workspace.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handlePublishTrip}
                  disabled={isPublishing}
                  className="w-full py-4 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:scale-101 whitespace-nowrap"
                >
                  {isPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-[#BBEAD5]" />
                  )}
                  <span>{isPublished ? 'Re-Publish Trip' : 'Publish Expedition'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
    );
  }

  // ─── RENDER: GUIDED TRIP QUESTIONS FLOW (UNIFIED SINGLE-PAGE FORM) ─────
  return (
    <div className="w-full flex-1 flex justify-between min-h-screen bg-[#F8FAF6] relative">
      <main className="flex-1 flex flex-col justify-between px-4 sm:px-8 lg:px-12 py-8 max-w-3xl mx-auto w-full space-y-10 xl:mr-80">
        {/* Form Header with Quick Jump Anchor Pills */}
        <header className="space-y-4 pb-6 border-b border-black/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowExitModal(true)}
                className="p-2 rounded-full hover:bg-slate-100 text-[#717975] hover:text-black transition-colors cursor-pointer"
                title="Exit Planning"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#717975] block">
                  AI TRIP PLANNER • SINGLE PAGE WORKSPACE
                </span>
                <h1
                  className="text-3xl sm:text-4xl font-normal text-[#00261D]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Plan Your Bespoke Journey
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileSummary(true)}
              className="flex xl:hidden items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#00261D]/20 text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Summary</span>
            </button>
          </div>

          {/* Quick Jump Bar */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { id: 'section-destination', label: '1. Destination & Route' },
              { id: 'section-dates-group', label: '2. Dates & Group' },
              { id: 'section-budget-stay', label: '3. Budget & Stay' },
            ].map((sec, idx) => (
              <a
                key={idx}
                href={`#${sec.id}`}
                className="px-3.5 py-1.5 rounded-full bg-white border border-black/10 hover:border-[#00261D] text-xs font-semibold text-[#00261D] hover:bg-[#E7F7EE] transition-all shadow-2xs flex items-center gap-1.5"
              >
                <span>{sec.label}</span>
              </a>
            ))}
          </div>
        </header>

        {/* Dynamic Continuous Form Sections */}
        <div className="space-y-12">
          {/* ─── SECTION 1: ORIGIN & DESTINATION ────────────────────────── */}
          <section id="section-destination" className="space-y-6 pt-2 scroll-mt-6">
            <div className="space-y-2 border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                  Section 1
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Where is your journey taking you?
                </h2>
              </div>
              <p className="text-xs text-[#717975]">
                Choose your departure city and destination — Friday searches live destination photography and route intelligence.
              </p>
            </div>

            {/* Origin City Input */}
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
                className="w-full bg-white border border-black/10 rounded-2xl py-3.5 px-5 text-sm font-semibold text-[#191C1A] placeholder-[#717975] focus:outline-none focus:border-[#00261D] shadow-2xs transition-all"
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#00261D] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#00261D]" />
                  <span>Destination (Where to go in Pakistan) *</span>
                </label>
                {geoValidation.checking && (
                  <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verifying location in Pakistan...
                  </span>
                )}
              </div>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717975]" />
                <input
                  type="text"
                  placeholder="Enter any valley, lake, or city (e.g. Hunza, Skardu, Swat, Naran, Murree, Neelum...)"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className={`w-full bg-white border rounded-2xl py-4 pl-12 pr-6 text-base text-[#191C1A] placeholder-[#717975] focus:outline-none shadow-xs transition-all font-semibold ${
                    !geoValidation.isValid
                      ? 'border-amber-500 focus:border-amber-600 bg-amber-50/20'
                      : 'border-black/10 focus:border-[#00261D]'
                  }`}
                />
              </div>

              {/* Verified Location Badge */}
              {destination && geoValidation.isValid && geoValidation.correctedName && !geoValidation.checking && (
                <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-4 py-2.5 rounded-2xl animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Verified in Pakistan: <strong>{geoValidation.correctedName}</strong>
                    {geoValidation.region ? ` • ${geoValidation.region}` : ''}
                  </span>
                  {geoValidation.wasCorrected && (
                    <span className="ml-auto text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      ✨ Auto-Corrected
                    </span>
                  )}
                </div>
              )}

              {/* Non-Pakistan or Invalid Location Alert */}
              {!geoValidation.isValid && !geoValidation.checking && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2.5 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold leading-tight text-amber-900">
                        {geoValidation.error || `Friday exclusively curates expeditions within Pakistan. '${destination}' is outside Pakistan.`}
                      </p>
                      <p className="text-[11px] text-amber-800">
                        Please choose a destination across Pakistan:
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-amber-200/60">
                    {(geoValidation.suggestions || ['Hunza', 'Skardu', 'Swat', 'Naran', 'Islamabad', 'Neelum Valley', 'Murree', 'Lahore']).map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setDestination(sug)}
                        className="px-3 py-1 bg-white hover:bg-emerald-900 hover:text-white border border-amber-300 rounded-full text-xs font-bold text-[#00261D] cursor-pointer transition-all shadow-2xs"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Famous Tourism Cities */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-[#00261D]" />
                  <span>POPULAR PAKISTANI DESTINATIONS</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {famousTourismCities.map((city, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDestination(city)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                        destination.toLowerCase() === city.toLowerCase()
                          ? 'bg-[#00261D] text-white shadow-xs scale-105'
                          : 'bg-white text-[#414845] border border-black/10 hover:border-[#00261D] hover:bg-[#F8FAF6]'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─── SECTION 2: DATES, DURATION & TRAVELERS (WITH CO-TRAVELER SKIP) ─ */}
          <section id="section-dates-group" className="space-y-6 pt-6 border-t border-black/5 scroll-mt-6">
            <div className="space-y-2 border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                  Section 2
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  When & Who is traveling?
                </h2>
              </div>
              <p className="text-xs text-[#717975]">
                Configure departure dates, group size, and co-traveler contact briefings.
              </p>
            </div>

            {/* Dates Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-black/10 shadow-xs space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="flex flex-col justify-between">
                  <label className="text-xs font-bold text-[#00261D] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Calendar className="w-4 h-4 text-[#00261D]" />
                    <span>Departure Date *</span>
                  </label>
                  <input
                    type="date"
                    min={(() => {
                      const d = new Date();
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      return `${yyyy}-${mm}-${dd}`;
                    })()}
                    value={departureDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDepartureDate(val);
                      updateDatesFromDuration(val, durationOption, customDays);
                    }}
                    className="w-full p-3.5 text-xs sm:text-sm bg-[#F8FAF6] border border-[#00261D] rounded-2xl focus:outline-none font-semibold text-[#00261D]"
                    required
                  />
                  <span className="text-[10px] text-[#717975] mt-1 block">
                    Select today or any upcoming departure date
                  </span>
                </div>

                <div className="flex flex-col justify-between">
                  <label className="text-xs font-bold text-[#717975] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Lock className="w-3.5 h-3.5 text-[#717975]" />
                    <span>Return Date</span>
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    readOnly
                    disabled
                    className="w-full p-3.5 text-xs sm:text-sm bg-[#F3F4F0] border border-black/10 rounded-2xl cursor-not-allowed font-semibold text-[#555E59]"
                  />
                  <span className="text-[10px] text-[#717975] mt-1 block">
                    Calculated automatically from total trip days
                  </span>
                </div>
              </div>

              {/* Trip Duration Stepper */}
              <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#00261D]/15 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#00261D] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#00261D]" />
                    <span>Trip Duration (Total Days)</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center bg-white border border-[#00261D] rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(customDays) || 2;
                        const nextVal = Math.max(1, current - 1);
                        setCustomDays(String(nextVal));
                        setDurationOption('custom');
                        updateDatesFromDuration(departureDate, 'custom', String(nextVal));
                      }}
                      className="w-9 h-9 rounded-lg hover:bg-slate-100 text-[#00261D] font-bold text-lg flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={customDays}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomDays(val);
                        setDurationOption('custom');
                        updateDatesFromDuration(departureDate, 'custom', val);
                      }}
                      className="w-14 p-1 text-center font-bold text-base text-[#00261D] focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(customDays) || 2;
                        const nextVal = Math.min(60, current + 1);
                        setCustomDays(String(nextVal));
                        setDurationOption('custom');
                        updateDatesFromDuration(departureDate, 'custom', String(nextVal));
                      }}
                      className="w-9 h-9 rounded-lg bg-[#00261D] hover:bg-[#00261D]/90 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[1, 2, 3, 5, 7].map((addAmount) => (
                      <button
                        key={addAmount}
                        type="button"
                        onClick={() => {
                          const current = parseInt(customDays) || 2;
                          const nextVal = Math.min(60, current + addAmount);
                          setCustomDays(String(nextVal));
                          setDurationOption('custom');
                          updateDatesFromDuration(departureDate, 'custom', String(nextVal));
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-black/10 hover:border-[#00261D] text-xs font-bold text-[#00261D] hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3 text-[#00261D]" />
                        <span>{addAmount} Day{addAmount > 1 ? 's' : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ─── Real-Time Weather Forecast & Day-by-Day Forecast for Exact Trip Days ─── */}
              {isCheckingWeather ? (
                <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/10 flex items-center gap-3 text-xs text-[#717975] shadow-2xs">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00261D]" />
                  <span>Fetching live OpenWeather conditions for {destination || 'your destination'} across {customDays || 3} days...</span>
                </div>
              ) : weatherAdvisory ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAF6] border border-[#00261D]/15 shadow-2xs space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      {renderWeatherIcon(weatherAdvisory.icon || 'sun', 'w-6 h-6')}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#00261D]">
                            {destination || weatherAdvisory.destination} Weather Forecast
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                            Live OpenWeather
                          </span>
                        </div>
                        <span className="text-[11px] text-[#717975] block">
                          {departureDate ? `${departureDate} → ${returnDate || ''}` : 'Upcoming travel window'} ({weatherAdvisory.condition || 'Clear'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold text-[#00261D] text-sm">
                        {weatherAdvisory.current_temp || 22}°C
                      </span>
                      <span className="text-[#717975]">
                        💧 {weatherAdvisory.humidity || 45}%
                      </span>
                      <span className="text-[#717975]">
                        💨 {weatherAdvisory.wind_speed_kmh || 12} km/h
                      </span>
                    </div>
                  </div>

                  {/* Day-by-Day Forecast Pills for Selected Trip Days */}
                  {Array.isArray(weatherAdvisory.forecast) && weatherAdvisory.forecast.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                      {weatherAdvisory.forecast.map((fDay, fIdx) => (
                        <div
                          key={fIdx}
                          className="p-2.5 rounded-xl bg-white border border-black/5 flex flex-col items-center justify-center text-center space-y-1 shadow-2xs"
                        >
                          <span className="text-[10px] font-bold text-[#717975] uppercase">
                            {fDay.day || `Day ${fIdx + 1}`}
                          </span>
                          {renderWeatherIcon(fDay.icon || 'sun', 'w-4 h-4')}
                          <span className="text-xs font-bold text-[#00261D]">
                            {fDay.temp !== undefined ? `${fDay.temp}°C` : `${fDay.temp_max || 20}°`}
                          </span>
                          <span className="text-[9px] text-[#717975] truncate max-w-full">
                            {fDay.condition || 'Fair'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warning / Seasonal Advisory Banner */}
                  {weatherAdvisory.status === 'WARNING' && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold block">{weatherAdvisory.title || 'Seasonal Travel Warning'}</span>
                        <p className="text-[11px] leading-relaxed text-amber-800">{weatherAdvisory.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Travelers Counter Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-black/10 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-4">
                <div>
                  <span className="text-xs font-bold text-[#00261D] uppercase tracking-wider block">
                    Group Size (Travelers Count)
                  </span>
                  <span className="text-xs text-[#717975]">
                    Select how many companions are joining this expedition.
                  </span>
                </div>

                <div className="flex items-center gap-4 self-center sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setTravelers((prev) => Math.max(1, prev - 1))}
                    disabled={travelers <= 1}
                    className="w-10 h-10 rounded-full border border-black/15 bg-[#F8FAF6] hover:bg-[#E7E9E5] text-[#00261D] disabled:opacity-30 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="text-center min-w-[90px]">
                    <span className="text-4xl font-normal text-[#00261D] block" style={{ fontFamily: "'Instrument Serif', serif" }}>
                      {travelers}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#717975]">
                      {travelers === 1 ? 'Solo Traveler' : 'Travelers'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTravelers((prev) => Math.min(10, prev + 1))}
                    disabled={travelers >= 10}
                    className="w-10 h-10 rounded-full border border-black/15 bg-[#F8FAF6] hover:bg-[#E7E9E5] text-[#00261D] disabled:opacity-30 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lead Traveler Card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00261D] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#00261D]" />
                    <span>Lead Traveler Contact (You)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Lead Organizer
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={leadContact.name}
                      onChange={(e) => setLeadContact({ ...leadContact, name: e.target.value })}
                      placeholder="Your Full Name"
                      className="w-full p-2.5 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D] font-semibold text-[#00261D]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#717975] block mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={leadContact.email}
                      onChange={(e) => setLeadContact({ ...leadContact, email: e.target.value })}
                      placeholder="your.email@gmail.com"
                      className="w-full p-2.5 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D] font-semibold text-[#00261D]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#420E00] block mb-1">Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      value={leadContact.phone}
                      onChange={(e) => setLeadContact({ ...leadContact, phone: e.target.value })}
                      placeholder="+92 300 1234567"
                      className="w-full p-2.5 text-xs bg-[#F8FAF6] border border-[#00261D] rounded-xl focus:outline-none font-bold text-[#00261D]"
                    />
                  </div>
                </div>
              </div>

              {/* ─── CO-TRAVELERS INVITE OR SKIP TOGGLE ─────────────────────── */}
              {travelers > 1 && (
                <div className="pt-4 border-t border-black/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00261D] uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-800" />
                      <span>Co-Travelers ({travelers - 1} Companion{travelers - 1 > 1 ? 's' : ''})</span>
                    </span>
                  </div>

                  <p className="text-xs text-[#717975]">
                    Do you want to invite your friends/co-travelers and send automated WhatsApp & Email itinerary briefings?
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setInviteCompanions(false)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        !inviteCompanions
                          ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                          : 'bg-[#F8FAF6] text-[#00261D] border-black/10 hover:border-black/20'
                      }`}
                    >
                      <span className="text-xs font-bold block mb-0.5">Skip Co-Travelers for Now</span>
                      <span className={`text-[11px] block ${!inviteCompanions ? 'text-white/80' : 'text-[#717975]'}`}>
                        I'll manage the details myself. No companion contact info needed right now.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInviteCompanions(true)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        inviteCompanions
                          ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                          : 'bg-[#F8FAF6] text-[#00261D] border-black/10 hover:border-black/20'
                      }`}
                    >
                      <span className="text-xs font-bold block mb-0.5">Yes, Add Co-Traveler Details</span>
                      <span className={`text-[11px] block ${inviteCompanions ? 'text-white/80' : 'text-[#717975]'}`}>
                        Enter companions' names, WhatsApp numbers & emails for automated briefings.
                      </span>
                    </button>
                  </div>

                  {/* Companion Details Input Fields (When Opted In) */}
                  {inviteCompanions && (
                    <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                      {companions.map((comp, cIdx) => (
                        <div key={cIdx} className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/10 space-y-3">
                          <span className="text-xs font-bold text-[#00261D] block">Companion #{cIdx + 2} Details</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-bold uppercase text-[#717975] block mb-1">Full Name *</label>
                              <input
                                type="text"
                                placeholder="Companion Full Name"
                                value={comp.name}
                                onChange={(e) => {
                                  const next = [...companions];
                                  next[cIdx].name = e.target.value;
                                  setCompanions(next);
                                }}
                                className="w-full p-2.5 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase text-[#717975] block mb-1">Email Address *</label>
                              <input
                                type="email"
                                placeholder="companion@gmail.com"
                                value={comp.email}
                                onChange={(e) => {
                                  const next = [...companions];
                                  next[cIdx].email = e.target.value;
                                  setCompanions(next);
                                }}
                                className="w-full p-2.5 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#00261D]"
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
                                className="w-full p-2.5 text-xs bg-white border border-[#00261D] rounded-xl focus:outline-none font-semibold text-[#00261D]"
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

            {/* ─── OVERNIGHT STAY & HOTEL BOOKING (YES / NO) ────────── */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-black/10 shadow-xs space-y-4">
              <div>
                <span className="text-xs font-bold text-[#00261D] uppercase tracking-wider block">
                  Overnight Stay & Hotel Booking
                </span>
                <span className="text-xs text-[#717975]">
                  Do you plan to stay overnight in {destination || 'your destination'}?
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => {
                    setNeedHotelStay(true);
                    if (accommodation === 'none') setAccommodation('friday_decide');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    needHotelStay
                      ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                      : 'bg-[#F8FAF6] text-[#00261D] border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building className={`w-4 h-4 ${needHotelStay ? 'text-[#BBEAD5]' : 'text-[#00261D]'}`} />
                    <span className="text-xs font-bold">Yes, Need Hotel / Stay</span>
                  </div>
                  {needHotelStay && <Check className="w-4 h-4 text-[#BBEAD5]" />}
                </div>

                <div
                  onClick={() => {
                    setNeedHotelStay(false);
                    setAccommodation('none');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    !needHotelStay
                      ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                      : 'bg-[#F8FAF6] text-[#00261D] border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <X className={`w-4 h-4 ${!needHotelStay ? 'text-[#BBEAD5]' : 'text-[#717975]'}`} />
                    <span className="text-xs font-bold">No Overnight Stay (Day Trip / Self-Arranged)</span>
                  </div>
                  {!needHotelStay && <Check className="w-4 h-4 text-[#BBEAD5]" />}
                </div>
              </div>

              {/* Stay Tier Preferences (When needHotelStay is true) */}
              {needHotelStay && (
                <div className="space-y-3 pt-3 border-t border-black/5 animate-in fade-in duration-200">
                  <span className="text-[11px] font-bold text-[#717975] uppercase tracking-wider block">
                    PREFERRED STAY TIER
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'friday_decide', title: 'Let Friday Decide' },
                      { id: 'budget', title: 'Budget Stay' },
                      { id: 'comfortable', title: 'Comfortable Hotel' },
                      { id: 'premium', title: 'Premium Retreat' },
                    ].map((acc) => {
                      const isSelected = accommodation === acc.id;
                      return (
                        <div
                          key={acc.id}
                          onClick={() => setAccommodation(acc.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                              : 'bg-[#F8FAF6] text-[#191C1A] border-black/10 hover:border-[#00261D]'
                          }`}
                        >
                          <span className="text-xs font-bold">{acc.title}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#BBEAD5]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ─── SECTION 3: BUDGET & TRAVEL STYLES ───────────────── */}
          <section id="section-budget-stay" className="space-y-6 pt-6 border-t border-black/5 scroll-mt-6">
            <div className="space-y-2 border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                  Section 3
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Budget & Travel Styles
                </h2>
              </div>
              <p className="text-xs text-[#717975]">
                Set your budget calculation mode and travel style preferences for optimal AI route matching.
              </p>
            </div>

            {/* Budget Setting Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-6">
              {/* Budget Mode Selector: Let Friday Decide vs Put Yourself */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-[#717975] uppercase tracking-wider block">
                  HOW WOULD YOU LIKE TO SET YOUR BUDGET?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setBudgetMode('friday_decide');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      budgetMode === 'friday_decide'
                        ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                        : 'bg-white text-[#191C1A] border-black/10 hover:border-[#00261D]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className={`w-4 h-4 ${budgetMode === 'friday_decide' ? 'text-[#BBEAD5]' : 'text-emerald-700'}`} />
                      <span className="text-xs font-bold">Let Friday Decide (AI Optimized)</span>
                    </div>
                    {budgetMode === 'friday_decide' && <Check className="w-4 h-4 text-[#BBEAD5]" />}
                  </div>

                  <div
                    onClick={() => setBudgetMode('custom')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      budgetMode === 'custom'
                        ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                        : 'bg-white text-[#191C1A] border-black/10 hover:border-[#00261D]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet className={`w-4 h-4 ${budgetMode === 'custom' ? 'text-[#BBEAD5]' : 'text-[#717975]'}`} />
                      <span className="text-xs font-bold">Put Yourself (Custom Budget)</span>
                    </div>
                    {budgetMode === 'custom' && <Check className="w-4 h-4 text-[#BBEAD5]" />}
                  </div>
                </div>
              </div>

              {/* Custom Budget Input (Shown only when Put Yourself is selected) */}
              {budgetMode === 'custom' && (
                <div className="space-y-4 p-5 rounded-2xl bg-[#F8FAF6] border border-black/10 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-black/5 pb-3">
                    <span className="text-[11px] font-bold text-[#717975] uppercase tracking-wider">
                      CALCULATE BUDGET AS
                    </span>
                    <div className="flex gap-1.5 p-1 rounded-full bg-white border border-black/10 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setBudgetType('total_trip')}
                        className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                          budgetType === 'total_trip' ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975]'
                        }`}
                      >
                        Total Trip
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetType('per_person')}
                        className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                          budgetType === 'per_person' ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975]'
                        }`}
                      >
                        Per Person
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-bold text-[#717975]">
                      PKR
                    </span>
                    <input
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="10000"
                      className="w-full bg-white border border-black/10 rounded-xl py-3.5 pl-18 pr-6 text-xl font-bold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                    />
                  </div>
                </div>
              )}

              {/* Travel Styles */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-[#717975] uppercase tracking-wider block">
                  TRAVEL VIBE & STYLES
                </span>
                <div className="flex flex-wrap gap-2">
                  {travelStylesOptions.map((style) => {
                    const isSel = selectedStyles.includes(style.id);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleToggleTravelStyle(style.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSel
                            ? 'bg-[#00261D] text-white shadow-2xs'
                            : 'bg-[#F8FAF6] text-[#414845] border border-black/10 hover:bg-[#E7E9E5]'
                        }`}
                      >
                        <span>{style.label}</span>
                        {isSel && <Check className="w-3 h-3 text-[#BBEAD5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ─── Bottom CTA Action Bar ───────────────────────────────────── */}
        <footer className="pt-8 border-t border-black/10 space-y-4 sticky bottom-0 bg-[#F8FAF6]/95 backdrop-blur-md py-4 z-20">
          <div className="p-4 sm:p-5 rounded-3xl bg-[#00261D] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#BBEAD5]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#BBEAD5]">
                  Ready to Generate
                </span>
              </div>
              <p className="text-xs text-white/90">
                {destination ? `${destination} • ` : ''}{customDays || 3} Days • {travelers} Traveler{travelers > 1 ? 's' : ''} • {budgetMode === 'friday_decide' ? 'Let Friday Decide (AI Optimized)' : `PKR ${Number(budgetAmount || 10000).toLocaleString()}`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGeneratePlan}
              className="px-8 py-3.5 rounded-full bg-[#BBEAD5] hover:bg-white text-[#00261D] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all hover:scale-105 shadow-md cursor-pointer whitespace-nowrap w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4 text-[#00261D]" />
              <span>Generate Trip</span>
            </button>
          </div>
        </footer>
      </main>

      {/* ─── Right Contextual Summary Panel (Permanently Fixed on Desktop/Laptop Screens) ── */}
      <aside className="hidden xl:flex flex-col w-80 p-8 shrink-0 border-l border-black/10 space-y-6 bg-[#F8FAF6] fixed top-0 right-0 h-screen overflow-y-auto z-30 shadow-2xs">
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
                {parseInt(customDays) || 3} {parseInt(customDays) === 1 ? 'Day' : 'Days'}
                {departureDate ? ` (${departureDate}${returnDate ? ` → ${returnDate}` : ''})` : ''}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#717975] uppercase font-bold block">Budget</span>
              <span className="font-semibold text-[#420E00]">
                {budgetMode === 'friday_decide'
                  ? 'Let Friday Decide (AI Optimized)'
                  : `PKR ${Number(budgetAmount || 0).toLocaleString()} (${budgetType === 'total_trip' ? 'Total' : 'Per Person'})`}
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

      {/* ─── Mobile Trip Summary Slide-Over Drawer / Modal ─────────── */}
      {showMobileSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 xl:hidden">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full max-h-[88vh] overflow-y-auto shadow-2xl border border-black/10 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Header with Title & Close Cross Icon */}
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00261D]">
                <Compass className="w-4 h-4 text-[#00261D]" />
                <span>Your Trip Summary</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileSummary(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#717975] hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                title="Close Summary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Summary Cards */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-0.5">
                <span className="text-[10px] text-[#717975] uppercase font-bold block">From (Departure)</span>
                <span className="font-bold text-[#00261D] text-sm">
                  {origin || 'Islamabad'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-0.5">
                <span className="text-[10px] text-[#717975] uppercase font-bold block">To (Destination)</span>
                <span className="font-bold text-[#00261D] text-sm">
                  {destination || 'Not selected yet'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-0.5">
                  <span className="text-[10px] text-[#717975] uppercase font-bold block">Travelers</span>
                  <span className="font-bold text-[#00261D]">
                    {travelers} {travelers === 1 ? 'Person' : 'People'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-0.5">
                  <span className="text-[10px] text-[#717975] uppercase font-bold block">Duration</span>
                  <span className="font-bold text-[#00261D]">
                    {parseInt(customDays) || 3} {parseInt(customDays) === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
              </div>

              {departureDate && (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-900/10 space-y-0.5">
                  <span className="text-[10px] text-emerald-900 uppercase font-bold block">Selected Dates</span>
                  <span className="font-semibold text-emerald-950 block">
                    {departureDate} → {returnDate || '...'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-0.5">
                  <span className="text-[10px] text-[#717975] uppercase font-bold block">Budget</span>
                  <span className="font-bold text-[#420E00]">
                    {budgetMode === 'friday_decide'
                      ? 'Let Friday Decide'
                      : `PKR ${Number(budgetAmount || 0).toLocaleString()}`}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-0.5">
                  <span className="text-[10px] text-[#717975] uppercase font-bold block">Stay</span>
                  <span className="font-bold text-[#00261D] capitalize">
                    {accommodation.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#F8FAF6] border border-black/5 space-y-0.5">
                <span className="text-[10px] text-[#717975] uppercase font-bold block">Style</span>
                <span className="font-bold text-[#00261D]">
                  {selectedStyles.join(' · ')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#00261D]/5 border border-black/5 text-xs text-[#555E59] space-y-1">
              <span className="font-bold text-[#00261D] block text-[11px]">Real-time Web Intelligence</span>
              <p className="text-[10px] leading-relaxed">
                Friday fetches live destination photography and routes via web search, and dispatches automated briefings to companions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileSummary(false)}
              className="w-full py-3 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              Continue Planning →
            </button>
          </div>
        </div>
      )}

      {/* ─── Exit / Save Draft Confirmation Modal ────────────────────── */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/10 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2.5 text-base font-bold text-[#00261D]">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-900 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span>Exit Trip Planning?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#717975] hover:text-black flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtext */}
            <p className="text-xs sm:text-sm text-[#555E59] leading-relaxed">
              Are you sure you want to leave this page? You have in-progress itinerary details for{' '}
              <strong className="text-[#00261D]">{destination || 'your expedition'}</strong>.
            </p>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSaveDraftAndExit}
                className="w-full py-3.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5 text-[#BBEAD5]" />
                <span>Save & Exit</span>
              </button>

              <button
                type="button"
                onClick={handleDiscardAndExit}
                className="w-full py-3 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard & Exit</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-2 text-xs font-semibold text-[#717975] hover:text-black transition-colors cursor-pointer"
              >
                Cancel / Stay on Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
