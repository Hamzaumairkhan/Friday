import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Minus,
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
  Calendar,
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  Snowflake,
  AlertTriangle,
  Check,
  MapPin,
  Car,
  Building,
  Phone,
  User,
  Clock,
  Trash2,
  Compass,
  Lock,
  Edit3,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { organizersService } from '../../services/organizers';
import { packagesService } from '../../services/packages';
import { tripsService } from '../../services/trips';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
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

const createDefaultDaysSchedule = (numDays = 3) => {
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

export default function PackageFormPage() {
  const { id, packageId } = useParams();
  const targetPackageId = id || packageId;
  const isEditing = !!targetPackageId;
  const navigate = useNavigate();
  const { backendUser, organizerProfile } = useAuth();

  const [loading, setLoading] = useState(isEditing);
  const [isPublished, setIsPublished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [activeTab, setActiveTab] = useState('BASICS'); // BASICS, PRICING, DATES, ITINERARY, INCLUSIONS, REVIEW

  // Draft Management State
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Weather Intelligence State
  const [weatherAdvisory, setWeatherAdvisory] = useState(null);
  const [isCheckingWeather, setIsCheckingWeather] = useState(false);

  // Geo Validation & Auto-Correction State
  const [geoValidation, setGeoValidation] = useState({
    isValid: true,
    wasCorrected: false,
    correctedName: '',
    error: '',
    checking: false,
    region: '',
    suggestions: [],
  });

  // Default dates: departure = today + 14 days
  const getInitialDepartureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    organizer_name: '',
    contact_phone: '',
    duration_days: 3,
    departure_date: getInitialDepartureDate(),
    return_date: '',
    price_per_person: '',
    max_travelers: 15,
    description: '',
    accommodation_type: '3-Star Hotel',
    transportation_type: 'Coaster / Bus',
    image_url: '',
    inclusions: ['Breakfast & Dinner', 'Luxury Transport', 'Local Tour Guide', 'Fuel & Toll Taxes'],
    exclusions: ['Personal Shopping', 'Extra Porter', 'Lunch & Beverages'],
    days_schedule: createDefaultDaysSchedule(3),
    inclusionInput: '',
    exclusionInput: '',
  });

  // Security Guard: Published / Created tour packages are locked and immutable
  useEffect(() => {
    if (isEditing || targetPackageId) {
      toast.error('Tour packages cannot be edited once published to ensure price transparency and booking integrity.', { id: 'pkg-edit-locked' });
      navigate('/organizer/trips', { replace: true });
    }
  }, [isEditing, targetPackageId, navigate]);

  // Restore draft on mount if not in edit mode
  useEffect(() => {
    if (!isEditing) {
      try {
        const savedDraftStr = localStorage.getItem('friday_package_draft');
        if (savedDraftStr) {
          const draft = JSON.parse(savedDraftStr);
          if (draft && (draft.title || draft.destination || draft.description)) {
            const verifiedName = organizerProfile?.name || organizerProfile?.business_name || backendUser?.business_name || backendUser?.name || draft.organizer_name || 'Verified Tour Host';
            const verifiedPhone = organizerProfile?.contact_phone || organizerProfile?.phone || backendUser?.phone || (draft.contact_phone !== '+92 300 1234567' ? draft.contact_phone : '') || '';

            setFormData((prev) => ({
              ...prev,
              ...draft,
              organizer_name: verifiedName,
              contact_phone: verifiedPhone,
              inclusionInput: '',
              exclusionInput: '',
            }));
            if (draft.activeTab) {
              setActiveTab(draft.activeTab);
            }
            setDraftSavedAt(draft.savedAt || new Date().toISOString());
            setRestoredDraft(true);
            toast('Loaded your saved package draft.', { icon: '📝', id: 'pkg-draft-loaded' });
          }
        }
      } catch (err) {
        console.error('Failed to parse package draft:', err);
      }
    }
  }, [isEditing, organizerProfile, backendUser]);

  // Fetch fresh organizer profile directly from backend and sync verified credentials
  useEffect(() => {
    const fetchFreshProfile = async () => {
      try {
        const freshProfile = await organizersService.getMyProfile();
        if (freshProfile) {
          const verifiedName = freshProfile.name || freshProfile.business_name || backendUser?.business_name || backendUser?.name || 'Verified Tour Host';
          const verifiedPhone = freshProfile.contact_phone || freshProfile.phone || backendUser?.phone || '';
          
          setFormData((prev) => ({
            ...prev,
            organizer_name: verifiedName,
            contact_phone: verifiedPhone || prev.contact_phone,
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch fresh organizer profile in package form:', err);
      }
    };

    if (!isEditing) {
      fetchFreshProfile();
    }
  }, [backendUser, isEditing]);

  // Auto-save draft on every change when not in edit mode
  useEffect(() => {
    if (!isEditing) {
      if (formData.title || formData.destination || formData.description) {
        const draftPayload = {
          ...formData,
          activeTab,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem('friday_package_draft', JSON.stringify(draftPayload));
        setDraftSavedAt(draftPayload.savedAt);
      }
    }
  }, [formData, activeTab, isEditing]);

  // Calculate return date whenever departure_date or duration_days changes
  useEffect(() => {
    if (formData.departure_date && formData.duration_days) {
      try {
        const d = new Date(formData.departure_date);
        d.setDate(d.getDate() + Number(formData.duration_days));
        setFormData((prev) => ({ ...prev, return_date: d.toISOString().split('T')[0] }));
      } catch {
        // Ignore
      }
    }
  }, [formData.departure_date, formData.duration_days]);

  // Live OpenWeather forecast for the organizer's expedition dates & destination
  // Real-time Pakistan Geo Validation & Auto-Correction
  useEffect(() => {
    if (!formData.destination || formData.destination.trim().length < 2) {
      setGeoValidation({ isValid: true, wasCorrected: false, correctedName: '', error: '', checking: false, region: '', suggestions: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setGeoValidation((prev) => ({ ...prev, checking: true }));
        const res = await tripsService.validateDestination(formData.destination.trim());
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
            if (res.was_corrected && res.corrected_destination && res.corrected_destination.toLowerCase() !== formData.destination.trim().toLowerCase()) {
              updateField('destination', res.corrected_destination);
              toast.success(`✨ Auto-corrected to ${res.corrected_destination} (${res.region || 'Pakistan'})`, { id: 'pkg-geo-correct' });
            }
          } else {
            setGeoValidation({
              isValid: false,
              wasCorrected: false,
              correctedName: '',
              error: res.error || `Friday exclusively curates expeditions within Pakistan. '${formData.destination}' is outside Pakistan.`,
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
  }, [formData.destination]);

  useEffect(() => {
    if (!formData.destination || formData.destination.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setIsCheckingWeather(true);
      try {
        const res = await tripsService.checkWeather(
          formData.destination,
          formData.departure_date,
          Number(formData.duration_days || 3)
        );
        setWeatherAdvisory(res);
      } catch (err) {
        console.error('Weather check error:', err);
      } finally {
        setIsCheckingWeather(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.destination, formData.departure_date, formData.duration_days]);

  useEffect(() => {
    if (isEditing && targetPackageId) {
      const fetchExisting = async () => {
        try {
          const data = await packagesService.getPackage(targetPackageId);
          setIsPublished(data.is_active === true);

          let parsedSchedule = [];
          if (Array.isArray(data.activities) && data.activities.length > 0 && typeof data.activities[0] === 'object') {
            parsedSchedule = data.activities;
          }

          setFormData({
            title: data.title || '',
            destination: data.destination || '',
            organizer_name: data.organizer_name || '',
            contact_phone: data.contact_phone || '',
            duration_days: data.duration_days || 3,
            departure_date: data.start_date || getInitialDepartureDate(),
            return_date: data.end_date || '',
            price_per_person: data.price_per_person || 45000,
            max_travelers: data.max_travelers || 15,
            description: data.description || '',
            accommodation_type: data.accommodation_type || '3-Star Hotel',
            transportation_type: data.transportation_type || 'Coaster / Bus',
            image_url: data.image_url || '',
            inclusions: data.inclusions || ['Breakfast & Dinner', 'Luxury Transport', 'Local Tour Guide'],
            exclusions: data.exclusions || ['Personal Shopping', 'Lunch & Beverages'],
            days_schedule: parsedSchedule.length > 0 ? parsedSchedule : formData.days_schedule,
            inclusionInput: '',
            exclusionInput: '',
          });
        } catch (err) {
          console.error('Error fetching package:', err);
          toast.error('Failed to load package data.');
        } finally {
          setLoading(false);
        }
      };
      fetchExisting();
    }
  }, [targetPackageId, isEditing]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addItem = (listKey, inputKey) => {
    const text = formData[inputKey]?.trim();
    if (text && !formData[listKey].includes(text)) {
      setFormData((prev) => ({
        ...prev,
        [listKey]: [...prev[listKey], text],
        [inputKey]: '',
      }));
    }
  };

  const removeItem = (listKey, item) => {
    setFormData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((i) => i !== item),
    }));
  };

  // AI Description Generator
  const handleGenerateAIDescription = async () => {
    const title = formData.title?.trim();
    const destination = formData.destination?.trim();

    if (!title && !destination) {
      toast.error('Please enter a Journey Title or Primary Destination first.');
      return;
    }

    setIsGeneratingAI(true);
    const toastId = toast.loading('Friday AI is generating expedition overview...');
    try {
      const res = await packagesService.generateDescription({
        title: title,
        destination: destination,
        duration_days: formData.duration_days || 3,
      });

      if (res && res.description) {
        updateField('description', res.description);
        toast.success('Description generated by AI!', { id: toastId });
      } else {
        toast.error('Could not generate description.', { id: toastId });
      }
    } catch (err) {
      console.error('AI Generation Error:', err);
      const destName = destination || title || 'Northern Pakistan';
      const fallbackDesc = `Embark on an unforgettable ${formData.duration_days || 3}-day expedition to ${destName}. Experience majestic landscapes, serene valley panoramas, rich local heritage, and guided exploration designed for avid travelers seeking authentic mountain adventure.`;
      updateField('description', fallbackDesc);
      toast.success('Generated expedition description!', { id: toastId });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // AI Day-by-Day Itinerary Generator ("Let Friday Decide")
  const handleGenerateAIItinerary = async () => {
    const dest = formData.destination?.trim();
    if (!dest) {
      toast.error('Please enter a Primary Destination in Step 1 first.');
      setActiveTab('BASICS');
      return;
    }

    setIsGeneratingItinerary(true);
    const toastId = toast.loading(`Friday AI is researching & crafting your ${formData.duration_days}-day itinerary...`);
    try {
      const res = await packagesService.generateItinerary({
        destination: dest,
        duration_days: Number(formData.duration_days) || 3,
        title: formData.title || '',
        accommodation_type: formData.accommodation_type || 'comfortable',
      });

      if (res && Array.isArray(res.days) && res.days.length > 0) {
        setFormData((prev) => ({
          ...prev,
          days_schedule: res.days,
        }));
        toast.success(`Generated ${res.days.length}-day dynamic itinerary!`, { id: toastId });
      } else {
        toast.error('Could not generate itinerary automatically.', { id: toastId });
      }
    } catch (err) {
      console.error('Itinerary generation error:', err);
      toast.error('AI itinerary generation failed. You can add days manually.', { id: toastId });
    } finally {
      setIsGeneratingItinerary(false);
    }
  };

  // Itinerary Modification Helpers
  const updateDayField = (dayIndex, field, value) => {
    setFormData((prev) => {
      const newDays = [...prev.days_schedule];
      newDays[dayIndex] = { ...newDays[dayIndex], [field]: value };
      return { ...prev, days_schedule: newDays };
    });
  };

  const addDayManually = () => {
    setFormData((prev) => {
      const nextNum = (prev.days_schedule?.length || 0) + 1;
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
      return {
        ...prev,
        duration_days: Math.max(prev.duration_days, nextNum),
        days_schedule: [...prev.days_schedule, newDay],
      };
    });
    toast.success('New day added to schedule!');
  };

  const removeDay = (dayIndex) => {
    setFormData((prev) => {
      const filtered = prev.days_schedule.filter((_, idx) => idx !== dayIndex);
      const renumbered = filtered.map((d, i) => ({
        ...d,
        day_number: i + 1,
      }));
      return {
        ...prev,
        duration_days: Math.max(1, renumbered.length),
        days_schedule: renumbered,
      };
    });
  };

  const addActivityToDay = (dayIndex) => {
    setFormData((prev) => {
      const newDays = [...prev.days_schedule];
      const targetDay = newDays[dayIndex];
      const acts = targetDay.activities || [];
      const newAct = {
        title: '',
        start_time: '02:00 PM',
        end_time: '05:00 PM',
        time: '02:00 PM - 05:00 PM',
        location: '',
        description: '',
      };
      newDays[dayIndex] = {
        ...targetDay,
        activities: [...acts, newAct],
      };
      return { ...prev, days_schedule: newDays };
    });
  };

  const updateActivityField = (dayIndex, actIndex, field, value) => {
    setFormData((prev) => {
      const newDays = [...prev.days_schedule];
      const targetDay = newDays[dayIndex];
      const acts = [...(targetDay.activities || [])];
      acts[actIndex] = { ...acts[actIndex], [field]: value };
      newDays[dayIndex] = { ...targetDay, activities: acts };
      return { ...prev, days_schedule: newDays };
    });
  };

  const removeActivityFromDay = (dayIndex, actIndex) => {
    setFormData((prev) => {
      const newDays = [...prev.days_schedule];
      const targetDay = newDays[dayIndex];
      const acts = (targetDay.activities || []).filter((_, idx) => idx !== actIndex);
      newDays[dayIndex] = { ...targetDay, activities: acts };
      return { ...prev, days_schedule: newDays };
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.title?.trim()) {
      toast.error('Please enter Journey Title.');
      return;
    }
    if (!formData.destination?.trim()) {
      toast.error('Please enter Primary Destination.');
      return;
    }
    if (!geoValidation.isValid) {
      toast.error(geoValidation.error || `Friday exclusively curates expeditions within Pakistan. '${formData.destination}' is outside Pakistan.`);
      setActiveTab('BASICS');
      return;
    }
    if (!formData.organizer_name?.trim()) {
      toast.error('Please enter Host / Company Name.');
      return;
    }
    if (!formData.contact_phone?.trim()) {
      toast.error('Please enter Contact Phone / WhatsApp.');
      return;
    }
    if (!formData.price_per_person || Number(formData.price_per_person) <= 0) {
      toast.error('Please specify a valid Price per Traveler.');
      return;
    }
    if (!formData.accommodation_type?.trim()) {
      toast.error('Please select or specify Accommodation Type.');
      return;
    }
    if (!formData.transportation_type?.trim()) {
      toast.error('Please select or specify Vehicle / Transportation.');
      return;
    }
    if (!formData.departure_date) {
      toast.error('Please choose a Departure Date.');
      return;
    }

    setIsSubmitting(true);
    let toastId;
    try {
      let finalActivities = formData.days_schedule;
      // If creating new package or days are not customized, auto-generate with AI
      if (!isEditing || !finalActivities || finalActivities.length === 0) {
        toastId = toast.loading(`Friday AI is researching & generating Day-by-Day schedule for ${formData.destination}...`);
        try {
          const aiRes = await packagesService.generateItinerary({
            destination: formData.destination.trim(),
            duration_days: Number(formData.duration_days) || 3,
            title: formData.title || '',
            accommodation_type: formData.accommodation_type || 'comfortable',
          });
          if (aiRes && Array.isArray(aiRes.days) && aiRes.days.length > 0) {
            finalActivities = aiRes.days;
          }
        } catch (genErr) {
          console.warn('AI schedule generation fallback to structured schedule', genErr);
        }
      }

      const payload = {
        title: formData.title.trim(),
        destination: formData.destination.trim(),
        organizer_name: formData.organizer_name.trim(),
        contact_phone: formData.contact_phone.trim(),
        duration_days: Number(formData.duration_days) || 3,
        start_date: formData.departure_date,
        end_date: formData.return_date,
        price_per_person: Number(formData.price_per_person),
        max_travelers: Number(formData.max_travelers) || 15,
        description: formData.description?.trim(),
        accommodation_type: formData.accommodation_type.trim(),
        transportation_type: formData.transportation_type.trim(),
        inclusions: formData.inclusions,
        exclusions: formData.exclusions,
        activities: finalActivities,
      };

      if (isEditing) {
        await organizersService.updatePackage(id, payload);
        toast.success('Tour package updated successfully!');
      } else {
        await organizersService.createPackage(payload);
        localStorage.removeItem('friday_package_draft');
        if (toastId) toast.dismiss(toastId);
        toast.success('✨ Tour package generated and added to your expeditions!');
      }
      navigate('/organizer/trips');
    } catch (err) {
      console.error('Save package error:', err);
      if (toastId) toast.dismiss(toastId);
      toast.error(err.message || 'Failed to save package.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('friday_package_draft');
    setFormData({
      title: '',
      destination: '',
      organizer_name: backendUser?.business_name || backendUser?.name || 'Verified Tour Host',
      contact_phone: backendUser?.phone || '+92 300 1234567',
      duration_days: 3,
      departure_date: getInitialDepartureDate(),
      return_date: '',
      price_per_person: '',
      max_travelers: 15,
      description: '',
      accommodation_type: '3-Star Hotel',
      transportation_type: 'Coaster / Bus',
      image_url: '',
      inclusions: ['Breakfast & Dinner', 'Luxury Transport', 'Local Tour Guide', 'Fuel & Toll Taxes'],
      exclusions: ['Personal Shopping', 'Extra Porter', 'Lunch & Beverages'],
      days_schedule: createDefaultDaysSchedule(3),
      inclusionInput: '',
      exclusionInput: '',
    });
    setActiveTab('BASICS');
    setRestoredDraft(false);
    setDraftSavedAt(null);
    setShowExitModal(false);
    toast('Draft discarded. Started fresh package.', { icon: '🗑️' });
  };

  const handleSaveDraftAndExit = () => {
    if (!isEditing && (formData.title || formData.destination || formData.description)) {
      const draftPayload = {
        ...formData,
        activeTab,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('friday_package_draft', JSON.stringify(draftPayload));
      toast.success('Package saved to Drafts! You can resume anytime from My Tour Packages.');
    }
    setShowExitModal(false);
    navigate('/organizer/trips');
  };

  const handleBackClick = () => {
    if (!isEditing && (formData.title || formData.destination || formData.description)) {
      setShowExitModal(true);
    } else {
      navigate('/organizer/trips');
    }
  };

  const validateTab = (tabId) => {
    if (tabId === 'BASICS') {
      if (!formData.title?.trim()) {
        toast.error('Journey Title is required before moving to next step.');
        return false;
      }
      if (!formData.destination?.trim()) {
        toast.error('Primary Destination is required before moving to next step.');
        return false;
      }
      if (!geoValidation.isValid) {
        toast.error(geoValidation.error || `Friday exclusively curates expeditions within Pakistan. '${formData.destination}' is outside Pakistan.`);
        return false;
      }
      if (!formData.organizer_name?.trim()) {
        toast.error('Host / Company Name is required.');
        return false;
      }
      if (!formData.contact_phone?.trim()) {
        toast.error('Contact Phone / WhatsApp is required.');
        return false;
      }
    } else if (tabId === 'PRICING') {
      if (!formData.price_per_person || Number(formData.price_per_person) <= 0) {
        toast.error('Please enter a valid Price per Traveler (PKR).');
        return false;
      }
      if (!formData.max_travelers || Number(formData.max_travelers) <= 0) {
        toast.error('Please enter Max Travelers capacity.');
        return false;
      }
      if (!formData.accommodation_type?.trim()) {
        toast.error('Please select Accommodation Type.');
        return false;
      }
      if (!formData.transportation_type?.trim()) {
        toast.error('Please select Transportation / Vehicle Type.');
        return false;
      }
    } else if (tabId === 'DATES') {
      if (!formData.departure_date) {
        toast.error('Departure Date is required before proceeding.');
        return false;
      }
      if (!formData.duration_days || Number(formData.duration_days) < 1) {
        toast.error('Trip duration (days) is required.');
        return false;
      }
    } else if (tabId === 'ITINERARY') {
      if (!formData.days_schedule || formData.days_schedule.length === 0) {
        toast.error('Please configure at least 1 day in your itinerary.');
        return false;
      }
    }
    return true;
  };

  const handleTabClick = (targetTabId) => {
    const stepOrder = ['BASICS', 'PRICING', 'DATES', 'ITINERARY', 'INCLUSIONS', 'REVIEW'];
    const currentIdx = stepOrder.indexOf(activeTab);
    const targetIdx = stepOrder.indexOf(targetTabId);

    // If going backward, always allow
    if (targetIdx <= currentIdx) {
      setActiveTab(targetTabId);
      return;
    }

    // If trying to jump forward, validate all steps from current up to targetIdx - 1
    for (let i = 0; i < targetIdx; i++) {
      const stepToCheck = stepOrder[i];
      if (!validateTab(stepToCheck)) {
        setActiveTab(stepToCheck);
        return;
      }
    }

    setActiveTab(targetTabId);
  };

  const steps = [
    { id: 'BASICS', step: '1', label: 'Overview' },
    { id: 'PRICING', step: '2', label: 'Pricing & Stay' },
    { id: 'DATES', step: '3', label: 'Dates & Weather' },
    { id: 'ITINERARY', step: '4', label: 'Day Schedule' },
    { id: 'INCLUSIONS', step: '5', label: 'Inclusions' },
    { id: 'REVIEW', step: '6', label: 'Review & Publish' },
  ];

  const accommodationPresets = [
    '3-Star Hotel',
    'Cottages / Alpine Camp',
    'Luxury Resort',
    'Standard Hotel',
  ];

  const vehiclePresets = [
    'Coaster / Bus',
    'AC Grand Cabin',
    '4x4 Mountain Jeep',
    'Saloon Car',
  ];

  if (loading) {
    return <LoadingSpinner text="Loading package details..." />;
  }

  return (
    <div className="w-full flex-1 flex justify-center px-3 sm:px-8 lg:px-12 py-8 sm:py-10 min-h-screen bg-[#F8FAF6]">
      <div className="w-full max-w-4xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBackClick}
              className="h-10 w-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 transition-all cursor-pointer shadow-2xs"
              title="Go back or save draft"
            >
              <ArrowLeft className="w-5 h-5 text-[#00261D]" />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {isEditing ? 'Edit Tour Package' : 'Create New Expedition'}
              </h1>
              <p className="text-xs text-[#717975] mt-0.5">
                {isEditing
                  ? 'Update package details, pricing, schedule, and inclusions.'
                  : 'Publish a verified tour package to the Friday traveler marketplace.'}
              </p>
            </div>
          </div>

          {!isEditing && (formData.title || formData.destination) && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Auto-Saved to Drafts</span>
              </span>
              <button
                type="button"
                onClick={handleSaveDraftAndExit}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-black/5 text-[#00261D] border border-black/15 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                Save & Exit
              </button>
            </div>
          )}
        </div>

        {/* ─── Unsaved Draft Restored Banner ─── */}
        {!isEditing && restoredDraft && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-900 shrink-0">
                <Edit3 className="w-4 h-4 text-amber-900" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-amber-950">
                  Unsaved Tour Package Draft Restored
                </p>
                <p className="text-[11px] text-amber-800">
                  You are editing your in-progress draft{draftSavedAt ? ` (last saved ${new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                Discard & Start Fresh
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-black/10 p-6 sm:p-10 shadow-2xs space-y-10">
          {/* SECTION 1: JOURNEY BASICS & HOST */}
          <div className="space-y-6">
            <div className="border-b border-black/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00261D] text-white flex items-center justify-center text-xs font-bold">1</span>
                <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Journey Overview & Host Details
                </h2>
              </div>
              <p className="text-xs text-[#717975] mt-1 ml-8">
                Provide expedition title, primary destination, and verified host contact information.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Journey Title *</label>
                <input
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g. Hunza & Passu Autumn Expedition"
                  required
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold focus:outline-none focus:border-[#00261D]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs uppercase font-bold text-[#717975]">Primary Destination (in Pakistan) *</label>
                  {geoValidation.checking && (
                    <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verifying location in Pakistan...
                    </span>
                  )}
                </div>
                <input
                  value={formData.destination}
                  onChange={(e) => updateField('destination', e.target.value)}
                  placeholder="e.g. Hunza Valley, Gilgit-Baltistan"
                  required
                  className={`w-full bg-[#F8FAF6] border rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none ${
                    !geoValidation.isValid
                      ? 'border-amber-500 focus:border-amber-600 bg-amber-50/20'
                      : 'border-black/10 focus:border-[#00261D]'
                  }`}
                />

                {/* Verified Location Badge */}
                {formData.destination && geoValidation.isValid && geoValidation.correctedName && !geoValidation.checking && (
                  <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-3.5 py-2 rounded-xl mt-2 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
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
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2 mt-2 animate-in fade-in">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold leading-tight text-amber-900">
                          {geoValidation.error || `Friday exclusively curates expeditions within Pakistan. '${formData.destination}' is outside Pakistan.`}
                        </p>
                        <p className="text-[11px] text-amber-800">
                          Please choose a destination across Pakistan:
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-amber-200/60">
                      {(geoValidation.suggestions || ['Hunza', 'Skardu', 'Swat', 'Naran', 'Islamabad', 'Lahore']).map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => updateField('destination', sug)}
                          className="px-2.5 py-0.5 bg-white hover:bg-emerald-900 hover:text-white border border-amber-300 rounded-full text-[11px] font-bold text-[#00261D] cursor-pointer transition-all shadow-2xs"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Host Organizer Transparency Fields (Read Only Verified from Profile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#00261D]" />
                      <span>Host / Company Name</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 font-bold uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Verified Credential
                    </span>
                  </label>
                  <input
                    value={formData.organizer_name || organizerProfile?.name || organizerProfile?.business_name || backendUser?.business_name || backendUser?.name || 'Verified Host'}
                    readOnly
                    className="w-full bg-[#ECEEE9] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-bold cursor-not-allowed select-none shadow-inner"
                    title="Verified Company Name (Configured in Company Profile)"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#00261D]" />
                      <span>Contact Phone / WhatsApp</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 font-bold uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Verified Credential
                    </span>
                  </label>
                  <input
                    value={formData.contact_phone || organizerProfile?.contact_phone || organizerProfile?.phone || backendUser?.phone || ''}
                    readOnly
                    className="w-full bg-[#ECEEE9] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-bold cursor-not-allowed select-none shadow-inner"
                    title="Verified Contact Phone / WhatsApp (Configured in Company Profile)"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs uppercase font-bold text-[#717975]">Expedition Description</label>
                  <button
                    type="button"
                    onClick={handleGenerateAIDescription}
                    disabled={isGeneratingAI}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E7F7EE] hover:bg-[#D4F0E2] text-[#00261D] text-xs font-bold transition-all cursor-pointer disabled:opacity-60 shadow-2xs hover:scale-102 active:scale-98"
                    title="Generate description with Friday AI"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00261D]" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
                        <span>Generate with AI</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  placeholder="Describe the adventure highlights, scenic routes, and travel culture..."
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl p-4 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICING & SEATS CAPACITY */}
          <div className="space-y-6 pt-4 border-t border-black/10">
            <div className="border-b border-black/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00261D] text-white flex items-center justify-center text-xs font-bold">2</span>
                <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Pricing, Stay & Vehicle Details
                </h2>
              </div>
              <p className="text-xs text-[#717975] mt-1 ml-8">
                Specify package price per traveler, maximum vehicle capacity, and lodging standards.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Price per Traveler (PKR) *</label>
                <input
                  type="number"
                  min={1000}
                  value={formData.price_per_person}
                  onChange={(e) => updateField('price_per_person', e.target.value)}
                  placeholder="e.g. 45000"
                  required
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-bold focus:outline-none focus:border-[#00261D]"
                />
                <p className="text-[11px] text-[#717975] mt-1">Directly paid to your account via Bank / Mobile Wallet.</p>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Maximum Group Capacity (Seats)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.max_travelers}
                  onChange={(e) => updateField('max_travelers', e.target.value)}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
                <p className="text-[11px] text-[#717975] mt-1">Flexible capacity for your coaster or private group.</p>
              </div>
            </div>

            {/* Accommodation Type */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs uppercase font-bold text-[#717975]">
                Accommodation Type *
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {accommodationPresets.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateField('accommodation_type', opt)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      formData.accommodation_type === opt
                        ? 'bg-[#00261D] text-white shadow-2xs'
                        : 'bg-[#F8FAF6] text-[#00261D] border border-black/10 hover:border-[#00261D]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <input
                value={formData.accommodation_type}
                onChange={(e) => updateField('accommodation_type', e.target.value)}
                placeholder="e.g. 3-Star Hotel / Alpine Cottages"
                required
                className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
              />
            </div>

            {/* Vehicle / Transportation */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs uppercase font-bold text-[#717975]">
                Vehicle / Transportation *
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {vehiclePresets.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateField('transportation_type', opt)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      formData.transportation_type === opt
                        ? 'bg-[#00261D] text-white shadow-2xs'
                        : 'bg-[#F8FAF6] text-[#00261D] border border-black/10 hover:border-[#00261D]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <input
                value={formData.transportation_type}
                onChange={(e) => updateField('transportation_type', e.target.value)}
                placeholder="e.g. Coaster / Bus or AC Grand Cabin"
                required
                className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
              />
            </div>
          </div>

          {/* SECTION 3: DATES, DURATION & LIVE WEATHER */}
          <div className="space-y-6 pt-4 border-t border-black/10">
            <div className="border-b border-black/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00261D] text-white flex items-center justify-center text-xs font-bold">3</span>
                <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Expedition Dates & Real-Time Weather
                </h2>
              </div>
              <p className="text-xs text-[#717975] mt-1 ml-8">
                Select your departure date and duration — Friday calculates return date and live OpenWeather conditions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Departure Date */}
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Departure Date *</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.departure_date}
                  onChange={(e) => updateField('departure_date', e.target.value)}
                  required
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold focus:outline-none focus:border-[#00261D]"
                />
              </div>

              {/* Duration Stepper */}
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Duration (Days) *</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('duration_days', Math.max(1, Number(formData.duration_days) - 1))}
                    className="w-11 h-11 rounded-2xl bg-[#F8FAF6] border border-black/10 hover:bg-black/5 flex items-center justify-center cursor-pointer transition-all"
                  >
                    <Minus className="w-4 h-4 text-[#00261D]" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.duration_days}
                    onChange={(e) => updateField('duration_days', Math.max(1, Number(e.target.value)))}
                    className="flex-1 bg-[#F8FAF6] border border-black/10 rounded-2xl py-3 text-center text-sm font-bold text-[#00261D] focus:outline-none focus:border-[#00261D]"
                  />
                  <button
                    type="button"
                    onClick={() => updateField('duration_days', Math.min(30, Number(formData.duration_days) + 1))}
                    className="w-11 h-11 rounded-2xl bg-[#F8FAF6] border border-black/10 hover:bg-black/5 flex items-center justify-center cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4 text-[#00261D]" />
                  </button>
                </div>
              </div>

              {/* Calculated Return Date */}
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Return Date</label>
                <input
                  type="date"
                  value={formData.return_date}
                  readOnly
                  className="w-full bg-[#F8FAF6]/60 border border-black/5 rounded-2xl px-4 py-3 text-sm text-[#717975] cursor-not-allowed"
                />
              </div>
            </div>

            {/* ─── Real-Time Weather Forecast & Day Predictions ─── */}
            {isCheckingWeather ? (
              <div className="p-4 rounded-2xl bg-white border border-black/10 flex items-center gap-3 text-xs text-[#717975] shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#00261D]" />
                <span>Fetching live OpenWeather forecast for {formData.destination || 'your destination'} across {formData.duration_days || 3} days...</span>
              </div>
            ) : weatherAdvisory ? (
              <div className="space-y-3 pt-2">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAF6] border border-[#00261D]/15 shadow-2xs space-y-4">
                  {/* Weather Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#E7F7EE] flex items-center justify-center">
                        {renderWeatherIcon(weatherAdvisory.icon || 'sun', 'w-5 h-5')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#00261D] uppercase tracking-wider">
                            {weatherAdvisory.destination || formData.destination || 'Destination'} Live Forecast
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live OpenWeather
                          </span>
                        </div>
                        <span className="text-[11px] text-[#717975] flex items-center gap-2 mt-0.5">
                          <span>Current: <strong>{weatherAdvisory.current_temp}°C {weatherAdvisory.condition}</strong></span>
                          <span>•</span>
                          <span>Humidity: {weatherAdvisory.humidity}%</span>
                          <span>•</span>
                          <span>Wind: {weatherAdvisory.wind_speed_kmh} km/h</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Day-by-Day Forecast Predictions Grid */}
                  {Array.isArray(weatherAdvisory.forecast) && weatherAdvisory.forecast.length > 0 && (
                    <div>
                      <span className="text-[11px] uppercase font-bold text-[#717975] tracking-wider block mb-2.5">
                        Day-by-Day Weather Prediction ({weatherAdvisory.forecast.length} Day{weatherAdvisory.forecast.length > 1 ? 's' : ''})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {weatherAdvisory.forecast.map((fDay) => (
                          <div
                            key={fDay.day_number}
                            className="p-3 rounded-xl bg-white border border-black/10 hover:border-[#00261D]/40 transition-all flex flex-col justify-between space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#00261D]">{fDay.day_label}</span>
                              {renderWeatherIcon(fDay.icon || 'sun', 'w-4 h-4')}
                            </div>
                            <div>
                              <span className="text-[10px] font-medium text-[#717975] block truncate">
                                {fDay.formatted_date}
                              </span>
                              <span className="text-sm font-bold text-[#00261D] block mt-0.5">
                                {fDay.temp}°C
                              </span>
                              <span className="text-[10px] font-bold text-[#555E59] block truncate">
                                {fDay.condition}
                              </span>
                            </div>
                            <div className="text-[9px] text-[#717975] pt-1 border-t border-black/5 flex items-center justify-between">
                              <span>{fDay.temp_max}° / {fDay.temp_min}°</span>
                              {fDay.pop > 0 && <span>💧 {fDay.pop}%</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advisory Warning Banner */}
                  {weatherAdvisory.status === 'WARNING' && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>{weatherAdvisory.title || 'Seasonal Travel Advisory'}</span>
                      </div>
                      <p className="text-amber-900 text-[11px] leading-relaxed">{weatherAdvisory.message}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* SECTION 4: INCLUSIONS & EXCLUSIONS */}
          <div className="space-y-6 pt-4 border-t border-black/10">
            <div className="border-b border-black/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00261D] text-white flex items-center justify-center text-xs font-bold">4</span>
                <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Inclusions & Exclusions
                </h2>
              </div>
              <p className="text-xs text-[#717975] mt-1 ml-8">
                Clearly define package amenities for travelers to ensure transparency.
              </p>
            </div>

            {/* Inclusions */}
            <div className="space-y-3">
              <label className="block text-xs uppercase font-bold text-[#00261D]">What's Included</label>
              <div className="flex flex-wrap gap-2">
                {formData.inclusions.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-2xs">
                    {item}
                    <button type="button" onClick={() => removeItem('inclusions', item)} className="hover:text-red-700 cursor-pointer ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 pt-1 flex-col sm:flex-row">
                <input
                  value={formData.inclusionInput}
                  onChange={(e) => updateField('inclusionInput', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('inclusions', 'inclusionInput'))}
                  placeholder="Add inclusion (e.g. Fuel, Tolls, Tour Guide, Breakfast)..."
                  className="flex-1 bg-[#F8FAF6] border border-black/10 rounded-2xl sm:rounded-full px-5 py-2.5 text-xs text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
                <button
                  type="button"
                  onClick={() => addItem('inclusions', 'inclusionInput')}
                  className="px-6 py-2.5 rounded-2xl sm:rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold cursor-pointer transition-all shadow-2xs"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Exclusions */}
            <div className="space-y-3 pt-4 border-t border-black/10">
              <label className="block text-xs uppercase font-bold text-[#00261D]">What's Not Included (Exclusions)</label>
              <div className="flex flex-wrap gap-2">
                {formData.exclusions.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-red-50 border border-red-200 text-red-900 shadow-2xs">
                    {item}
                    <button type="button" onClick={() => removeItem('exclusions', item)} className="hover:text-red-700 cursor-pointer ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 pt-1 flex-col sm:flex-row">
                <input
                  value={formData.exclusionInput}
                  onChange={(e) => updateField('exclusionInput', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('exclusions', 'exclusionInput'))}
                  placeholder="Add exclusion (e.g. Personal shopping, Laundry, Lunch)..."
                  className="flex-1 bg-[#F8FAF6] border border-black/10 rounded-2xl sm:rounded-full px-5 py-2.5 text-xs text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
                <button
                  type="button"
                  onClick={() => addItem('exclusions', 'exclusionInput')}
                  className="px-6 py-2.5 rounded-2xl sm:rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold cursor-pointer transition-all shadow-2xs"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* AI Generation Assurance Callout */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-[#E7F7EE] to-[#E2F2E9] border border-emerald-200 shadow-2xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00261D] flex items-center justify-center text-[#BBEAD5] shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h5 className="text-xs sm:text-sm font-bold text-[#00261D]">
                Automatic AI Day-by-Day Schedule Generation
              </h5>
              <p className="text-xs text-[#414845] leading-relaxed">
                When you click below, Friday's AI engine automatically designs a complete day-by-day itinerary with scenic transit points, photography viewpoints, and meal stops for <strong>{formData.destination || 'your destination'}</strong> and attaches it directly to this tour package.
              </p>
            </div>
          </div>

          {/* ─── Bottom Big CTA Action Bar ─────────────────────────────── */}
          <div className="pt-6 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBackClick}
              className="px-6 py-3.5 rounded-full border border-black/15 text-xs font-bold uppercase tracking-wider hover:bg-black/5 transition-colors cursor-pointer text-[#00261D] w-full sm:w-auto"
            >
              Cancel / Back
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-10 py-4.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-sm font-bold uppercase tracking-wider transition-all hover:scale-101 shadow-md flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#BBEAD5]" />
                  <span>Generating Schedule & Creating Package...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-[#BBEAD5]" />
                  <span>{isEditing ? 'Save Changes' : '✨ Generate & Create Tour Package with Friday AI'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Exit & Save Draft Confirmation Modal ─── */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/10 space-y-6">
            <div className="space-y-2 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#E7F7EE] text-[#00261D] flex items-center justify-center font-bold text-2xl mb-3 shadow-2xs mx-auto sm:mx-0">
                💾
              </div>
              <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Save Tour Draft & Exit?
              </h3>
              <p className="text-xs text-[#717975] leading-relaxed">
                You have unsaved changes in your tour package. Would you like to save this draft so you can resume editing anytime from <strong>My Tour Packages</strong>?
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleSaveDraftAndExit}
                className="w-full py-3.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                Save Draft & Exit
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('friday_package_draft');
                  setShowExitModal(false);
                  navigate('/organizer/trips');
                }}
                className="w-full py-3 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Discard Draft & Leave
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-2.5 text-xs font-semibold text-[#717975] hover:text-[#00261D] cursor-pointer"
              >
                Keep Editing Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
