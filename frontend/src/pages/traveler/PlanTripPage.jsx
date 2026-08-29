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
  Trash2,
  X,
  Landmark,
  Mountain,
  Award,
  Save,
  FileText,
  RefreshCw,
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
  const totalSteps = 8;

  // ─── Question Form State ──────────────────────────────────────────────
  const [origin, setOrigin] = useState('Islamabad');
  const [destination, setDestination] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [durationOption, setDurationOption] = useState('2-3_days'); // '1_day' | '2-3_days' | '4-6_days' | '7+_days' | 'custom'
  const [customDays, setCustomDays] = useState('8');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('10000');
  const [budgetType, setBudgetType] = useState('total_trip'); // 'total_trip' | 'per_person'
  const [budgetFlexibility, setBudgetFlexibility] = useState('some_flexibility'); // 'strict' | 'some_flexibility' | 'flexible'
  const [accommodation, setAccommodation] = useState('budget'); // 'none' | 'budget' | 'comfortable' | 'premium' | 'friday_decide'
  const [selectedStyles, setSelectedStyles] = useState(['Nature', 'Scenic']);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

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

    let days = 3;
    if (option === '1_day') days = 1;
    else if (option === '2-3_days') days = 3;
    else if (option === '4-6_days') days = 5;
    else if (option === '7+_days') days = 7;
    else if (option === 'custom') days = Math.max(1, parseInt(customVal) || 8);

    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');
    setReturnDate(`${yyyy}-${mm}-${dd}`);
  };

  // ─── Schedule Slot Customizer State (Step 7) ──────────────────────────
  const [slotOptions, setSlotOptions] = useState(null);
  const [slotSelections, setSlotSelections] = useState({
    morning: 'option_d',
    afternoon: 'option_d',
    evening: 'option_d',
  });

  // Fetch Weather Advisory when Destination or Departure Date changes
  useEffect(() => {
    if (destination.trim() && departureDate) {
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

      setIsCheckingWeather(true);
      tripsService
        .checkWeather(destination.trim(), departureDate, daysCount)
        .then((res) => setWeatherAdvisory(res))
        .catch(() => setWeatherAdvisory(null))
        .finally(() => setIsCheckingWeather(false));
    } else {
      setWeatherAdvisory(null);
    }
  }, [destination, departureDate, durationOption, customDays, returnDate]);

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

  // ─── Submission Handler with Contact Validations ───────────────────────
  const handleGeneratePlan = async () => {
    if (!destination.trim()) {
      toast.error('Please enter a destination.');
      setCurrentStep(1);
      return;
    }

    if (!origin.trim()) {
      toast.error('Please enter your starting/departure city.');
      setCurrentStep(1);
      return;
    }

    if (!departureDate) {
      toast.error('Departure date is required.');
      setCurrentStep(3);
      return;
    }

    // Validate Lead Contact Phone & Email
    if (!leadContact.phone.trim()) {
      toast.error('Your contact phone number is compulsory for trip dispatch.');
      setCurrentStep(8);
      return;
    }

    // Validate Companions (if any)
    if (travelers > 1) {
      for (let i = 0; i < companions.length; i++) {
        const c = companions[i];
        if (!c.name.trim() || !c.phone.trim() || !c.email.trim()) {
          toast.error(`Please provide complete details (Name, Email, Phone) for Companion #${i + 2}.`);
          setCurrentStep(8);
          return;
        }
      }
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
      budget: Number(budgetAmount) || 10000,
      budget_type: budgetType,
      budget_flexibility: budgetFlexibility,
      accommodation_preference: accommodation,
      travel_styles: selectedStyles,
      additional_preferences: additionalNotes.trim() || null,
      slot_preferences: slotSelections,
      lead_contact: leadContact,
      companions: companions,
      show_members_publicly: showMembersPublicly,
    };

    try {
      const response = await tripsService.guidedPlan(payload);
      setGeneratedTripId(response.id);
      setGeneratedPlan(response);
      setEditableTitle(response.trip?.title || `${destination.trim()}, at your pace`);
      setEditableBudget(response.trip?.budget_total || response.budget_breakdown?.total || 10000);
      setEditOverviewForm({
        origin: response.trip?.origin || origin.trim() || 'Islamabad',
        destination: response.trip?.destination || destination.trim(),
        travelers: response.trip?.travelers || Number(travelers) || 2,
        start_date: response.trip?.start_date || departureDate || '',
        end_date: response.trip?.end_date || returnDate || '',
        budget_total: response.trip?.budget_total || Number(budgetAmount) || 10000,
      });
      setEditBreakdownForm({
        transport: response.budget_breakdown?.transport || 3000,
        accommodation: response.budget_breakdown?.accommodation || 4000,
        food: response.budget_breakdown?.food || 2000,
        activities: response.budget_breakdown?.activities || 1000,
        other: response.budget_breakdown?.other || 1000,
      });
      setEditLeadContact(leadContact);
      setEditCompanions(companions);
      setIsPublic(Boolean(response.trip?.is_public));
      setShowMembersPublicly(Boolean(response.trip?.show_members_publicly));
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
      await tripsService.updateTrip(generatedTripId, {
        budget_total: val,
        budget_per_person: Math.round(val / Math.max(1, travelers)),
      });
      setGeneratedPlan((prev) => ({
        ...prev,
        trip: { ...prev.trip, budget_total: val, budget_per_person: Math.round(val / Math.max(1, travelers)) },
      }));
      setIsEditingBudget(false);
      toast.success('Budget updated.');
    } catch {
      toast.error('Failed to update budget.');
    }
  };

  // ─── Save Overview (Origin, Destination, Dates, Group Size, Budget) ────
  const handleSaveOverview = async (e) => {
    e?.preventDefault();
    if (!generatedTripId) return;
    try {
      const valBudget = Number(editOverviewForm.budget_total) || 10000;
      const valTravelers = Number(editOverviewForm.travelers) || 2;
      await tripsService.updateTrip(generatedTripId, {
        origin: editOverviewForm.origin.trim(),
        destination: editOverviewForm.destination.trim(),
        travelers: valTravelers,
        budget_total: valBudget,
        budget_per_person: Math.round(valBudget / Math.max(1, valTravelers)),
        start_date: editOverviewForm.start_date || null,
        end_date: editOverviewForm.end_date || null,
      });
      setGeneratedPlan((prev) => ({
        ...prev,
        trip: {
          ...prev.trip,
          origin: editOverviewForm.origin.trim(),
          destination: editOverviewForm.destination.trim(),
          travelers: valTravelers,
          budget_total: valBudget,
          budget_per_person: Math.round(valBudget / Math.max(1, valTravelers)),
          start_date: editOverviewForm.start_date || null,
          end_date: editOverviewForm.end_date || null,
        },
      }));
      setOrigin(editOverviewForm.origin.trim());
      setDestination(editOverviewForm.destination.trim());
      setTravelers(valTravelers);
      setBudgetAmount(String(valBudget));
      setIsEditingOverview(false);
      toast.success('Trip overview details updated.');
    } catch {
      toast.error('Failed to update trip overview.');
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

    const destName = trip.destination || destination;
    const heroImage = trip.image_url || getDestinationFallback(destName);

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
                  alt={destName}
                  onError={(e) => {
                    e.currentTarget.src = getDestinationFallback(destName);
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

                  <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
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
                      className="px-3.5 py-1.5 rounded-full border border-black/15 hover:border-[#00261D] bg-[#F8FAF6] text-xs font-bold text-[#00261D] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isEditingOverview ? 'Close Editor' : 'Edit Overview'}</span>
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
                          value={editOverviewForm.start_date}
                          onChange={(e) => setEditOverviewForm((prev) => ({ ...prev, start_date: e.target.value }))}
                          className="w-full p-3 bg-white border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#717975] uppercase block mb-1">Return Date</label>
                        <input
                          type="date"
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
                    <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                      <button
                        type="button"
                        onClick={() => setIsEditingOverview(false)}
                        className="px-4 py-2 rounded-full border border-black/10 bg-white text-xs font-bold text-[#717975] hover:text-black cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold cursor-pointer shadow-2xs"
                      >
                        Save Overview Details
                      </button>
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

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingBreakdown(!isEditingBreakdown)}
                    className="px-3.5 py-1.5 rounded-full border border-black/15 hover:border-[#00261D] bg-[#F8FAF6] text-xs font-bold text-[#00261D] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditingBreakdown ? 'Close' : 'Edit Allocation'}</span>
                  </button>

                  <div className="text-right">
                    <span className="text-xs text-[#717975] block">Total Estimate</span>
                    <span className="text-2xl font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                      PKR {Number(trip.budget_total || budgetAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {isEditingBreakdown ? (
                <form onSubmit={handleSaveBreakdown} className="space-y-4 p-5 rounded-2xl bg-[#F8FAF6] border border-black/10 animate-in fade-in duration-200">
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
              )}
            </div>

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
                                  <p className="text-[11px] text-[#717975] flex items-center gap-1 mt-1 truncate">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span>{act.location}</span>
                                  </p>
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
                      className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold cursor-pointer shadow-2xs"
                    >
                      Add Stop to Itinerary
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

              <div className="pt-2">
                <button
                  onClick={handlePublishTrip}
                  disabled={isPublishing}
                  className="w-full py-4 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:scale-101"
                >
                  {isPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-[#BBEAD5]" />
                  )}
                  <span>{isPublished ? 'Re-Publish & Re-Send Itinerary' : 'Confirm & Publish Expedition'}</span>
                </button>
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
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep(currentStep - 1);
                } else {
                  setShowExitModal(true);
                }
              }}
              className="p-2 rounded-full hover:bg-slate-100 text-[#717975] hover:text-black transition-colors cursor-pointer"
              title={currentStep > 1 ? 'Previous Step' : 'Exit Planning'}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
              STEP {currentStep} OF {totalSteps}
            </span>
          </div>

          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((st) => (
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
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                    Destination & Route
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMobileSummary(true)}
                    className="flex xl:hidden items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#00261D]/20 text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Trip Summary</span>
                  </button>
                </div>
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

                {/* Famous Tourism Cities */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-[#00261D]" />
                    <span>FAMOUS TOURISM CITIES & HERITAGE HUBS</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {famousTourismCities.map((city, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDestination(city)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                          destination === city
                            ? 'bg-[#00261D] text-white shadow-xs scale-105'
                            : 'bg-white text-[#414845] border border-black/10 hover:border-[#00261D]'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Iconic Valleys & Mountain Retreats */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717975] flex items-center gap-1.5">
                    <Mountain className="w-3.5 h-3.5 text-[#00261D]" />
                    <span>ICONIC VALLEYS & MOUNTAIN SIGHTS</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {popularValleys.map((place, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDestination(place)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all cursor-pointer ${
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

                {/* ─── LET FRIDAY RECOMMEND SECTION ────────────────────────── */}
                <div className="pt-4 border-t border-black/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={handleLetFridayRecommend}
                      className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        isFridayRecommending
                          ? 'bg-[#00261D] text-white'
                          : 'bg-emerald-50 text-emerald-950 border border-emerald-200 hover:bg-emerald-100/80 hover:scale-101'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-[#BBEAD5]" />
                      <span>Let Friday Recommend (AI Curates 4 Top Destinations)</span>
                    </button>

                    {isFridayRecommending && (
                      <button
                        type="button"
                        onClick={handleLetFridayRecommend}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#00261D] bg-white border border-black/10 hover:bg-[#F8FAF6] transition-all cursor-pointer shrink-0"
                        title="Shuffle & pick 4 different destinations"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#00261D]" />
                        <span>Shuffle / 4 New Places</span>
                      </button>
                    )}
                  </div>

                  {isFridayRecommending && recommendedDestinations.length > 0 && (
                    <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between text-[11px] text-[#717975] px-1">
                        <span className="font-semibold text-[#00261D]">Friday AI Recommends 4 Handpicked Destinations:</span>
                        <span>Tap any destination card to choose</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {recommendedDestinations.map((place, pIdx) => {
                          const isSelected = destination.toLowerCase() === place.title.toLowerCase();

                          return (
                            <div
                              key={pIdx}
                              onClick={() => setDestination(place.title)}
                              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs hover:scale-101 ${
                                isSelected
                                  ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs'
                                  : 'bg-white text-[#191C1A] border-black/10 hover:border-[#00261D]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full block w-fit mb-1 truncate ${
                                      isSelected
                                        ? 'bg-white/20 text-[#BBEAD5]'
                                        : 'bg-[#F8FAF6] text-[#00261D] border border-black/5'
                                    }`}
                                  >
                                    {place.category}
                                  </span>
                                  <h4 className="text-sm font-bold truncate">{place.title}</h4>
                                </div>
                                {isSelected ? (
                                  <div className="w-6 h-6 rounded-full bg-[#BBEAD5] text-[#00261D] flex items-center justify-center shrink-0 shadow-2xs">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-[#717975] uppercase px-2 py-0.5 rounded-full bg-[#F8FAF6] shrink-0">
                                    {place.tag}
                                  </span>
                                )}
                              </div>
                              <p
                                className={`text-[11px] leading-relaxed line-clamp-2 ${
                                  isSelected ? 'text-white/80' : 'text-[#717975]'
                                }`}
                              >
                                {place.subtitle}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: TRAVELERS (Numeric Stepper 1-10) ─────────────── */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                    Group Size
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMobileSummary(true)}
                    className="flex xl:hidden items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#00261D]/20 text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Trip Summary</span>
                  </button>
                </div>
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

          {/* ─── STEP 3: TRIP DURATION & COMPULSORY DATES ─────────────── */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                    Required Calendar Dates
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMobileSummary(true)}
                    className="flex xl:hidden items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#00261D]/20 text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Trip Summary</span>
                  </button>
                </div>
                <h1
                  className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  When are you departing?
                </h1>
                <p className="text-xs sm:text-sm text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Departure date is compulsory. Friday's weather intelligence will proactively check route conditions for safety.
                </p>
              </div>

              {/* Compulsory Departure & Return Dates Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div className="flex flex-col justify-between">
                    <div className="flex items-center justify-between h-6 mb-2">
                      <label className="text-xs font-bold text-[#00261D] uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#00261D]" />
                        <span>Departure Date *</span>
                      </label>
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                        Compulsory
                      </span>
                    </div>
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
                      className="w-full p-4 text-xs sm:text-sm bg-[#F8FAF6] border border-[#00261D] rounded-2xl focus:outline-none font-semibold text-[#00261D] h-[52px]"
                      required
                    />
                    <span className="text-[10px] text-[#717975] mt-1.5 block min-h-[16px]">
                      Select today or any upcoming departure date
                    </span>
                  </div>

                  <div className="flex flex-col justify-between">
                    <div className="flex items-center justify-between h-6 mb-2">
                      <label className="text-xs font-bold text-[#717975] uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#717975]" />
                        <span>Return Date</span>
                      </label>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                        Auto Calculated
                      </span>
                    </div>
                    <input
                      type="date"
                      value={returnDate}
                      readOnly
                      disabled
                      className="w-full p-4 text-xs sm:text-sm bg-[#F3F4F0] border border-black/10 rounded-2xl cursor-not-allowed font-semibold text-[#555E59] h-[52px]"
                    />
                    <span className="text-[10px] text-[#717975] mt-1.5 block min-h-[16px]">
                      Calculated automatically from your selected trip days
                    </span>
                  </div>
                </div>

                {/* Interactive Trip Length Stepper & Adjustment Controls */}
                <div className="space-y-3 pt-2 border-t border-black/5">
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAF6] border border-[#00261D]/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#00261D] uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#00261D]" />
                        <span>Trip Duration (Total Days)</span>
                      </label>
                      <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Auto-calculates Return Date
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Stepper with Minus / Number / Plus buttons */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white border border-[#00261D] rounded-xl p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseInt(customDays) || 2;
                              const nextVal = Math.max(1, current - 1);
                              setCustomDays(String(nextVal));
                              updateDatesFromDuration(departureDate, 'custom', String(nextVal));
                            }}
                            className="w-10 h-10 rounded-lg hover:bg-slate-100 text-[#00261D] font-bold text-lg flex items-center justify-center transition-colors cursor-pointer"
                            title="Decrease 1 Day"
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
                              updateDatesFromDuration(departureDate, 'custom', val);
                            }}
                            placeholder="2"
                            className="w-16 p-2 text-center font-bold text-lg text-[#00261D] focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const current = parseInt(customDays) || 2;
                              const nextVal = Math.min(60, current + 1);
                              setCustomDays(String(nextVal));
                              updateDatesFromDuration(departureDate, 'custom', String(nextVal));
                            }}
                            className="w-10 h-10 rounded-lg bg-[#00261D] hover:bg-[#00261D]/90 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                            title="Add 1 Day"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <span className="text-sm font-bold text-[#00261D]">
                          {parseInt(customDays) === 1 ? 'Day Expedition' : 'Days Expedition'}
                        </span>
                      </div>

                      {/* Quick Add / Jump Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[1, 2, 3, 5, 7].map((addAmount) => (
                          <button
                            key={addAmount}
                            type="button"
                            onClick={() => {
                              const current = parseInt(customDays) || 2;
                              const nextVal = Math.min(60, current + addAmount);
                              setCustomDays(String(nextVal));
                              updateDatesFromDuration(departureDate, 'custom', String(nextVal));
                            }}
                            className="px-3 py-2 rounded-xl bg-white border border-black/10 hover:border-[#00261D] text-xs font-bold text-[#00261D] hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3 text-[#00261D]" />
                            <span>{addAmount} Day{addAmount > 1 ? 's' : ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proactive Weather Intelligence Advisory Banner */}
                {isCheckingWeather && (
                  <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/10 flex items-center gap-3 text-xs text-[#717975]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00261D]" />
                    <span>Friday is checking weather forecasts and high-altitude road advisories for {destination || 'your destination'}...</span>
                  </div>
                )}

                {weatherAdvisory && weatherAdvisory.status === 'WARNING' && (
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <span>{weatherAdvisory.title || 'Seasonal Weather Advisory'}</span>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      {weatherAdvisory.message}
                    </p>
                    {weatherAdvisory.suggested_dates && (
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-amber-200/60">
                        <span className="text-xs text-amber-950 font-medium flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Suggested Optimal Window: <strong>{weatherAdvisory.suggested_dates.label}</strong></span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDepartureDate(weatherAdvisory.suggested_dates.start_date);
                            setReturnDate(weatherAdvisory.suggested_dates.end_date);
                            toast.success('Optimal weather travel dates applied!');
                          }}
                          className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
                        >
                          Apply Recommended Dates
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {weatherAdvisory && weatherAdvisory.status === 'OPTIMAL' && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{weatherAdvisory.message || 'Optimal weather conditions forecasted for your travel window.'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 4: BUDGET (Default PKR 10,000) ──────────────────── */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                    Budget Estimation
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMobileSummary(true)}
                    className="flex xl:hidden items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#00261D]/20 text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Trip Summary</span>
                  </button>
                </div>
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
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                    Accommodation Tier
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMobileSummary(true)}
                    className="flex xl:hidden items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#00261D]/20 text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Trip Summary</span>
                  </button>
                </div>
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
                  { id: 'budget', title: 'Budget stay', sub: 'Clean local guest houses & hostels (PKR 3K–6K/night)', minBudget: 0 },
                  { id: 'comfortable', title: 'Comfortable hotel', sub: 'Standard 3-star quality lodges & hotels (PKR 8K–16K/night)', minBudget: 40000 },
                  { id: 'premium', title: 'Premium retreat', sub: 'Luxury mountain resorts like Serena / Luxus (PKR 30K–70K+/night)', minBudget: 80000 },
                  { id: 'friday_decide', title: 'Let Friday decide', sub: 'Optimized automatically for your destination and budget', minBudget: 0 },
                ].map((acc) => {
                  const currentTotalBudget = budgetType === 'per_person'
                    ? (Number(budgetAmount) || 10000) * Number(travelers || 1)
                    : (Number(budgetAmount) || 10000);
                  const isLocked = currentTotalBudget < acc.minBudget;
                  const isSelected = accommodation === acc.id;

                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        if (isLocked) {
                          toast.error(`${acc.title} in Northern Pakistan requires an estimated total trip budget of at least PKR ${acc.minBudget.toLocaleString()}.`);
                          return;
                        }
                        setAccommodation(acc.id);
                      }}
                      className={`p-5 rounded-2xl border transition-all relative space-y-1.5 ${
                        isLocked
                          ? 'opacity-45 bg-slate-100/80 border-slate-200 cursor-not-allowed'
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
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
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

              {/* Market Insight Note */}
              <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-black/10 flex items-start gap-2.5 text-xs text-[#555E59]">
                <Info className="w-4 h-4 text-[#00261D] shrink-0 mt-0.5" />
                <span>
                  <strong>Market Pricing Intelligence:</strong> In Pakistan's northern tourism corridors (Hunza, Skardu, Swat, Naran), standard 3-star comfortable hotels average PKR 8K–16K/night (requiring PKR 40K+ trip budget), while luxury heritage resorts like Serena, Luxus Attabad, and PC average PKR 30K–70K+/night (requiring PKR 80K+ trip budget).
                </span>
              </div>
            </div>
          )}

          {/* ─── STEP 6: TRAVEL STYLE & PREFERENCES ──────────────────── */}
          {currentStep === 6 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                    Travel Vibe & Style
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMobileSummary(true)}
                    className="flex xl:hidden items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#00261D]/20 text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Trip Summary</span>
                  </button>
                </div>
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

          {/* ─── STEP 7: SCHEDULE SLOT CUSTOMIZER (4 OPTIONS & FAST TRACK) ─── */}
          {currentStep === 7 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#BBEAD5]/40 text-[#00261D] inline-block">
                  Interactive Itinerary Customizer
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobileSummary(true)}
                  className="flex xl:hidden items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#00261D]/20 text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Trip Summary</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h1
                    className="text-3xl sm:text-4xl font-normal text-[#00261D] leading-tight"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    How would you like to pace your days?
                  </h1>
                  <p className="text-xs text-[#717975]">
                    Pick curated options for each time slot, or let Friday decide automatically.
                  </p>
                </div>

                {/* Fast-Track Let Friday Decide All Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSlotSelections({
                      morning: 'option_d',
                      afternoon: 'option_d',
                      evening: 'option_d',
                    });
                    toast.success('Friday will automatically optimize all time slots for you!');
                    setCurrentStep(8);
                  }}
                  className="px-5 py-3 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 transition-all hover:scale-105 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#BBEAD5]" />
                  <span>Let Friday Decide All →</span>
                </button>
              </div>

              {/* 3 Time Slots: Morning, Afternoon, Evening */}
              {['morning', 'afternoon', 'evening'].map((slotKey) => {
                const slotTitle = slotKey === 'morning' ? 'Morning (08:00 AM – 12:00 PM)' : slotKey === 'afternoon' ? 'Afternoon (12:30 PM – 04:30 PM)' : 'Evening (05:00 PM – 09:00 PM)';
                const currentSlotData = slotOptions ? slotOptions[slotKey] : null;

                const defaultChoices = [
                  { id: 'option_a', title: slotKey === 'morning' ? 'Scenic Mountain Approach & Lake Walk' : slotKey === 'afternoon' ? 'Valley Exploration & Cultural Heritage' : 'Sunset Viewpoint & Local Dining', desc: 'Curated highlight stop for ' + (destination || 'your destination') },
                  { id: 'option_b', title: slotKey === 'morning' ? 'Highland Trek & Photography Orientation' : slotKey === 'afternoon' ? 'Adventure Activity & Fort Tour' : 'Riverside Relaxation & Stargazing', desc: 'Active exploratory route stop' },
                  { id: 'option_c', title: slotKey === 'morning' ? 'Relaxed Resort Breakfast & Bazaar Stroll' : slotKey === 'afternoon' ? 'Traditional Cuisine & Crafts Workshop' : 'Traditional Music & Bonfire Gathering', desc: 'Leisurely cultural immersion stop' },
                  { id: 'option_d', title: 'Let Friday Decide', desc: 'AI dynamically optimizes the best stop according to weather & budget', isAi: true },
                ];

                const choices = currentSlotData?.options || defaultChoices;

                return (
                  <div key={slotKey} className="bg-white rounded-3xl p-6 sm:p-7 border border-black/10 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-black/5 pb-2.5">
                      <Clock className="w-4 h-4 text-[#00261D]" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#00261D]">
                        {slotTitle}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {choices.map((opt) => {
                        const isSelected = slotSelections[slotKey] === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => setSlotSelections((prev) => ({ ...prev, [slotKey]: opt.id }))}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1 relative ${
                              isSelected
                                ? 'bg-[#00261D] text-white border-[#00261D] shadow-xs scale-102'
                                : 'bg-[#F8FAF6] text-[#191C1A] border-black/5 hover:border-black/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold block leading-snug">
                                {opt.title}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#BBEAD5] shrink-0 mt-0.5" />}
                            </div>
                            <p className={`text-[11px] leading-relaxed ${isSelected ? 'text-white/80' : 'text-[#717975]'}`}>
                              {opt.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── STEP 8: COMPULSORY TRAVELER CONTACT VERIFICATION ────── */}
          {currentStep === 8 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                    Mandatory Contact Verification
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMobileSummary(true)}
                    className="flex xl:hidden items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#00261D]/20 text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Trip Summary</span>
                  </button>
                </div>
                <h1
                  className="text-4xl sm:text-5xl font-normal text-[#00261D] leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Who is traveling?
                </h1>
                <p className="text-xs sm:text-sm text-[#717975]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Please provide verified contact details so Friday's AI layer can dispatch WhatsApp briefings & email itineraries upon publishing.
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
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-[#717975] hover:text-black transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-[#717975] hover:text-red-600 hover:bg-red-50/50 transition-colors cursor-pointer"
            >
              Exit Planning
            </button>
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
                if (currentStep === 3) {
                  if (!departureDate) {
                    toast.error('Departure date is compulsory.');
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
                {parseInt(customDays) || 3} {parseInt(customDays) === 1 ? 'Day' : 'Days'}
                {departureDate ? ` (${departureDate}${returnDate ? ` → ${returnDate}` : ''})` : ''}
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
                    PKR {Number(budgetAmount || 0).toLocaleString()}
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
                className="w-full py-3.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-[#BBEAD5]" />
                <span>Save to Drafts & Exit</span>
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
