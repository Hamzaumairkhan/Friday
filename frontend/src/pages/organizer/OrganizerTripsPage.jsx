import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit3, Trash2, MapPin, Clock, Users, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { organizersService } from '../../services/organizers';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import EmptyState from '../../components/shared/EmptyState';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function OrganizerTripsPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, PUBLISHED, DRAFTS
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  
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
  }, []);

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

  const filteredPackages = packages.filter((pkg) => {
    if (filter === 'PUBLISHED') return pkg.is_active;
    if (filter === 'DRAFTS') return !pkg.is_active;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* ─── Header Section (Stitch 12_my_tour_packages.html) ─────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#420E00] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            ROAD CREW / JOURNEYS
          </p>
          <h1
            className="text-5xl sm:text-6xl font-normal text-black leading-tight italic"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            The journeys you run.
          </h1>
        </div>

        <Link to="/organizer/trips/new">
          <button className="bg-black text-white px-7 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-all hover:scale-105 shadow-md flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Journey
          </button>
        </Link>
      </header>

      {/* ─── Filter Pills ─────────────────────────────────────────────── */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer ${
            filter === 'ALL'
              ? 'bg-black text-white shadow-xs'
              : 'bg-white text-[#6F6F6F] border border-black/10 hover:border-black/30'
          }`}
        >
          All ({packages.length})
        </button>
        <button
          onClick={() => setFilter('PUBLISHED')}
          className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer ${
            filter === 'PUBLISHED'
              ? 'bg-black text-white shadow-xs'
              : 'bg-white text-[#6F6F6F] border border-black/10 hover:border-black/30'
          }`}
        >
          Published ({packages.filter((p) => p.is_active).length})
        </button>
        <button
          onClick={() => setFilter('DRAFTS')}
          className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer ${
            filter === 'DRAFTS'
              ? 'bg-black text-white shadow-xs'
              : 'bg-white text-[#6F6F6F] border border-black/10 hover:border-black/30'
          }`}
        >
          Drafts ({packages.filter((p) => !p.is_active).length})
        </button>
      </div>

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
              className="bg-white rounded-3xl border border-black/10 overflow-hidden flex flex-col group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl"
            >
              {/* Card Image */}
              <div className="relative h-60 w-full overflow-hidden bg-slate-100">
                <img
                  src={pkg.image_url || pkg.cover_image || '/images/stitch/stitch_asset_1.jpg'}
                  alt={pkg.title}
                  onError={(e) => {
                    if (!e.currentTarget.src.includes('/images/stitch/stitch_asset_1.jpg')) {
                      e.currentTarget.src = '/images/stitch/stitch_asset_1.jpg';
                    }
                  }}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Status Pill */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <div className={`w-2 h-2 rounded-full ${pkg.is_active ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-black">
                    {pkg.is_active ? 'PUBLISHED' : 'DRAFT'}
                  </span>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-4 left-4 text-white text-xs font-semibold uppercase tracking-wider">
                  <span>{pkg.duration_days} DAYS / {Math.max(1, pkg.duration_days - 1)} NIGHTS</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 flex flex-col flex-1 justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#6F6F6F]">
                    <MapPin className="w-3.5 h-3.5 text-black" />
                    <span>{pkg.destination}</span>
                  </div>

                  <h3
                    className="text-2xl font-normal text-black group-hover:text-emerald-950 transition-colors line-clamp-1"
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
                    <span className="text-[10px] uppercase font-semibold text-[#6F6F6F]">Price / Person</span>
                    <p className="text-xl font-bold text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
                      PKR {Number(pkg.price_per_person || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-[#6F6F6F]">Max Capacity</span>
                    <p className="text-xs font-bold text-black flex items-center gap-1 justify-end">
                      <Users className="w-3.5 h-3.5 text-[#6F6F6F]" /> {pkg.max_capacity} Seats
                    </p>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(pkg)}
                      className="p-2 rounded-full hover:bg-slate-100 text-[#6F6F6F] hover:text-black transition-colors cursor-pointer"
                      title={pkg.is_active ? 'Unpublish' : 'Publish'}
                    >
                      {pkg.is_active ? <Eye className="w-4 h-4 text-emerald-700" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <Link to={`/organizer/trips/${pkg.id}/edit`}>
                      <button className="p-2 rounded-full hover:bg-slate-100 text-[#6F6F6F] hover:text-black transition-colors cursor-pointer" title="Edit Package">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => setDeleteId(pkg.id)}
                      className="p-2 rounded-full hover:bg-red-50 text-[#6F6F6F] hover:text-red-600 transition-colors cursor-pointer"
                      title="Delete Package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Link to={`/trips/${pkg.id}/group`}>
                    <button className="px-3.5 py-1.5 rounded-full bg-[#F8FAF6] hover:bg-black hover:text-white border border-black/10 text-black text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer">
                      <MessageSquare className="w-3 h-3" /> Group
                    </button>
                  </Link>
                </div>
              </div>
            </article>
          ))}
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
