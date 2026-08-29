import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, X, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { organizersService } from '../../services/organizers';
import { packagesService } from '../../services/packages';
import ImageUpload from '../../components/shared/ImageUpload';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function PackageFormPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('BASICS'); // BASICS, PRICING, INCLUSIONS, MEDIA

  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    duration_days: 3,
    price_per_person: '',
    max_travelers: 15,
    description: '',
    accommodation_type: '',
    transportation_type: '',
    image_url: '',
    inclusions: [],
    exclusions: [],
    activities: [],
    inclusionInput: '',
    exclusionInput: '',
    activityInput: '',
  });

  useEffect(() => {
    if (isEditing) {
      const fetchExisting = async () => {
        try {
          const data = await packagesService.getPackage(id);
          setFormData({
            title: data.title || '',
            destination: data.destination || '',
            duration_days: data.duration_days || 5,
            price_per_person: data.price_per_person || 45000,
            max_travelers: data.max_travelers || 20,
            description: data.description || '',
            accommodation_type: data.accommodation_type || '',
            transportation_type: data.transportation_type || '',
            image_url: data.image_url || '',
            inclusions: data.inclusions || [],
            exclusions: data.exclusions || [],
            activities: data.activities || [],
            inclusionInput: '',
            exclusionInput: '',
            activityInput: '',
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
  }, [id, isEditing]);

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

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.title || !formData.destination || !formData.price_per_person) {
      toast.error('Please fill in required fields (Title, Destination, Price).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        destination: formData.destination,
        duration_days: Number(formData.duration_days),
        price_per_person: Number(formData.price_per_person),
        max_travelers: Number(formData.max_travelers),
        description: formData.description,
        accommodation_type: formData.accommodation_type,
        transportation_type: formData.transportation_type,
        image_url: formData.image_url || '/images/stitch/hero_mountains.jpg',
        inclusions: formData.inclusions,
        exclusions: formData.exclusions,
        activities: formData.activities,
      };

      if (isEditing) {
        await organizersService.updatePackage(id, payload);
        toast.success('Tour package updated successfully!');
      } else {
        await organizersService.createPackage(payload);
        toast.success('New tour package published successfully!');
      }
      navigate('/organizer/trips');
    } catch (err) {
      console.error('Save package error:', err);
      toast.error(err.message || 'Failed to save package.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading package details..." />;
  }

  const tabs = ['BASICS', 'PRICING', 'INCLUSIONS', 'MEDIA'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-black/10 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#420E00] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            ORGANIZER WORKSPACE / PACKAGE BUILDER
          </p>
          <h1
            className="text-3xl sm:text-5xl font-normal text-[#00261D] italic leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {isEditing ? 'Refine your journey.' : 'Build a journey worth taking.'}
          </h1>
        </div>

        <Link to="/organizer/trips">
          <button className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 transition-colors cursor-pointer text-[#00261D]" title="Cancel">
            <X className="w-5 h-5" />
          </button>
        </Link>
      </header>

      {/* ─── Navigation Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-6 border-b border-black/10 pb-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`text-xs font-bold uppercase tracking-wider transition-all pb-2 cursor-pointer ${
              activeTab === tab
                ? 'text-[#00261D] border-b-2 border-[#00261D]'
                : 'text-[#717975] hover:text-[#00261D]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Form Container ──────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-black/10 p-6 sm:p-12 shadow-2xs space-y-8">
        {/* TAB 1: BASICS */}
        {activeTab === 'BASICS' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Journey Overview & Destination
            </h2>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Primary Destination *</label>
                  <input
                    value={formData.destination}
                    onChange={(e) => updateField('destination', e.target.value)}
                    placeholder="e.g. Hunza Valley, Gilgit-Baltistan"
                    required
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Duration (Days) *</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.duration_days}
                    onChange={(e) => updateField('duration_days', e.target.value)}
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-bold focus:outline-none focus:border-[#00261D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Expedition Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={4}
                  placeholder="Describe the adventure highlights, scenic routes, and travel culture..."
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl p-4 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRICING */}
        {activeTab === 'PRICING' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Pricing & Maximum Group Capacity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Price per Traveler (PKR) *</label>
                <input
                  type="number"
                  min={1000}
                  value={formData.price_per_person}
                  onChange={(e) => updateField('price_per_person', e.target.value)}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-bold focus:outline-none focus:border-[#00261D]"
                />
                <p className="text-[11px] text-[#717975] mt-1">Directly paid to your account via Bank / Mobile Wallet.</p>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Maximum Traveler Seats</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.max_travelers}
                  onChange={(e) => updateField('max_travelers', e.target.value)}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
                <p className="text-[11px] text-[#717975] mt-1">Set any capacity suitable for your coaster or group.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Accommodation Type</label>
                <input
                  value={formData.accommodation_type}
                  onChange={(e) => updateField('accommodation_type', e.target.value)}
                  placeholder="e.g. Standard 3-Star Hotels / Alpine Cottages"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Vehicle / Transportation</label>
                <input
                  value={formData.transportation_type}
                  onChange={(e) => updateField('transportation_type', e.target.value)}
                  placeholder="e.g. AC Grand Cabin / Saloon Coaster"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INCLUSIONS */}
        {activeTab === 'INCLUSIONS' && (
          <div className="space-y-8 animate-in fade-in">
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
        )}

        {/* TAB 4: MEDIA & PUBLISH */}
        {activeTab === 'MEDIA' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Cover Image & Final Confirmation
            </h2>

            <ImageUpload
              value={formData.image_url}
              onChange={(url) => updateField('image_url', url)}
              label="Tour Package Hero Cover Image"
            />
          </div>
        )}

        {/* ─── Footer Action Bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-black/10 flex-wrap gap-3">
          <div>
            {tabs.indexOf(activeTab) > 0 ? (
              <button
                type="button"
                onClick={() => setActiveTab(tabs[tabs.indexOf(activeTab) - 1])}
                className="px-6 py-3 rounded-full border border-black/15 text-xs font-bold uppercase tracking-wider hover:bg-black/5 transition-colors cursor-pointer text-[#00261D]"
              >
                Previous Section
              </button>
            ) : <div />}
          </div>

          <div className="flex gap-3">
            {tabs.indexOf(activeTab) < tabs.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveTab(tabs[tabs.indexOf(activeTab) + 1])}
                className="px-8 py-3.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all hover:scale-101 shadow-xs cursor-pointer"
              >
                Next Section &rarr;
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-4 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all hover:scale-101 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-[#BBEAD5]" />}
                <span>{isEditing ? 'Save Changes' : 'Publish Journey to Marketplace'}</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
