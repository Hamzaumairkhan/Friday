import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit3, Trash2, MapPin, Clock, Users, Eye, EyeOff, MessageSquare, Share2, Copy, Check, ExternalLink, X, Globe, Phone } from 'lucide-react';
import { organizersService } from '../../services/organizers';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import EmptyState from '../../components/shared/EmptyState';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function OrganizerTripsPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [packageDraft, setPackageDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, PUBLISHED, DRAFTS
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sharePkg, setSharePkg] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await organizersService.listMyPackages();
      setPackages(data || []);
    } catch (err) {
      console.error('Error fetching organizer packages:', err);
      toast.error('Failed to load your packages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
    try {
      const saved = localStorage.getItem('friday_package_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.title || parsed.destination || parsed.description)) {
          setPackageDraft(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse package draft:', e);
    }
  }, []);

  const handleDiscardDraft = () => {
    localStorage.removeItem('friday_package_draft');
    setPackageDraft(null);
    toast.success('Tour package draft discarded.');
  };

  const handleToggleActive = async (pkg) => {
    try {
      const newStatus = !pkg.is_active;
      await organizersService.updatePackage(pkg.id, { is_active: newStatus });
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, is_active: newStatus } : p))
      );
      toast.success(newStatus ? 'Package published on marketplace!' : 'Package unpublished.');
    } catch (err) {
      toast.error('Failed to update package visibility.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await organizersService.deletePackage(deleteId);
      setPackages((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success('Package deleted successfully.');
      setDeleteId(null);
    } catch (err) {
      toast.error('Failed to delete package.');
    } finally {
      setDeleting(false);
    }
  };

  const handleClonePackage = async (e, pkgId) => {
    e.stopPropagation();
    try {
      toast.loading('Copying tour package into workspace...', { id: 'clone-pkg-toast' });
      const cloned = await organizersService.clonePackage(pkgId);
      toast.success('Tour package copied! Opening editor...', { id: 'clone-pkg-toast' });
      navigate(`/organizer/trips/${cloned.id}/edit`);
    } catch (err) {
      console.error('Failed to clone tour package:', err);
      toast.error(err.response?.data?.detail || err.message || 'Failed to duplicate tour package.', { id: 'clone-pkg-toast' });
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    if (filter === 'PUBLISHED') return pkg.is_active;
    if (filter === 'DRAFTS') return !pkg.is_active;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* ─── Header Section ─────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#420E00] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            ORGANIZER WORKSPACE / PACKAGES
          </p>
          <h1
            className="text-4xl sm:text-6xl font-normal text-[#00261D] leading-tight italic"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            The journeys you run.
          </h1>
          <p className="text-xs sm:text-sm text-[#717975] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Manage your published expedition packages, seat allocations, and traveler group chats.
          </p>
        </div>

        <Link to="/organizer/trips/new">
          <button className="bg-[#00261D] hover:bg-[#00261D]/90 text-white px-7 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all hover:scale-101 shadow-xs flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4 text-[#BBEAD5]" />
            <span>Create Package</span>
          </button>
        </Link>
      </header>

      {/* ─── Filter Pills ─────────────────────────────────────────────── */}
      <div className="flex gap-2.5 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
            filter === 'ALL'
              ? 'bg-[#00261D] text-white shadow-2xs'
              : 'bg-white text-[#717975] border border-black/10 hover:border-black/30'
          }`}
        >
          All ({packages.length + (packageDraft ? 1 : 0)})
        </button>
        <button
          onClick={() => setFilter('PUBLISHED')}
          className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
            filter === 'PUBLISHED'
              ? 'bg-[#00261D] text-white shadow-2xs'
              : 'bg-white text-[#717975] border border-black/10 hover:border-black/30'
          }`}
        >
          Published ({packages.filter((p) => p.is_active).length})
        </button>
        <button
          onClick={() => setFilter('DRAFTS')}
          className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
            filter === 'DRAFTS'
              ? 'bg-[#00261D] text-white shadow-2xs'
              : 'bg-white text-[#717975] border border-black/10 hover:border-black/30'
          }`}
        >
          Drafts ({packages.filter((p) => !p.is_active).length + (packageDraft ? 1 : 0)})
        </button>
      </div>

      {/* ─── In-Progress Unsaved Draft Card (if exists) ─── */}
      {packageDraft && (filter === 'ALL' || filter === 'DRAFTS') && (
        <div className="bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7]/40 to-[#FFFBEB] border-2 border-dashed border-amber-300 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Unsaved In-Progress Draft
              </span>
              <span className="text-xs text-amber-800 font-medium hidden sm:inline">
                Auto-saved in browser storage
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                Discard Draft
              </button>
              <Link to="/organizer/trips/new">
                <button className="px-4 py-1.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer">
                  <span>Resume Editing</span>
                  <Edit3 className="w-3.5 h-3.5 text-[#BBEAD5]" />
                </button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1 md:col-span-2">
              <h3 className="text-2xl sm:text-3xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {packageDraft.title || 'Untitled In-Progress Package'}
              </h3>
              <p className="text-xs text-[#555E59] line-clamp-2 leading-relaxed">
                {packageDraft.description || 'Draft expedition with custom schedule, accommodation, and pricing.'}
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap md:flex-col justify-center gap-2 md:border-l md:border-amber-200/80 md:pl-6 text-xs text-amber-950">
              <div className="flex items-center gap-2 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-amber-800" />
                <span>{packageDraft.destination || 'Destination unset'}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-800" />
                <span>{packageDraft.duration_days || 3} Days Duration</span>
              </div>
              {packageDraft.price_per_person ? (
                <div className="text-sm font-bold text-[#00261D]">
                  PKR {Number(packageDraft.price_per_person).toLocaleString()} / person
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ─── Packages Bento Grid ──────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner text="Fetching your expedition packages..." />
      ) : filteredPackages.length === 0 ? (
        <EmptyState
          title="No packages in this view"
          description="Create your first tour package with itinerary, pricing, and images to start receiving traveler bookings."
          actionText="Create Tour Package"
          actionHref="/organizer/trips/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPackages.map((pkg) => (
            <article
              key={pkg.id}
              onClick={() => navigate(`/packages/${pkg.id}`)}
              className="bg-white rounded-3xl border border-black/10 overflow-hidden flex flex-col group hover:-translate-y-1 transition-all duration-300 shadow-2xs hover:shadow-md cursor-pointer"
            >
              {/* Card Image */}
              <div className="relative h-60 w-full overflow-hidden bg-[#00261D]">
                <img
                  src={pkg.image_url || pkg.cover_image || '/images/stitch/hero_mountains.jpg'}
                  alt={pkg.title}
                  onError={(e) => {
                    e.currentTarget.src = '/images/stitch/hero_mountains.jpg';
                  }}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Status Pill (Clickable Toggle - Top-Left) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(pkg);
                  }}
                  className={`absolute top-4 left-4 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs transition-all hover:scale-105 cursor-pointer border ${
                    pkg.is_active
                      ? 'bg-emerald-950/90 text-white border-emerald-500/30'
                      : 'bg-amber-950/90 text-amber-100 border-amber-500/30'
                  }`}
                  title={pkg.is_active ? 'Click to Unpublish & move to Drafts' : 'Click to Publish on Marketplace'}
                >
                  <div className={`w-2 h-2 rounded-full ${pkg.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-[10px] font-bold tracking-wider uppercase">
                    {pkg.is_active ? 'PUBLISHED' : 'UNPUBLISHED (DRAFT)'}
                  </span>
                </button>

                {/* Impressions / Views Count Pill (Bottom-Right of Image) */}
                <div className="absolute bottom-4 right-4 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white shadow-2xs">
                  <Eye className="w-3.5 h-3.5 text-[#BBEAD5]" />
                  <span className="text-[11px] font-bold">
                    {pkg.views_count || 0} {pkg.views_count === 1 ? 'View' : 'Views'}
                  </span>
                </div>

                {/* Duration Badge (Bottom-Left) */}
                <div className="absolute bottom-4 left-4 text-white text-xs font-semibold uppercase tracking-wider">
                  <span>{pkg.duration_days} DAYS / {Math.max(1, pkg.duration_days - 1)} NIGHTS</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 flex flex-col flex-1 justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#717975]">
                    <MapPin className="w-3.5 h-3.5 text-[#00261D]" />
                    <span>{pkg.destination}</span>
                  </div>

                  <h3
                    className="text-2xl font-normal text-[#00261D] group-hover:text-emerald-950 transition-colors line-clamp-1"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {pkg.title}
                  </h3>

                  <p className="text-xs text-[#555E59] line-clamp-2 leading-relaxed">
                    {pkg.description || 'Curated guided expedition in Pakistan.'}
                  </p>
                </div>

                {/* Price & Capacity */}
                <div className="pt-4 border-t border-black/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#717975]">Price / Person</span>
                    <p className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                      PKR {Number(pkg.price_per_person || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#717975]">Max Capacity</span>
                    <p className="text-xs font-bold text-[#00261D] flex items-center gap-1 justify-end">
                      <Users className="w-3.5 h-3.5 text-[#717975]" /> {pkg.max_capacity} Seats
                    </p>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* Unpublish / Publish Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(pkg);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        pkg.is_active
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                      title={pkg.is_active ? 'Unpublish from Marketplace (Move to Drafts)' : 'Publish on Marketplace'}
                    >
                      {pkg.is_active ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-emerald-700" />}
                      <span>{pkg.is_active ? 'Unpublish' : 'Publish'}</span>
                    </button>

                    {/* Copy & Edit / Duplicate Package */}
                    <button
                      onClick={(e) => handleClonePackage(e, pkg.id)}
                      className="p-2 rounded-full hover:bg-emerald-50 text-[#717975] hover:text-[#00261D] transition-colors cursor-pointer"
                      title="Copy & Edit Tour Package"
                    >
                      <Copy className="w-4 h-4 text-[#00261D]" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSharePkg(pkg);
                      }}
                      className="p-2 rounded-full hover:bg-emerald-50 text-[#717975] hover:text-emerald-800 transition-colors cursor-pointer"
                      title="Share Tour Package Link"
                    >
                      <Share2 className="w-4 h-4 text-emerald-800" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(pkg.id);
                      }}
                      className="p-2 rounded-full hover:bg-red-50 text-[#717975] hover:text-red-600 transition-colors cursor-pointer"
                      title="Delete Package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Link to={`/organizer/groups/${pkg.id}`} onClick={(e) => e.stopPropagation()}>
                    <button className="px-3.5 py-1.5 rounded-full bg-[#F8FAF6] hover:bg-[#00261D] hover:text-white border border-black/10 text-[#00261D] text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs">
                      <MessageSquare className="w-3.5 h-3.5" /> Group Chat
                    </button>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Share Tour Package Modal */}
      {sharePkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-black/10 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Share Tour Package
                </span>
                <h3 className="text-xl sm:text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  {sharePkg.title}
                </h3>
                <p className="text-xs text-[#717975]">
                  {sharePkg.destination} • {sharePkg.duration_days} Days • PKR {Number(sharePkg.price_per_person || 0).toLocaleString()}/person
                </p>
              </div>
              <button
                onClick={() => { setSharePkg(null); setCopiedLink(false); }}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#717975] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct URL Box */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#414845]">
                Public Marketplace Link
              </label>
              <div className="flex items-center gap-2 bg-[#F8FAF6] p-2 rounded-2xl border border-black/10">
                <input
                  readOnly
                  value={`${window.location.origin}/packages/${sharePkg.id}`}
                  className="bg-transparent text-xs text-[#00261D] font-mono px-2 flex-1 focus:outline-none select-all"
                />
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/packages/${sharePkg.id}`;
                    navigator.clipboard.writeText(url);
                    setCopiedLink(true);
                    toast.success('Package link copied to clipboard!');
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#BBEAD5]" /> : <Copy className="w-3.5 h-3.5 text-[#BBEAD5]" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
            <div className="pt-2 border-t border-black/5 flex justify-end">
              <button
                onClick={() => { setSharePkg(null); setCopiedLink(false); }}
                className="px-6 py-2.5 rounded-full border border-black/15 text-xs font-bold hover:bg-black/5 text-[#00261D] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Tour Package"
        message="Are you sure you want to delete this package? This will permanently remove it from the marketplace."
        confirmText={deleting ? 'Deleting...' : 'Delete Package'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
