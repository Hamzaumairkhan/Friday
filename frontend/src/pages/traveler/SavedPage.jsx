import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Heart,
  MapPin,
  Calendar,
  DollarSign,
  ArrowRight,
  Compass,
  Star,
  Users,
  Clock,
  Trash2,
} from 'lucide-react';
import { packagesService } from '../../services/packages';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import toast from 'react-hot-toast';

export default function SavedPage() {
  const [savedPackages, setSavedPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const savedIds = JSON.parse(localStorage.getItem('friday_saved_packages') || '[]');
      const allPkgs = await packagesService.listPackages().catch(() => []);
      const matched = (allPkgs || []).filter((p) => savedIds.includes(p.id));
      setSavedPackages(matched);
    } catch (err) {
      console.error('Error fetching saved packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleRemoveSaved = (pkgId, e) => {
    e.stopPropagation();
    e.preventDefault();
    const savedIds = JSON.parse(localStorage.getItem('friday_saved_packages') || '[]');
    const next = savedIds.filter((id) => id !== pkgId);
    localStorage.setItem('friday_saved_packages', JSON.stringify(next));
    setSavedPackages((prev) => prev.filter((p) => p.id !== pkgId));
    toast.success('Expedition removed from saved.');
  };

  return (
    <div className="w-full flex-1 flex justify-center px-4 sm:px-8 lg:px-12 py-10 min-h-screen bg-[#F8FAF6]">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#717975] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Bookmark className="w-4 h-4 text-[#00261D]" />
              <span>COLLECTION</span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-normal text-[#00261D]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Saved Expeditions
            </h1>
            <p className="text-xs sm:text-sm text-[#717975] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Your bookmarked tour packages and mountain retreats for future travels.
            </p>
          </div>

          <Link to="/explore">
            <button className="px-6 py-2.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#00261D]/90 transition-all shadow-xs cursor-pointer">
              Explore More Tours
            </button>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSpinner text="Loading your saved expeditions..." />
        ) : savedPackages.length === 0 ? (
          <EmptyState
            title="No Saved Expeditions"
            description="You haven't bookmarked any tour packages yet. Browse expeditions across Northern Pakistan and click the heart icon to save them here."
            actionText="Browse Expeditions"
            actionHref="/explore"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {savedPackages.map((pkg) => {
              const imageSrc =
                Array.isArray(pkg.images) && pkg.images.length > 0
                  ? pkg.images[0]
                  : '/images/stitch/hero_mountains.jpg';

              return (
                <div
                  key={pkg.id}
                  className="bg-white rounded-3xl overflow-hidden border border-black/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Image Header */}
                    <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                      <img
                        src={imageSrc}
                        alt={pkg.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src = '/images/stitch/hero_mountains.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                      {/* Remove Button */}
                      <button
                        onClick={(e) => handleRemoveSaved(pkg.id, e)}
                        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-red-500 hover:bg-white transition-all shadow-sm cursor-pointer"
                        title="Remove from saved"
                      >
                        <Heart className="w-4 h-4 fill-red-500" />
                      </button>

                      {/* Destination Badge */}
                      <div className="absolute bottom-4 left-4 text-white">
                        <span className="text-[10px] uppercase font-bold tracking-widest bg-[#00261D]/80 backdrop-blur-md px-3 py-1 rounded-full">
                          {pkg.destination || 'Pakistan'}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3
                            className="text-2xl font-normal text-[#00261D]"
                            style={{ fontFamily: "'Instrument Serif', serif" }}
                          >
                            {pkg.title}
                          </h3>
                          <p className="text-xs text-[#717975] flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{pkg.destination}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                            Rs. {Number(pkg.price_per_person || 0).toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-[#717975]">per person</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#414845] line-clamp-2 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {pkg.description || 'Curated guided expedition with transportation, stays, and guided treks.'}
                      </p>

                      <div className="flex items-center gap-4 text-xs font-semibold text-[#414845] pt-2 border-t border-black/5">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#717975]" />
                          <span>{pkg.duration_days || 5} Days</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#717975]" />
                          <span>Up to {pkg.max_group_size || 20} travelers</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-6 pt-0 flex items-center justify-between">
                    <button
                      onClick={(e) => handleRemoveSaved(pkg.id, e)}
                      className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                    <Link to={`/explore/${pkg.id}`}>
                      <button className="px-5 py-2 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:scale-105 transition-all shadow-xs cursor-pointer">
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
