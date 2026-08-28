import { useState, useEffect } from 'react';
import { Building2, ShieldCheck, CreditCard, Bus, Award, MapPin, Loader2, Check, Save } from 'lucide-react';
import { organizersService } from '../../services/organizers';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function OrganizerProfilePage() {
  const { organizerProfile, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_phone: '',
    contact_email: '',
    location: '',
    website: '',
    description: '',
    destinations: [],
    destinationInput: '',
    number_of_buses: 2,
    vehicle_capacity: 15,
    maximum_group_size: 20,
    experience_years: 3,
    experience_description: '',
    payment_account_title: '',
    payment_account_number: '',
    payment_bank_name: 'Habib Bank Limited',
    payment_instructions: '',
  });

  useEffect(() => {
    if (organizerProfile) {
      setFormData({
        name: organizerProfile.name || '',
        contact_phone: organizerProfile.contact_phone || '',
        contact_email: organizerProfile.contact_email || '',
        location: organizerProfile.location || '',
        website: organizerProfile.website || '',
        description: organizerProfile.description || '',
        destinations: organizerProfile.destinations || [],
        destinationInput: '',
        number_of_buses: organizerProfile.number_of_buses || 2,
        vehicle_capacity: organizerProfile.vehicle_capacity || 15,
        maximum_group_size: organizerProfile.maximum_group_size || 20,
        experience_years: organizerProfile.experience_years || 3,
        experience_description: organizerProfile.experience_description || '',
        payment_account_title: organizerProfile.payment_account_title || '',
        payment_account_number: organizerProfile.payment_account_number || '',
        payment_bank_name: organizerProfile.payment_bank_name || 'Habib Bank Limited',
        payment_instructions: organizerProfile.payment_instructions || '',
      });
    }
  }, [organizerProfile]);

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

  const handleSave = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
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
      };

      await organizersService.updateMyProfile(payload);
      await refreshUser();
      toast.success('Company profile & payment details saved!');
    } catch (err) {
      console.error('Save profile error:', err);
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
      {/* ─── Header (Stitch 18_company_profile.html) ─────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#420E00] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            ROAD CREW / COMPANY PROFILE & SETTINGS
          </p>
          <h1
            className="text-5xl sm:text-6xl font-normal text-black leading-tight italic"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Company Identity.
          </h1>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Verified Partner</span>
        </div>
      </header>

      {/* ─── Form Container ──────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Business Identity */}
        <div className="bg-white rounded-3xl border border-black/10 p-8 sm:p-10 shadow-sm space-y-6">
          <h2 className="text-2xl font-normal text-black border-b border-black/10 pb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Agency & Contact Details
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Company / Organizer Name</label>
              <input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Karakoram Nomads"
                className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Official WhatsApp Contact</label>
                <input
                  value={formData.contact_phone}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Base Headquarters City</label>
                <input
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="e.g. Islamabad, Pakistan"
                  className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">About the Agency</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                placeholder="Describe your tour organizing background..."
                className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3.5 text-sm text-black focus:outline-none focus:border-black resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Direct Payment Account (IBAN) */}
        <div className="bg-white rounded-3xl border border-black/10 p-8 sm:p-10 shadow-sm space-y-6">
          <h2 className="text-2xl font-normal text-black border-b border-black/10 pb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Receiving Bank Account (IBAN)
          </h2>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#6F6F6F] mb-1">Account Title</label>
                <input
                  value={formData.payment_account_title}
                  onChange={(e) => updateField('payment_account_title', e.target.value)}
                  placeholder="e.g. Friday Expeditions"
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
        </div>

        {/* Section 3: Operational Destinations */}
        <div className="bg-white rounded-3xl border border-black/10 p-8 sm:p-10 shadow-sm space-y-6">
          <h2 className="text-2xl font-normal text-black border-b border-black/10 pb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Operational Destinations
          </h2>

          <div className="flex flex-wrap gap-2.5">
            {formData.destinations.map((dest) => (
              <span key={dest} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-black text-white">
                {dest}
                <button type="button" onClick={() => removeDestination(dest)} className="hover:text-red-300">
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={formData.destinationInput}
              onChange={(e) => updateField('destinationInput', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDestination())}
              placeholder="Add destination..."
              className="flex-1 bg-[#F8FAF6] border border-black/10 rounded-full px-5 py-2.5 text-xs text-black focus:outline-none focus:border-black"
            />
            <button
              type="button"
              onClick={addDestination}
              className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-semibold"
            >
              Add
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-10 py-4 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-all hover:scale-105 shadow-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile Settings
          </button>
        </div>
      </form>
    </div>
  );
}
