import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Bus,
  Award,
  CreditCard,
  CheckCircle2,
  Loader2,
  Plus,
  X,
  AlertCircle,
  ShieldCheck,
  Wallet,
  Check,
  Share2,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { organizersService } from '../../services/organizers';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const { organizerProfile, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialWalletType = organizerProfile?.payment_wallet_type || 'JazzCash';
  const isPresetWallet = ['JazzCash', 'Easypaisa', 'SadaPay', 'NayaPay'].includes(initialWalletType);

  const [formData, setFormData] = useState({
    // Section 1: Business & Identity (Mandatory)
    lead_name: organizerProfile?.lead_name || '',
    cnic: organizerProfile?.cnic || '',
    name: organizerProfile?.name || '',
    contact_phone: organizerProfile?.contact_phone || '',
    location: organizerProfile?.location || '',
    description: organizerProfile?.description || '',
    website: organizerProfile?.website || '', // Used for Social Media Profile

    // Section 2: Destinations (Optional)
    destinations: organizerProfile?.destinations || [],
    destinationInput: '',

    // Section 3: Fleet & Experience (Experience MUST, Fleet optional)
    number_of_buses: organizerProfile?.number_of_buses || '',
    vehicle_capacity: organizerProfile?.vehicle_capacity || '',
    maximum_group_size: organizerProfile?.maximum_group_size || 20,
    experience_years: organizerProfile?.experience_years || 2,
    experience_description: organizerProfile?.experience_description || '',

    // Section 4: Payments (Bank OR Mobile Wallet MUST)
    payment_method: organizerProfile?.payment_wallet_type && organizerProfile.payment_wallet_type !== 'BANK' ? 'WALLET' : 'BANK',
    payment_wallet_type: isPresetWallet ? initialWalletType : (organizerProfile?.payment_wallet_type ? 'OTHER' : 'JazzCash'),
    custom_wallet_name: !isPresetWallet && organizerProfile?.payment_wallet_type && organizerProfile.payment_wallet_type !== 'BANK' ? organizerProfile.payment_wallet_type : '',
    payment_bank_name: organizerProfile?.payment_bank_name || '',
    payment_account_title: organizerProfile?.payment_account_title || '',
    payment_account_number: organizerProfile?.payment_account_number || '',
    payment_instructions: organizerProfile?.payment_instructions || '',
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addDestination = () => {
    const clean = formData.destinationInput.trim();
    if (clean && !formData.destinations.includes(clean)) {
      setFormData((prev) => ({
        ...prev,
        destinations: [...prev.destinations, clean],
        destinationInput: '',
      }));
    }
  };

  const removeDestination = (dest) => {
    setFormData((prev) => ({
      ...prev,
      destinations: prev.destinations.filter((d) => d !== dest),
    }));
  };

  // Section Validation Checks
  const isSection1Complete = Boolean(
    formData.lead_name.trim() &&
    formData.cnic.trim() &&
    formData.name.trim() &&
    formData.contact_phone.trim() &&
    formData.location.trim() &&
    formData.description.trim()
  );

  const isSection3Complete = Boolean(Number(formData.experience_years) >= 1);

  const resolvedWalletName = formData.payment_wallet_type === 'OTHER' ? formData.custom_wallet_name.trim() : formData.payment_wallet_type;

  const isSection4Complete = Boolean(
    formData.payment_account_title.trim() &&
    formData.payment_account_number.trim() &&
    (formData.payment_method === 'BANK' ? formData.payment_bank_name.trim() : resolvedWalletName.length > 0)
  );

  const missingFields = [];
  if (!formData.lead_name.trim()) missingFields.push('Organizer / Contact Person Name');
  if (!formData.cnic.trim()) missingFields.push('CNIC Number (13 digits)');
  if (!formData.name.trim()) missingFields.push('Agency / Business Name');
  if (!formData.contact_phone.trim()) missingFields.push('Contact Phone (WhatsApp)');
  if (!formData.location.trim()) missingFields.push('Base City');
  if (!formData.description.trim()) missingFields.push('Agency Description & Specialization');
  if (!isSection3Complete) missingFields.push('Years of Experience (minimum 1 year)');
  if (!formData.payment_account_title.trim()) missingFields.push('Payment Account Title');
  if (!formData.payment_account_number.trim()) missingFields.push('Account / Mobile Wallet Number');
  if (formData.payment_method === 'BANK' && !formData.payment_bank_name.trim()) missingFields.push('Bank Name');
  if (formData.payment_method === 'WALLET' && formData.payment_wallet_type === 'OTHER' && !formData.custom_wallet_name.trim()) {
    missingFields.push('Custom Wallet / Digital Provider Name');
  }

  const isAllValid = missingFields.length === 0;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!isAllValid) {
      toast.error(`Please complete all required fields:\n${missingFields.join(', ')}`, { duration: 4000 });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalWalletType = formData.payment_method === 'WALLET'
        ? (formData.payment_wallet_type === 'OTHER' ? formData.custom_wallet_name.trim() : formData.payment_wallet_type)
        : 'BANK';

      const finalBankOrProviderName = formData.payment_method === 'WALLET'
        ? finalWalletType
        : formData.payment_bank_name.trim();

      const payload = {
        name: formData.name.trim(),
        cnic: formData.cnic.trim(),
        contact_phone: formData.contact_phone.trim(),
        location: formData.location.trim(),
        website: formData.website.trim(),
        description: `${formData.description.trim()}\n\nLead Contact: ${formData.lead_name.trim()}`,
        destinations: formData.destinations,
        number_of_buses: Number(formData.number_of_buses) || 0,
        vehicle_capacity: Number(formData.vehicle_capacity) || 0,
        maximum_group_size: Number(formData.maximum_group_size) || 20,
        experience_years: Number(formData.experience_years) || 1,
        experience_description: formData.experience_description.trim(),
        payment_wallet_type: finalWalletType,
        payment_bank_name: finalBankOrProviderName,
        payment_account_title: formData.payment_account_title.trim(),
        payment_account_number: formData.payment_account_number.trim(),
        payment_instructions: formData.payment_instructions.trim(),
        onboarding_completed: true,
      };

      await organizersService.updateMyProfile(payload);
      await refreshUser();
      toast.success('Organizer workspace successfully registered and activated!');
      navigate('/explore');
    } catch (err) {
      console.error('Onboarding update failed:', err);
      toast.error(err.message || 'Failed to save onboarding details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7E9E5] text-[#00261D] text-[10px] font-bold uppercase tracking-[0.2em]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
          <span>FRIDAY® / VERIFIED ORGANIZER ONBOARDING</span>
        </div>
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-normal text-[#00261D] leading-tight italic"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Register Your Tour Operations.
        </h1>
        <p className="text-xs sm:text-sm text-[#717975] leading-relaxed max-w-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>
          Complete your verified organizer profile below in one seamless form to start publishing tour packages, managing itineraries, and accepting bookings.
        </p>
      </header>

      {/* ─── Quick Progress Badges ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white border border-black/10 shadow-2xs text-xs font-semibold">
        <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${isSection1Complete ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-[#F8FAF6] text-[#717975]'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${isSection1Complete ? 'bg-emerald-700 text-white' : 'bg-black/10 text-black'}`}>
            {isSection1Complete ? <Check className="w-3 h-3" /> : '1'}
          </div>
          <span className="truncate">Identity & Agency</span>
        </div>

        <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${formData.destinations.length > 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-[#F8FAF6] text-[#717975]'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${formData.destinations.length > 0 ? 'bg-emerald-700 text-white' : 'bg-black/10 text-black'}`}>
            {formData.destinations.length > 0 ? <Check className="w-3 h-3" /> : '2'}
          </div>
          <span className="truncate">Destinations</span>
        </div>

        <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${isSection3Complete ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-[#F8FAF6] text-[#717975]'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${isSection3Complete ? 'bg-emerald-700 text-white' : 'bg-black/10 text-black'}`}>
            {isSection3Complete ? <Check className="w-3 h-3" /> : '3'}
          </div>
          <span className="truncate">Experience</span>
        </div>

        <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${isSection4Complete ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-[#F8FAF6] text-[#717975]'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${isSection4Complete ? 'bg-emerald-700 text-white' : 'bg-black/10 text-black'}`}>
            {isSection4Complete ? <Check className="w-3 h-3" /> : '4'}
          </div>
          <span className="truncate">Receiving Account</span>
        </div>
      </div>

      {/* ─── Single Page Form Container ───────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">

        {/* ════════ SECTION 1: Identity & Business Details (Mandatory) ════════ */}
        <section className="bg-white rounded-3xl border border-black/10 p-6 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-black/5 flex-wrap">
            <div>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 inline-block mb-1.5">
                Section 1 • Mandatory Identity
              </span>
              <h2 className="text-2xl sm:text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Organizer Identity & Business Details
              </h2>
              <p className="text-xs text-[#717975] mt-0.5">
                All fields marked with an asterisk (*) are required for verified partner compliance.
              </p>
            </div>
            {isSection1Complete && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shrink-0">
                <Check className="w-3.5 h-3.5" /> Complete
              </span>
            )}
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                  Organizer / Contact Person Name *
                </label>
                <input
                  type="text"
                  value={formData.lead_name}
                  onChange={(e) => updateField('lead_name', e.target.value)}
                  placeholder="e.g. Muhammad Hamza"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                  CNIC Number (13 Digits) *
                </label>
                <input
                  type="text"
                  value={formData.cnic}
                  onChange={(e) => updateField('cnic', e.target.value)}
                  placeholder="37405-1234567-1"
                  maxLength={15}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-mono focus:outline-none focus:border-[#00261D]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                  Business / Tour Agency Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Karakoram Nomads Expeditions"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                  Contact Phone (WhatsApp) *
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                  Base City *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="e.g. Islamabad, Lahore, Gilgit, Skardu"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                  Social Media Profile (Optional)
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="e.g. https://instagram.com/myagency or Facebook page"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                Agency Description & Specialization *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                placeholder="Describe your tour operation specialties, safety standards, mountain guiding experience, and regions covered..."
                className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl p-4 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] resize-none"
                required
              />
            </div>
          </div>
        </section>

        {/* ════════ SECTION 2: Operational Destinations (Optional) ════════ */}
        <section className="bg-white rounded-3xl border border-black/10 p-6 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-black/5 flex-wrap">
            <div>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 inline-block mb-1.5">
                Section 2 • Optional
              </span>
              <h2 className="text-2xl sm:text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Operational Destinations
              </h2>
              <p className="text-xs text-[#717975] mt-0.5">
                Select destinations your agency covers, or add custom regions. You can also skip this and add them later.
              </p>
            </div>
            {formData.destinations.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 shrink-0">
                {formData.destinations.length} Selected
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                'Hunza Valley', 'Skardu', 'Swat', 'Naran & Kaghan', 'Fairy Meadows',
                'Kumrat Valley', 'Chitral', 'Neelum Valley', 'Sharan Forest',
                'Gwadar', 'Ormara Beach', 'Gorakh Hill', 'Ziarat',
              ].map((dest) => {
                const isSelected = formData.destinations.includes(dest);
                return (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => (isSelected ? removeDestination(dest) : updateField('destinations', [...formData.destinations, dest]))}
                    className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#00261D] text-white shadow-2xs'
                        : 'bg-[#F8FAF6] text-[#717975] border border-black/10 hover:border-black/30'
                    }`}
                  >
                    <span>{dest}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#BBEAD5]" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Destination Input */}
            <div className="flex gap-2 pt-1 flex-col sm:flex-row">
              <input
                value={formData.destinationInput}
                onChange={(e) => updateField('destinationInput', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDestination())}
                placeholder="Add custom destination (e.g. Shounter Pass, Arang Kel, Deosai)..."
                className="flex-1 bg-[#F8FAF6] border border-black/10 rounded-2xl sm:rounded-full px-5 py-3 text-xs text-[#00261D] focus:outline-none focus:border-[#00261D]"
              />
              <button
                type="button"
                onClick={addDestination}
                className="px-6 py-3 rounded-2xl sm:rounded-full bg-[#00261D] text-white text-xs font-bold cursor-pointer hover:bg-[#00261D]/90 transition-all shrink-0"
              >
                + Add Destination
              </button>
            </div>
          </div>
        </section>

        {/* ════════ SECTION 3: Fleet Capacity & Experience ════════ */}
        <section className="bg-white rounded-3xl border border-black/10 p-6 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-black/5 flex-wrap">
            <div>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 inline-block mb-1.5">
                Section 3 • Experience Mandatory
              </span>
              <h2 className="text-2xl sm:text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Fleet Capacity & Experience
              </h2>
              <p className="text-xs text-[#717975] mt-0.5">
                Years of Experience is mandatory. Fleet and vehicle counts are optional.
              </p>
            </div>
            {isSection3Complete && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shrink-0">
                <Check className="w-3.5 h-3.5" /> Complete
              </span>
            )}
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#00261D] mb-1.5">
                  Years of Experience *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.experience_years}
                  onChange={(e) => updateField('experience_years', e.target.value)}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-bold focus:outline-none focus:border-[#00261D]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                  Number of Vehicles (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.number_of_buses}
                  onChange={(e) => updateField('number_of_buses', e.target.value)}
                  placeholder="e.g. 2 Coasters, 3 Jeeps"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                  Avg Vehicle Capacity (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.vehicle_capacity}
                  onChange={(e) => updateField('vehicle_capacity', e.target.value)}
                  placeholder="e.g. 14 Seats"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                Expedition / Track Record Summary (Optional)
              </label>
              <textarea
                value={formData.experience_description}
                onChange={(e) => updateField('experience_description', e.target.value)}
                rows={2}
                placeholder="e.g. Over 50 successful group treks across Hunza, Skardu, and Fairy Meadows with zero incidents..."
                className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl p-4 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] resize-none"
              />
            </div>
          </div>
        </section>

        {/* ════════ SECTION 4: Receiving Account & Payment Setup (Mandatory) ════════ */}
        <section className="bg-white rounded-3xl border border-black/10 p-6 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-black/5 flex-wrap">
            <div>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 inline-block mb-1.5">
                Section 4 • Payment Setup Mandatory
              </span>
              <h2 className="text-2xl sm:text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Receiving Account Setup
              </h2>
              <p className="text-xs text-[#717975] mt-0.5">
                Provide either your Commercial Bank Account (IBAN) OR Mobile Wallet (JazzCash / Easypaisa / SadaPay / NayaPay / Custom) to receive traveler booking payments.
              </p>
            </div>
            {isSection4Complete && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shrink-0">
                <Check className="w-3.5 h-3.5" /> Complete
              </span>
            )}
          </div>

          {/* Payment Type Selector Toggle */}
          <div className="flex gap-2 p-1.5 rounded-2xl bg-[#F3F4F0] text-xs font-bold flex-col sm:flex-row">
            <button
              type="button"
              onClick={() => {
                updateField('payment_method', 'BANK');
                updateField('payment_wallet_type', 'BANK');
              }}
              className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                formData.payment_method === 'BANK' ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975] hover:text-[#00261D]'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Commercial Bank Account / IBAN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                updateField('payment_method', 'WALLET');
                if (formData.payment_wallet_type === 'BANK') {
                  updateField('payment_wallet_type', 'JazzCash');
                }
              }}
              className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                formData.payment_method === 'WALLET' ? 'bg-[#00261D] text-white shadow-2xs' : 'text-[#717975] hover:text-[#00261D]'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Mobile Wallet / Digital Provider</span>
            </button>
          </div>

          {formData.payment_method === 'BANK' ? (
            /* Bank Account Fields */
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Bank Name *</label>
                <input
                  type="text"
                  value={formData.payment_bank_name}
                  onChange={(e) => updateField('payment_bank_name', e.target.value)}
                  placeholder="e.g. Meezan Bank, HBL, Bank Alfalah, Faysal Bank"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] font-semibold"
                  required={formData.payment_method === 'BANK'}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Account Title *</label>
                  <input
                    type="text"
                    value={formData.payment_account_title}
                    onChange={(e) => updateField('payment_account_title', e.target.value)}
                    placeholder="e.g. Karakoram Nomads Pvt Ltd"
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Account Number / IBAN *</label>
                  <input
                    type="text"
                    value={formData.payment_account_number}
                    onChange={(e) => updateField('payment_account_number', e.target.value)}
                    placeholder="PK34 MEZN 0000 1234 5678 9012"
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-mono focus:outline-none focus:border-[#00261D]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Payment Instructions / Branch (Optional)</label>
                <input
                  type="text"
                  value={formData.payment_instructions}
                  onChange={(e) => updateField('payment_instructions', e.target.value)}
                  placeholder="e.g. Send screenshot on WhatsApp after transfer for instant booking verification."
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-xs text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
              </div>
            </div>
          ) : (
            /* Mobile Wallet Fields */
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-2">Select Mobile Wallet / Digital Account *</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {['JazzCash', 'Easypaisa', 'SadaPay', 'NayaPay', 'OTHER'].map((w) => {
                    const isSelected = formData.payment_wallet_type === w;
                    const label = w === 'OTHER' ? '+ Add Yourself' : w;
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateField('payment_wallet_type', w)}
                        className={`p-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#00261D] text-white border-[#00261D] shadow-2xs'
                            : 'bg-[#F8FAF6] text-[#717975] border-black/10 hover:border-black/30'
                        }`}
                      >
                        <span>{label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#BBEAD5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom / Add Yourself Provider Input Box */}
              {formData.payment_wallet_type === 'OTHER' && (
                <div className="p-4 rounded-2xl bg-[#F3F4F0] border border-black/10 space-y-2 animate-in fade-in">
                  <label className="block text-xs uppercase font-bold text-[#00261D]">
                    Enter Wallet / Digital Bank Name *
                  </label>
                  <input
                    type="text"
                    value={formData.custom_wallet_name}
                    onChange={(e) => updateField('custom_wallet_name', e.target.value)}
                    placeholder="e.g. Raast ID, UBL Omni, Zindigi, Finja, Payoneer..."
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-[#00261D] font-semibold focus:outline-none focus:border-[#00261D]"
                    required={formData.payment_wallet_type === 'OTHER'}
                  />
                  <p className="text-[11px] text-[#717975]">
                    Type the name of your mobile wallet or digital banking service provider.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Wallet Account Title *</label>
                  <input
                    type="text"
                    value={formData.payment_account_title}
                    onChange={(e) => updateField('payment_account_title', e.target.value)}
                    placeholder="e.g. Muhammad Hamza"
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Mobile Account / Wallet Number *</label>
                  <input
                    type="text"
                    value={formData.payment_account_number}
                    onChange={(e) => updateField('payment_account_number', e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-mono focus:outline-none focus:border-[#00261D]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Payment Instructions (Optional)</label>
                <input
                  type="text"
                  value={formData.payment_instructions}
                  onChange={(e) => updateField('payment_instructions', e.target.value)}
                  placeholder="e.g. Share transaction receipt on WhatsApp (+92 300 1234567) after sending deposit."
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-xs text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
              </div>
            </div>
          )}
        </section>

        {/* ════════ SECTION 5: Review & Launch Workspace ════════ */}
        <section className="bg-white rounded-3xl border border-black/10 p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-black/5">
            <div>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 inline-block mb-1.5">
                Launch Workspace
              </span>
              <h3 className="text-2xl sm:text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Confirm & Launch Workspace
              </h3>
            </div>
          </div>

          {/* Missing Fields Warning Banner */}
          {!isAllValid ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                <span>Mandatory Profile Information Pending</span>
              </div>
              <p className="text-xs text-amber-800">
                Please complete the following required fields to activate your organizer account:
              </p>
              <ul className="list-disc pl-5 text-xs text-amber-700 space-y-1">
                {missingFields.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>All mandatory credentials and compliance details are verified. Ready to launch!</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !isAllValid}
              className="w-full py-4 sm:py-5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-sm sm:text-base font-bold uppercase tracking-wider transition-all hover:scale-101 shadow-xl flex items-center justify-center gap-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Registering Your Workspace...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#BBEAD5]" />
                  <span>Complete & Launch Workspace</span>
                </>
              )}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
