import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Bus, Award, CreditCard, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { organizersService } from '../../services/organizers';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const { organizerProfile, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: organizerProfile?.name || '',
    contact_phone: organizerProfile?.contact_phone || '',
    location: organizerProfile?.location || '',
    website: organizerProfile?.website || '',
    description: organizerProfile?.description || '',
    destinations: organizerProfile?.destinations || [],
    destinationInput: '',
    number_of_buses: organizerProfile?.number_of_buses || 1,
    vehicle_capacity: organizerProfile?.vehicle_capacity || 10,
    maximum_group_size: organizerProfile?.maximum_group_size || 15,
    experience_years: organizerProfile?.experience_years || 1,
    experience_description: organizerProfile?.experience_description || '',
    payment_account_title: organizerProfile?.payment_account_title || '',
    payment_account_number: organizerProfile?.payment_account_number || '',
    payment_bank_name: organizerProfile?.payment_bank_name || '',
    payment_instructions: organizerProfile?.payment_instructions || '',
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addDestination = () => {
    if (formData.destinationInput.trim() && !formData.destinations.includes(formData.destinationInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        destinations: [...prev.destinations, prev.destinationInput.trim()],
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        contact_phone: formData.contact_phone,
        location: formData.location,
        website: formData.website,
        description: formData.description,
        destinations: formData.destinations,
        number_of_buses: Number(formData.number_of_buses),
        vehicle_capacity: Number(formData.vehicle_capacity),
        maximum_group_size: Number(formData.maximum_group_size),
        experience_years: Number(formData.experience_years),
        experience_description: formData.experience_description,
        payment_account_title: formData.payment_account_title,
        payment_account_number: formData.payment_account_number,
        payment_bank_name: formData.payment_bank_name,
        payment_instructions: formData.payment_instructions,
        onboarding_completed: true,
      };

      await organizersService.updateMyProfile(payload);
      await refreshUser();
      toast.success('Organizer onboarding completed successfully!');
      navigate('/organizer/dashboard');
    } catch (err) {
      console.error('Onboarding update failed:', err);
      toast.error(err.message || 'Failed to save onboarding details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: '01 BUSINESS' },
    { num: 2, label: '02 DESTINATIONS' },
    { num: 3, label: '03 FLEET & CAPACITY' },
    { num: 4, label: '04 PAYMENTS' },
    { num: 5, label: '05 REVIEW' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* ─── Header (Stitch 13_organizer_onboarding.html) ─────────────── */}
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#420E00]" style={{ fontFamily: 'Inter, sans-serif' }}>
          FRIDAY® / ROAD CREW
        </p>
        <h1
          className="text-5xl sm:text-6xl font-normal text-black leading-tight italic"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Tell us about your journeys.
        </h1>
        <p className="text-sm text-[#6F6F6F]" style={{ fontFamily: 'Inter, sans-serif' }}>
          Complete your organizer profile to start publishing verified tour packages and receiving traveler bookings.
        </p>
      </header>

      {/* ─── Progress Stepper (Stitch) ─────────────────────────────────── */}
      <div className="flex items-center gap-6 overflow-x-auto pb-3 border-b border-black/10">
        {steps.map((s) => (
          <button
            key={s.num}
            onClick={() => setCurrentStep(s.num)}
            className={`text-[11px] font-bold tracking-widest whitespace-nowrap transition-all cursor-pointer pb-2 ${
              currentStep === s.num
                ? 'text-black border-b-2 border-black'
                : currentStep > s.num
                ? 'text-emerald-800'
                : 'text-[#6F6F6F] opacity-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ─── Step Content ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-black/10 p-8 sm:p-12 shadow-sm space-y-8">
        {/* STEP 1: Business */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Business & Contact Information
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Business / Agency Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Karakoram Nomads"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Contact Phone (WhatsApp)</label>
                  <input
                    value={formData.contact_phone}
                    onChange={(e) => updateField('contact_phone', e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Base City</label>
                  <input
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="e.g. Islamabad, Pakistan"
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Business Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  placeholder="Tell travelers about your expedition experience..."
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Destinations */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Operational Destinations
            </h2>
            <p className="text-xs text-[#6F6F6F]">
              Select or add the regions and valleys where you operate tour groups.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {['Hunza Valley', 'Skardu', 'Swat', 'Naran & Kaghan', 'Fairy Meadows', 'Kumrat Valley', 'Chitral', 'Neelum Valley'].map((dest) => {
                const isSelected = formData.destinations.includes(dest);
                return (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => (isSelected ? removeDestination(dest) : updateField('destinations', [...formData.destinations, dest]))}
                    className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-[#F8FAF6] text-[#6F6F6F] border border-black/10 hover:border-black/30'
                    }`}
                  >
                    {dest} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2">
              <input
                value={formData.destinationInput}
                onChange={(e) => updateField('destinationInput', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDestination())}
                placeholder="Add custom destination..."
                className="flex-1 bg-[#F8FAF6] border border-black/10 rounded-full px-5 py-3 text-xs text-black focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={addDestination}
                className="px-6 py-3 rounded-full bg-black text-white text-xs font-semibold cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Fleet & Capacity */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Fleet & Expedition Capacity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Number of Vehicles</label>
                <input
                  type="number"
                  value={formData.number_of_buses}
                  onChange={(e) => updateField('number_of_buses', e.target.value)}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Vehicle Capacity</label>
                <input
                  type="number"
                  value={formData.vehicle_capacity}
                  onChange={(e) => updateField('vehicle_capacity', e.target.value)}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Years of Experience</label>
                <input
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => updateField('experience_years', e.target.value)}
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Payments */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Receiving Payment Account (IBAN)
            </h2>
            <p className="text-xs text-[#6F6F6F]">
              Travelers will send direct bank deposits or mobile wallet transfers to this account to confirm bookings.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Bank Name</label>
                <input
                  value={formData.payment_bank_name}
                  onChange={(e) => updateField('payment_bank_name', e.target.value)}
                  placeholder="e.g. Habib Bank Limited / Meezan Bank"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Account Title</label>
                <input
                  value={formData.payment_account_title}
                  onChange={(e) => updateField('payment_account_title', e.target.value)}
                  placeholder="e.g. Friday Expeditions Pvt Ltd"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Account Number / IBAN</label>
                <input
                  value={formData.payment_account_number}
                  onChange={(e) => updateField('payment_account_number', e.target.value)}
                  placeholder="PK34 HABB 0000 1234 5678 9012"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black font-mono focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Review & Finalize Onboarding
            </h2>
            <div className="bg-[#F8FAF6] p-6 rounded-2xl border border-black/10 space-y-4 text-xs">
              <div className="flex justify-between border-b border-black/5 pb-2">
                <span className="text-[#6F6F6F]">Business Name:</span>
                <span className="font-bold text-black">{formData.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-2">
                <span className="text-[#6F6F6F]">Contact Phone:</span>
                <span className="font-bold text-black">{formData.contact_phone || 'Not set'}</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-2">
                <span className="text-[#6F6F6F]">Destinations:</span>
                <span className="font-bold text-black">{formData.destinations.join(', ')}</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-2">
                <span className="text-[#6F6F6F]">Bank Account:</span>
                <span className="font-bold text-black">{formData.payment_bank_name} - {formData.payment_account_number || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Navigation Buttons ─────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-black/10">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-6 py-3 rounded-full border border-black/10 text-xs font-semibold uppercase tracking-wider hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-8 py-3.5 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-all hover:scale-105 shadow-md flex items-center gap-2 cursor-pointer"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-10 py-4 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-all hover:scale-105 shadow-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Complete & Launch Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
