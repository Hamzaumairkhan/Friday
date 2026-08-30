import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Globe,
  Loader2,
  Check,
  Save,
  Edit2,
  X,
  ArrowRightLeft,
  CheckCircle2,
  User,
  Sparkles,
  Layers,
} from 'lucide-react';
import { organizersService } from '../../services/organizers';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/firebase';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function OrganizerProfilePage() {
  const { backendUser, firebaseUser, organizerProfile, refreshUser, switchToTraveler } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_phone: '',
    contact_email: '',
    location: '',
    website: '',
    description: '',
    destinations: [],
    destinationInput: '',
    payment_account_title: '',
    payment_account_number: '',
    payment_bank_name: 'Habib Bank Limited',
    payment_instructions: '',
  });

  useEffect(() => {
    if (!isEditing && (organizerProfile || backendUser)) {
      setFormData({
        name: organizerProfile?.name || organizerProfile?.business_name || backendUser?.business_name || backendUser?.name || '',
        contact_phone: organizerProfile?.phone || organizerProfile?.contact_phone || backendUser?.phone || '',
        contact_email: organizerProfile?.contact_email || backendUser?.email || '',
        location: organizerProfile?.location || 'Islamabad, Pakistan',
        website: organizerProfile?.website || '',
        description: organizerProfile?.description || 'Curated expeditions and mountain guide services across Northern Pakistan.',
        destinations: organizerProfile?.destinations || ['Hunza Valley', 'Skardu', 'Swat', 'Naran & Kaghan'],
        destinationInput: '',
        payment_account_title: organizerProfile?.payment_account_title || backendUser?.name || 'Friday Expeditions',
        payment_account_number: organizerProfile?.payment_account_number || '',
        payment_bank_name: organizerProfile?.payment_bank_name || 'Meezan Bank Limited',
        payment_instructions: organizerProfile?.payment_instructions || 'Please upload transaction screenshot after bank transfer.',
      });
    }
  }, [organizerProfile, backendUser, isEditing]);

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
        payment_account_title: formData.payment_account_title,
        payment_account_number: formData.payment_account_number,
        payment_bank_name: formData.payment_bank_name,
        payment_instructions: formData.payment_instructions,
      };

      const updated = await organizersService.updateMyProfile(payload);
      if (updated) {
        setFormData((prev) => ({
          ...prev,
          name: updated.name || prev.name,
          contact_phone: updated.contact_phone || updated.phone || prev.contact_phone,
          location: updated.location || prev.location,
          description: updated.description || prev.description,
          destinations: updated.destinations || prev.destinations,
          website: updated.website || prev.website,
          payment_bank_name: updated.payment_bank_name || prev.payment_bank_name,
          payment_account_title: updated.payment_account_title || prev.payment_account_title,
          payment_account_number: updated.payment_account_number || prev.payment_account_number,
          payment_instructions: updated.payment_instructions || prev.payment_instructions,
        }));
      }
      await refreshUser();
      setIsEditing(false);
      toast.success('Company profile & payout details saved!');
    } catch (err) {
      console.error('Save profile error:', err);
      toast.error(err.message || 'Failed to update company profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchRole = async () => {
    setIsSwitching(true);
    try {
      await switchToTraveler();
      navigate('/explore');
    } catch (err) {
      console.error('Switch to traveler error:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  const userName = backendUser?.name || firebaseUser?.displayName || auth.currentUser?.displayName || 'Organizer';
  const userEmail = backendUser?.email || firebaseUser?.email || auth.currentUser?.email || '';
  const userPhoto = !photoError
    ? (backendUser?.profile_picture ||
       backendUser?.avatar_url ||
       firebaseUser?.photoURL ||
       auth.currentUser?.photoURL)
    : null;

  return (
    <div className="w-full flex-1 flex justify-center px-4 sm:px-8 lg:px-12 py-10 min-h-screen bg-[#F8FAF6]">
      <div className="w-full max-w-4xl space-y-10">

        {/* ─── Profile Header Hero Card (Identical Rich Styling) ───── */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-black/10 shadow-xs relative overflow-hidden">
          {/* Subtle Decorative Gradient */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#BBEAD5]/30 via-transparent to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Google / Account Avatar */}
              <div className="relative">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={userName}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => setPhotoError(true)}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md"
                  />
                ) : (
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#00261D] text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                  title="Verified Account"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Name, Company & Verified Status */}
              <div className="text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <h1
                    className="text-3xl sm:text-4xl font-normal text-[#00261D]"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {formData.name || userName}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Verified Operator</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#717975] flex items-center justify-center sm:justify-start gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#00261D]" />
                  <span>{userEmail}</span>
                </p>

                <p className="text-xs text-[#5C6460] font-medium flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#00261D]" />
                  <span>{formData.location || 'Headquarters in Islamabad, Pakistan'}</span>
                </p>
              </div>
            </div>

            {/* Edit / Close Edit Profile Toggle Button */}
            <div className="shrink-0 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                  isEditing
                    ? 'bg-slate-100 text-[#00261D] border border-black/10 hover:bg-slate-200'
                    : 'bg-[#00261D] text-white hover:bg-[#00261D]/90 hover:scale-102'
                }`}
              >
                {isEditing ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Editing</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-[#BBEAD5]" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Profile Details & Settings Form ──────────────────────── */}
        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: Business Identity & Contact */}
          <div className="bg-white rounded-3xl border border-black/10 p-6 sm:p-10 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00261D] flex items-center justify-center border border-black/5">
                  <Building2 className="w-5 h-5 text-[#00261D]" />
                </div>
                <div>
                  <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    Company & Contact Information
                  </h2>
                  <p className="text-xs text-[#717975]">
                    Public credentials displayed on your expeditions and host badges.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">
                  Company / Organization Name *
                </label>
                {isEditing ? (
                  <input
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                    placeholder="e.g. Karakoram Nomads"
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold focus:outline-none focus:border-[#00261D]"
                  />
                ) : (
                  <div className="w-full bg-[#F8FAF6] border border-black/5 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-bold">
                    {formData.name || 'Not set'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#00261D]" />
                    <span>Official WhatsApp / Phone *</span>
                  </label>
                  {isEditing ? (
                    <input
                      value={formData.contact_phone}
                      onChange={(e) => updateField('contact_phone', e.target.value)}
                      required
                      placeholder="+92 300 1234567"
                      className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold focus:outline-none focus:border-[#00261D]"
                    />
                  ) : (
                    <div className="w-full bg-[#F8FAF6] border border-black/5 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold">
                      {formData.contact_phone || 'Not set'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#00261D]" />
                    <span>Base Headquarters City</span>
                  </label>
                  {isEditing ? (
                    <input
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder="e.g. Islamabad, Pakistan"
                      className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold focus:outline-none focus:border-[#00261D]"
                    />
                  ) : (
                    <div className="w-full bg-[#F8FAF6] border border-black/5 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold">
                      {formData.location || 'Islamabad, Pakistan'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">About the Agency</label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    placeholder="Describe your tour organizing background..."
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl p-4 text-sm text-[#00261D] focus:outline-none focus:border-[#00261D] resize-none"
                  />
                ) : (
                  <div className="w-full bg-[#F8FAF6] border border-black/5 rounded-2xl p-4 text-sm text-[#00261D] leading-relaxed">
                    {formData.description || 'No description provided.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Direct Receiving Bank & Payouts */}
          <div className="bg-white rounded-3xl border border-black/10 p-6 sm:p-10 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00261D] flex items-center justify-center border border-black/5">
                <CreditCard className="w-5 h-5 text-[#00261D]" />
              </div>
              <div>
                <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Receiving Bank Account & Payouts
                </h2>
                <p className="text-xs text-[#717975]">
                  Bank details given to travelers for manual bank transfer payment proofs.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Bank / Provider Name</label>
                {isEditing ? (
                  <input
                    value={formData.payment_bank_name}
                    onChange={(e) => updateField('payment_bank_name', e.target.value)}
                    placeholder="e.g. Meezan Bank / JazzCash / SadaPay"
                    className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold focus:outline-none focus:border-[#00261D]"
                  />
                ) : (
                  <div className="w-full bg-[#F8FAF6] border border-black/5 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold">
                    {formData.payment_bank_name || 'Meezan Bank Limited'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Account Title</label>
                  {isEditing ? (
                    <input
                      value={formData.payment_account_title}
                      onChange={(e) => updateField('payment_account_title', e.target.value)}
                      placeholder="e.g. Friday Expeditions"
                      className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold focus:outline-none focus:border-[#00261D]"
                    />
                  ) : (
                    <div className="w-full bg-[#F8FAF6] border border-black/5 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-semibold">
                      {formData.payment_account_title || 'Friday Expeditions'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#717975] mb-1.5">Account Number / IBAN</label>
                  {isEditing ? (
                    <input
                      value={formData.payment_account_number}
                      onChange={(e) => updateField('payment_account_number', e.target.value)}
                      placeholder="PK34 MEZN 0000 1234 5678 9012"
                      className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-mono focus:outline-none focus:border-[#00261D]"
                    />
                  ) : (
                    <div className="w-full bg-[#F8FAF6] border border-black/5 rounded-2xl px-4 py-3 text-sm text-[#00261D] font-mono">
                      {formData.payment_account_number || 'PK34 MEZN 0000 1234 5678 9012'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Operational Destinations */}
          <div className="bg-white rounded-3xl border border-black/10 p-6 sm:p-10 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00261D] flex items-center justify-center border border-black/5">
                <Globe className="w-5 h-5 text-[#00261D]" />
              </div>
              <div>
                <h2 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Operational Destinations
                </h2>
                <p className="text-xs text-[#717975]">
                  Regions and valleys where your company conducts guided tours and travel packages.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.destinations.map((dest) => (
                <span
                  key={dest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#00261D] text-white shadow-2xs"
                >
                  <span>{dest}</span>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeDestination(dest)}
                      className="hover:text-red-300 cursor-pointer ml-1 text-sm font-bold"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {isEditing && (
              <div className="flex gap-2 flex-col sm:flex-row pt-2">
                <input
                  value={formData.destinationInput}
                  onChange={(e) => updateField('destinationInput', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDestination())}
                  placeholder="e.g. Deosai Plains, Gilgit..."
                  className="flex-1 bg-[#F8FAF6] border border-black/10 rounded-2xl px-5 py-3 text-xs text-[#00261D] focus:outline-none focus:border-[#00261D]"
                />
                <button
                  type="button"
                  onClick={addDestination}
                  className="px-6 py-3 rounded-2xl bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold cursor-pointer transition-all shadow-2xs"
                >
                  + Add Destination
                </button>
              </div>
            )}
          </div>

          {/* Save Changes Floating Action (Visible in Edit Mode) */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 rounded-full border border-black/10 bg-white hover:bg-slate-50 text-xs font-bold uppercase tracking-wider text-[#717975] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all hover:scale-101 shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#BBEAD5]" />}
                <span>Save All Profile Changes</span>
              </button>
            </div>
          )}

          {/* ─── Dedicated Switch to Simple User / Traveler Card ───── */}
          <div className="bg-[#ECEEE9] rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6 mt-8">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#00261D]" />
                <h3
                  className="text-2xl font-normal text-[#00261D]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Switch to Traveler Experience
                </h3>
              </div>
              <p className="text-xs text-[#5C6460] max-w-lg">
                Looking to plan personal trips or explore community itineraries? Seamlessly switch to the standard Traveler portal anytime.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSwitchRole}
              disabled={isSwitching}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider transition-all hover:scale-102 shadow-sm flex items-center justify-center gap-2.5 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSwitching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <User className="w-4 h-4 text-[#BBEAD5]" />
              )}
              <span>Switch to Traveler Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
