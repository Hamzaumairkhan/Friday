import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Compass,
  MapPin,
  Sparkles,
  Heart,
  ShieldCheck,
  Star,
  ArrowRight,
  Users,
  Briefcase,
  Bookmark,
  SlidersHorizontal,
  Eye,
  Copy,
  Calendar,
} from 'lucide-react';
import { packagesService } from '../../services/packages';
import { organizersService } from '../../services/organizers';
import { tripsService } from '../../services/trips';
import { useAuth } from '../../context/AuthContext';
import { getContextualEmoji } from '../../utils/contextualEmoji';
import EmptyState from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/ui/skeleton';
import toast from 'react-hot-toast';

export default function ExplorePage() {
  const navigate = useNavigate();
  const { backendUser, role } = useAuth();
  const isOrganizer = (role || backendUser?.role) === 'ORGANIZER';
  const [packages, setPackages] = useState([]);
  const [organizers, setOrganizers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchDestination, setSearchDestination] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('ALL');
  const [selectedBudget, setSelectedBudget] = useState('ALL');
  const [feedSource, setFeedSource] = useState('ALL'); // 'ALL', 'ORGANIZER', 'PUBLIC', 'SAVED'
  const [savedPackages, setSavedPackages] = useState({});
  const [saveCounts, setSaveCounts] = useState({});
  const [likedPackages, setLikedPackages] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = selectedDuration !== 'ALL' || selectedBudget !== 'ALL';

  const fetchMarketplaceData = async () => {
    setLoading(true);
    try {
      const [pkgs, orgs, communityTrips] = await Promise.all([
        packagesService.listPackages().catch(() => []),
        organizersService.listOrganizers().catch(() => []),
        tripsService.listCommunityTrips().catch(() => []),
      ]);

      // Format community trips into package card shapes with accurate cover images and creator names
      const formattedCommunity = (communityTrips || []).map((ct) => {
        const totalBudget = Number(ct.budget_total || 0);
        const travelersCount = Number(ct.travelers || 1);
        const pp = ct.budget_per_person || (travelersCount > 0 ? totalBudget / travelersCount : totalBudget);

        return {
          id: ct.id,
          title: ct.title || `Trip to ${ct.destination}`,
          destination: ct.destination,
          duration_days: ct.duration || 4,
          price_per_person: pp,
          budget_total: totalBudget,
          start_date: ct.start_date || null,
          end_date: ct.end_date || null,
          image_url: ct.image_url || null,
          is_public_community: true,
          max_group_size: travelersCount,
          difficulty: 'Flexible',
          organizer_id: null,
          views_count: ct.views_count || 0,
          likes_count: ct.likes_count || 0,
          created_at: ct.created_at || ct.updated_at || null,
          creator_name: (ct.preferences && ct.preferences.lead_contact && ct.preferences.lead_contact.name) ? ct.preferences.lead_contact.name : 'Community Traveler',
          allow_cloning: ct.allow_cloning !== undefined ? Boolean(ct.allow_cloning) : true,
        };
      });

      // Format organizer packages
      const formattedPkgs = (pkgs || []).map((p) => ({
        ...p,
        start_date: p.departure_date || p.start_date || null,
        end_date: p.return_date || p.end_date || null,
        views_count: p.views_count || 0,
        likes_count: p.likes_count || 0,
      }));

      // Combine and sort feed chronologically (latest upload/creation appears first on top)
      const allItems = [...formattedPkgs, ...formattedCommunity];
      allItems.sort((a, b) => {
        const getTimestamp = (item) => {
          if (item.created_at) {
            const parsed = new Date(item.created_at).getTime();
            if (!isNaN(parsed) && parsed > 0) return parsed;
          }
          if (item.updated_at) {
            const parsed = new Date(item.updated_at).getTime();
            if (!isNaN(parsed) && parsed > 0) return parsed;
          }
          return 0;
        };

        const timeA = getTimestamp(a);
        const timeB = getTimestamp(b);
        if (timeA !== timeB) {
          return timeB - timeA; // Descending: latest first
        }
        return String(b.id || '').localeCompare(String(a.id || ''));
      });

      setPackages(allItems);

      const orgMap = {};
      (orgs || []).forEach((o) => {
        orgMap[o.id] = o;
      });
      setOrganizers(orgMap);

      // Load saved state and save counts from localStorage
      const savedIds = JSON.parse(localStorage.getItem('friday_saved_packages') || '[]');
      const savedMap = {};
      savedIds.forEach((id) => {
        savedMap[id] = true;
      });
      setSavedPackages(savedMap);

      const storedCounts = JSON.parse(localStorage.getItem('friday_packages_save_counts') || '{}');
      const initialCounts = { ...storedCounts };
      allItems.forEach((item) => {
        if (initialCounts[item.id] === undefined && item.saves_count) {
          initialCounts[item.id] = item.saves_count;
        }
      });
      setSaveCounts(initialCounts);

      // Load liked state and like counts
      const likedIds = JSON.parse(localStorage.getItem('friday_liked_packages') || '[]');
      const likedMap = {};
      likedIds.forEach((id) => {
        likedMap[id] = true;
      });
      setLikedPackages(likedMap);

      const storedLikeCounts = JSON.parse(localStorage.getItem('friday_packages_like_counts') || '{}');
      const initialLikes = { ...storedLikeCounts };
      allItems.forEach((item) => {
        if (initialLikes[item.id] === undefined) {
          initialLikes[item.id] = item.likes_count || 0;
        }
      });
      setLikeCounts(initialLikes);
    } catch (err) {
      console.error('Error fetching marketplace packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const toggleSave = (pkgId, e) => {
    e.preventDefault();
    e.stopPropagation();

    const savedIds = JSON.parse(localStorage.getItem('friday_saved_packages') || '[]');
    const storedCounts = JSON.parse(localStorage.getItem('friday_packages_save_counts') || '{}');
    let updated;
    let newCount;

    if (savedIds.includes(pkgId)) {
      updated = savedIds.filter((id) => id !== pkgId);
      newCount = Math.max(0, (storedCounts[pkgId] || saveCounts[pkgId] || 1) - 1);
      storedCounts[pkgId] = newCount;
      setSavedPackages((prev) => ({ ...prev, [pkgId]: false }));
      setSaveCounts((prev) => ({ ...prev, [pkgId]: newCount }));
      toast.success('Removed from Saved collection.');
    } else {
      updated = [...savedIds, pkgId];
      newCount = (storedCounts[pkgId] || saveCounts[pkgId] || 0) + 1;
      storedCounts[pkgId] = newCount;
      setSavedPackages((prev) => ({ ...prev, [pkgId]: true }));
      setSaveCounts((prev) => ({ ...prev, [pkgId]: newCount }));
      toast.success('Saved to your collection!');
    }

    localStorage.setItem('friday_saved_packages', JSON.stringify(updated));
    localStorage.setItem('friday_packages_save_counts', JSON.stringify(storedCounts));
  };

  const toggleLike = (pkgId, isCommunity, e) => {
    e.preventDefault();
    e.stopPropagation();

    const likedIds = JSON.parse(localStorage.getItem('friday_liked_packages') || '[]');
    const storedLikeCounts = JSON.parse(localStorage.getItem('friday_packages_like_counts') || '{}');
    let updated;
    let newCount;

    if (likedIds.includes(pkgId)) {
      updated = likedIds.filter((id) => id !== pkgId);
      newCount = Math.max(0, (storedLikeCounts[pkgId] || likeCounts[pkgId] || 1) - 1);
      storedLikeCounts[pkgId] = newCount;
      setLikedPackages((prev) => ({ ...prev, [pkgId]: false }));
      setLikeCounts((prev) => ({ ...prev, [pkgId]: newCount }));
    } else {
      updated = [...likedIds, pkgId];
      newCount = (storedLikeCounts[pkgId] || likeCounts[pkgId] || 0) + 1;
      storedLikeCounts[pkgId] = newCount;
      setLikedPackages((prev) => ({ ...prev, [pkgId]: true }));
      setLikeCounts((prev) => ({ ...prev, [pkgId]: newCount }));
      toast.success('Liked this itinerary! ❤️');
      if (isCommunity) {
        tripsService.toggleLike(pkgId);
      }
    }

    localStorage.setItem('friday_liked_packages', JSON.stringify(updated));
    localStorage.setItem('friday_packages_like_counts', JSON.stringify(storedLikeCounts));
  };

  const handleCloneCommunityTrip = async (e, tripId) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOrganizer) {
      toast.error('Organizers cannot copy traveler trip itineraries. Only traveler accounts can clone community trips.');
      return;
    }
    try {
      toast.loading('Cloning itinerary to your private workspace...', { id: 'clone-explore-toast' });
      const res = await tripsService.cloneTrip(tripId);
      toast.success(res.message || 'Itinerary cloned! Opening your custom draft...', { id: 'clone-explore-toast' });
      const targetId = res.id || res.trip?.id;
      navigate(`/plan-trip?tripId=${targetId}`);
    } catch (err) {
      console.error('Error cloning trip:', err);
      toast.error(err.response?.data?.detail || err.message || 'Failed to clone trip.', { id: 'clone-explore-toast' });
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    // Feed Source filter (All vs By Organizer vs By Public vs Saved)
    if (feedSource === 'SAVED') {
      if (!savedPackages[pkg.id]) return false;
    } else if (feedSource === 'ORGANIZER') {
      if (pkg.is_public_community === true) return false;
    } else if (feedSource === 'PUBLIC') {
      if (pkg.is_public_community !== true && pkg.organizer_id) return false;
    }

    if (searchDestination.trim()) {
      const query = searchDestination.toLowerCase();
      const matchDest = pkg.destination?.toLowerCase().includes(query);
      const matchTitle = pkg.title?.toLowerCase().includes(query);
      if (!matchDest && !matchTitle) return false;
    }

    if (selectedDuration !== 'ALL') {
      const days = pkg.duration_days;
      if (selectedDuration === 'SHORT' && days > 3) return false;
      if (selectedDuration === 'MEDIUM' && (days < 4 || days > 6)) return false;
      if (selectedDuration === 'LONG' && days < 7) return false;
    }

    if (selectedBudget !== 'ALL') {
      const price = pkg.price_per_person || 0;
      if (selectedBudget === 'BUDGET' && price > 35000) return false;
      if (selectedBudget === 'MID' && (price < 35000 || price > 60000)) return false;
      if (selectedBudget === 'PREMIUM' && price < 60000) return false;
    }

    return true;
  });

  return (
    <div className="w-full flex-1 flex justify-between min-h-screen">
      {/* ─── CENTER FEED (Max width 800px, centered) ───────────────── */}
      <div className="flex-1 flex justify-center px-3 sm:px-6 lg:px-12 py-6 w-full max-w-full overflow-hidden">
        <div className="w-full max-w-[760px] flex flex-col gap-5 overflow-hidden">
          {/* Sticky Search Header */}
          <header className="sticky top-0 bg-[#F8FAF6]/95 backdrop-blur-md z-30 pt-1 pb-1">
            <div className="relative w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717975]" />
              <input
                type="text"
                placeholder="Where to next?"
                value={searchDestination}
                onChange={(e) => setSearchDestination(e.target.value)}
                className="w-full bg-[#F3F4F0] border border-black/10 rounded-full py-3.5 pl-14 pr-6 text-sm text-[#191C1A] placeholder-[#717975] focus:outline-none focus:border-[#420E00] shadow-inner transition-all"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>
          </header>

          {/* Editorial Headline & Filter Row */}
          <div className="space-y-3 -mt-1">
            <h2
              className="text-4xl sm:text-5xl font-normal italic leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif", color: "#00261D" }}
            >
              Find somewhere worth getting lost in
            </h2>

            {/* ─── ALL / BY ORGANIZER / BY PUBLIC / SAVED (Left) & FILTER DROPDOWN (Right) ──────────── */}
            <div className="flex items-center justify-between gap-1 sm:gap-2 relative w-full">
              {/* Left Feed Source Tabs */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink">
                <button
                  onClick={() => setFeedSource('ALL')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    feedSource === 'ALL'
                      ? 'bg-[#00261D] text-white shadow-xs'
                      : 'bg-[#E7E9E5] text-[#414845] hover:bg-[#DCDFD9] hover:text-[#00261D]'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>All</span>
                </button>

                <button
                  onClick={() => setFeedSource('ORGANIZER')}
                  className={`px-2 sm:px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    feedSource === 'ORGANIZER'
                      ? 'bg-[#00261D] text-white shadow-xs'
                      : 'bg-[#E7E9E5] text-[#414845] hover:bg-[#DCDFD9] hover:text-[#00261D]'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span className="hidden sm:inline">By </span>
                  <span>Organizer</span>
                </button>

                <button
                  onClick={() => setFeedSource('PUBLIC')}
                  className={`px-2 sm:px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    feedSource === 'PUBLIC'
                      ? 'bg-[#00261D] text-white shadow-xs'
                      : 'bg-[#E7E9E5] text-[#414845] hover:bg-[#DCDFD9] hover:text-[#00261D]'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <Users className="w-3 h-3" />
                  <span className="hidden sm:inline">By </span>
                  <span>Public</span>
                </button>

                <button
                  onClick={() => setFeedSource('SAVED')}
                  className={`p-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    feedSource === 'SAVED'
                      ? 'bg-[#00261D] text-white shadow-xs'
                      : 'bg-[#E7E9E5] text-[#414845] hover:bg-[#DCDFD9] hover:text-[#00261D]'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  title="View Saved Trips"
                  aria-label="View Saved Trips"
                >
                  <Bookmark className={`w-3 h-3 ${feedSource === 'SAVED' ? 'fill-white' : ''}`} />
                </button>
              </div>

              {/* Right Filter Button & Dropdown */}
              <div className="relative shrink-0" ref={filterRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`p-1.5 sm:px-3 sm:py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                    isFilterOpen || hasActiveFilters
                      ? 'bg-[#00261D] text-white shadow-xs'
                      : 'bg-[#E7E9E5] text-[#414845] hover:bg-[#DCDFD9] hover:text-[#00261D]'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  title="Filter options"
                  aria-label="Filter options"
                >
                  <span className="hidden sm:inline">Filter</span>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#BBEAD5]" />
                  )}
                </button>

                {/* Filter Popover Dropdown */}
                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[300px] sm:w-[330px] bg-white border border-black/10 rounded-2xl shadow-xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-black/5">
                      <span className="text-xs font-bold text-[#191C1A] uppercase tracking-wider">Filters</span>
                      {hasActiveFilters && (
                        <button
                          onClick={() => {
                            setSelectedDuration('ALL');
                            setSelectedBudget('ALL');
                          }}
                          className="text-[11px] font-semibold text-[#00261D] hover:underline cursor-pointer"
                        >
                          Reset All
                        </button>
                      )}
                    </div>

                    {/* Duration Pills */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-[#717975] uppercase tracking-wider block">Duration</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['ALL', 'SHORT', 'MEDIUM', 'LONG'].map((dur) => (
                          <button
                            key={dur}
                            onClick={() => setSelectedDuration(dur)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              selectedDuration === dur
                                ? 'bg-[#00261D] text-white shadow-xs'
                                : 'bg-[#F3F4F0] text-[#414845] hover:bg-[#E7E9E5]'
                            }`}
                          >
                            {dur === 'ALL' ? 'All' : dur === 'SHORT' ? '1-3 Days' : dur === 'MEDIUM' ? '4-6 Days' : '7+ Days'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget Pills */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-[#717975] uppercase tracking-wider block">Budget</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['ALL', 'BUDGET', 'MID', 'PREMIUM'].map((b) => (
                          <button
                            key={b}
                            onClick={() => setSelectedBudget(b)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              selectedBudget === b
                                ? 'bg-[#00261D] text-white shadow-xs'
                                : 'bg-[#F3F4F0] text-[#414845] hover:bg-[#E7E9E5]'
                            }`}
                          >
                            {b === 'ALL' ? 'All' : b === 'BUDGET' ? '< 35k' : b === 'MID' ? '35k-60k' : '60k+'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feed Content */}
          {loading ? (
            <div className="space-y-8">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-3xl border border-black/10 p-5 bg-white space-y-4 shadow-sm">
                  <Skeleton className="h-80 w-full rounded-2xl" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredPackages.length > 0 ? (
            <div className="flex flex-col gap-10">
              {filteredPackages.map((pkg) => {
                const isCommunity = pkg.is_public_community === true;
                const org = organizers[pkg.organizer_id];
                const isSaved = !!savedPackages[pkg.id];
                const isLiked = !!likedPackages[pkg.id];
                const targetLink = isCommunity ? `/trips/${pkg.id}` : `/explore/${pkg.id}`;

                return (
                  <article
                    key={pkg.id}
                    onClick={() => navigate(targetLink, { state: { from: 'explore' } })}
                    className="group bg-white rounded-3xl border border-black/10 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    {/* 400px Image Container with Film Matte Overlay */}
                    <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-gradient-to-br from-[#001E17] via-[#00261D] to-[#011410] flex items-center justify-center">
                      {pkg.image_url ? (
                        <img
                          src={pkg.image_url}
                          alt={pkg.title}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const el = e.currentTarget.nextElementSibling;
                            if (el) el.style.display = 'flex';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                        />
                      ) : null}
                      <div
                        className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-emerald-200"
                        style={{ display: pkg.image_url ? 'none' : 'flex' }}
                      >
                        <span className="text-6xl mb-2 select-none">{getContextualEmoji(pkg.destination, pkg.title)}</span>
                        <span className="text-xs uppercase tracking-widest font-semibold opacity-70">
                          {pkg.destination || 'Expedition'}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                      {/* Badges: Public / Organizer + Travel Dates (Top-Left) */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap max-w-[70%]">
                        <div className="bg-white/95 backdrop-blur-md text-[#00261D] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase shadow-xs">
                          {isCommunity ? (
                            <>
                              <Users className="w-3.5 h-3.5 text-emerald-800" />
                              Public
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Organizer
                            </>
                          )}
                        </div>

                        {pkg.start_date && (
                          <div className="bg-white/95 backdrop-blur-md text-[#00261D] px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold shadow-xs">
                            <Calendar className="w-3.5 h-3.5 text-[#00261D]" />
                            <span>{pkg.start_date}{pkg.end_date ? ` → ${pkg.end_date}` : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Views Count Overlay Badge (Bottom-Right of Image) */}
                      <div className="absolute bottom-4 right-4 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white shadow-2xs">
                        <Eye className="w-3.5 h-3.5 text-[#BBEAD5]" />
                        <span className="text-[11px] font-bold">
                          {pkg.views_count || 0} {pkg.views_count === 1 ? 'view' : 'views'}
                        </span>
                      </div>

                      {/* Like (Heart) & Save (Bookmark) Action Row (Top-Right) */}
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        {/* Like Button */}
                        <button
                          onClick={(e) => toggleLike(pkg.id, isCommunity, e)}
                          className={`backdrop-blur-md flex flex-col items-center justify-center transition-all duration-200 cursor-pointer shadow-sm ${
                            isLiked
                              ? 'bg-rose-600 text-white scale-105 shadow-md ring-2 ring-white/60'
                              : 'bg-white/90 text-[#00261D] hover:bg-white hover:scale-105'
                          } ${
                            (likeCounts[pkg.id] || 0) > 0
                              ? 'min-w-[40px] px-2 py-1.5 rounded-2xl gap-0.5'
                              : 'h-10 w-10 rounded-full'
                          }`}
                          title={isLiked ? 'Unlike itinerary' : 'Like itinerary'}
                          aria-label={isLiked ? 'Unlike' : 'Like'}
                        >
                          <Heart className={`w-4 h-4 transition-transform ${isLiked ? 'fill-white text-white' : 'text-rose-600'}`} />
                          {(likeCounts[pkg.id] || 0) > 0 && (
                            <span className={`text-[10px] font-extrabold leading-none tracking-tight ${isLiked ? 'text-white' : 'text-[#00261D]'}`}>
                              {likeCounts[pkg.id]}
                            </span>
                          )}
                        </button>

                        {/* Save / Bookmark Button */}
                        <button
                          onClick={(e) => toggleSave(pkg.id, e)}
                          className={`backdrop-blur-md flex flex-col items-center justify-center transition-all duration-200 cursor-pointer shadow-sm ${
                            isSaved
                              ? 'bg-[#00261D] text-[#BBEAD5] scale-105 shadow-md ring-2 ring-white/60'
                              : 'bg-white/90 text-[#00261D] hover:bg-white hover:scale-105'
                          } ${
                            (saveCounts[pkg.id] || 0) > 0
                              ? 'min-w-[40px] px-2 py-1.5 rounded-2xl gap-0.5'
                              : 'h-10 w-10 rounded-full'
                          }`}
                          title={isSaved ? 'Remove from Saved' : 'Save to Bookmarks'}
                          aria-label={isSaved ? 'Remove from Saved' : 'Save to Bookmarks'}
                        >
                          <Bookmark className={`w-4 h-4 transition-transform ${isSaved ? 'fill-[#BBEAD5]' : ''}`} />
                          {(saveCounts[pkg.id] || 0) > 0 && (
                            <span
                              className={`text-[10px] font-extrabold leading-none tracking-tight ${
                                isSaved ? 'text-[#BBEAD5]' : 'text-[#00261D]'
                              }`}
                            >
                              {saveCounts[pkg.id]}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 md:p-8 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3
                            className="text-3xl font-normal text-[#00261D] mb-1"
                            style={{ fontFamily: "'Instrument Serif', serif" }}
                          >
                            {pkg.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-[#717975] flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                            <MapPin className="w-4 h-4 text-[#717975] shrink-0" />
                            {pkg.destination || 'Gilgit-Baltistan, Pakistan'}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="block text-2xl sm:text-3xl font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                            PKR {Number(isCommunity ? (pkg.budget_total || pkg.price_per_person || 0) : (pkg.price_per_person || 0)).toLocaleString()}
                          </span>
                          <span className="text-[11px] text-[#717975]">
                            {isCommunity
                              ? (pkg.max_group_size > 1 ? `total budget (${pkg.max_group_size} travelers)` : 'total budget')
                              : 'per person'}
                          </span>
                        </div>
                      </div>

                      {/* Host / Author Row */}
                      <div className="flex items-center gap-4 py-4 border-y border-black/10">
                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-black/10 flex items-center justify-center font-bold text-black shrink-0">
                          {isCommunity
                            ? (pkg.creator_name ? pkg.creator_name.charAt(0).toUpperCase() : 'U')
                            : (org?.name?.charAt(0) || 'H')}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#00261D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {isCommunity
                              ? `Shared by ${pkg.creator_name || 'Community Traveler'}`
                              : `Hosted by ${org?.name || 'Alpine Treks & Expeditions'}`}
                          </p>
                          <p className="text-[11px] text-[#717975] flex items-center gap-1">
                            {isCommunity ? (
                              Number(pkg.rating) > 0 && Number(pkg.reviews_count) > 0 ? (
                                <span className="flex items-center gap-1 font-semibold text-[#00261D]">
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                  <span>
                                    {Number(pkg.rating).toFixed(1)} ({pkg.reviews_count}{' '}
                                    {Number(pkg.reviews_count) === 1 ? 'review' : 'reviews'})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-700 inline" />
                                  <span>Verified Community Traveler</span>
                                </span>
                              )
                            ) : (
                              Number(pkg.rating) > 0 && Number(pkg.reviews_count) > 0 ? (
                                <span className="flex items-center gap-1 font-semibold text-[#00261D]">
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                  <span>
                                    {Number(pkg.rating).toFixed(1)} ({pkg.reviews_count}{' '}
                                    {Number(pkg.reviews_count) === 1 ? 'review' : 'reviews'})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  ✨ New Tour Package
                                </span>
                              )
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Card Footer Details & CTA */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                        <div className="flex gap-4 sm:gap-6 text-xs flex-wrap">
                          <div>
                            <span className="text-[10px] text-[#717975] uppercase font-semibold block">Duration</span>
                            <span className="font-semibold text-[#00261D]">{pkg.duration_days || 3} Days</span>
                          </div>
                          {pkg.start_date && (
                            <div>
                              <span className="text-[10px] text-[#717975] uppercase font-semibold block">Dates</span>
                              <span className="font-semibold text-[#00261D] flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#717975]" />
                                {pkg.start_date}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] text-[#717975] uppercase font-semibold block">Difficulty</span>
                            <span className="font-semibold text-[#00261D]">{pkg.difficulty || 'Flexible'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#717975] uppercase font-semibold block">Group Size</span>
                            <span className="font-semibold text-[#00261D]">
                              {isCommunity ? `${pkg.max_group_size || 2} Person(s)` : `Max ${pkg.max_group_size || 12}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#717975] uppercase font-semibold block">Impressions</span>
                            <span className="font-semibold text-[#00261D] flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-[#717975]" />
                              {pkg.views_count || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {isCommunity && !isOrganizer && pkg.allow_cloning !== false && (
                            <button
                              type="button"
                              onClick={(e) => handleCloneCommunityTrip(e, pkg.id)}
                              className="flex-1 sm:flex-none bg-[#E7F7EE] hover:bg-[#D4F0E2] text-[#00261D] rounded-full px-4 py-3 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 whitespace-nowrap"
                              title="Copy this itinerary"
                            >
                              <Copy className="w-3.5 h-3.5 text-emerald-800" />
                              <span>Copy Trip</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(targetLink, { state: { from: 'explore' } });
                            }}
                            className="flex-1 sm:flex-none bg-[#00261D] hover:bg-[#00261D]/90 text-white rounded-full px-5 sm:px-6 py-3 text-xs uppercase font-bold tracking-wider sm:tracking-widest flex items-center justify-center gap-2 group-hover:gap-3 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                          >
                            <span>View Trip</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={
                feedSource === 'SAVED'
                  ? 'No Saved Expeditions Yet'
                  : feedSource === 'PUBLIC'
                  ? 'No Public Trips Published Yet'
                  : 'No Expeditions Found'
              }
              description={
                feedSource === 'SAVED'
                  ? 'You haven\'t bookmarked any expeditions yet. Click the heart icon on any tour package to save it here for quick access.'
                  : feedSource === 'PUBLIC'
                  ? 'There are currently no community shared itineraries published by travelers. Check back soon or switch to "By Organizer".'
                  : 'No verified organizer packages match your filter criteria. Try adjusting your destination, duration, or budget filters.'
              }
              actionText={feedSource === 'SAVED' ? 'Browse Expeditions' : 'Reset Filters'}
              onAction={() => {
                setSearchDestination('');
                setSelectedDuration('ALL');
                setSelectedBudget('ALL');
                setFeedSource('ORGANIZER');
              }}
            />
          )}
        </div>
      </div>

      {/* ─── RIGHT DISCOVERY SIDEBAR (Hidden on < XL screens) ──────── */}
      <aside className="hidden xl:flex flex-col w-80 p-8 shrink-0 border-l border-black/10 space-y-8 bg-[#F8FAF6] sticky top-0 h-screen overflow-y-auto">
        {/* Card 1: Ready for the North? (Soft Light Theme) */}
        <div className="bg-[#F3F4F0] rounded-2xl p-6 border border-black/10 shadow-xs relative overflow-hidden flex flex-col justify-between h-72">
          {/* Subtle Decorative Gradient */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#BBEAD5]/30 rounded-bl-full pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-[#717975]">
              <Sparkles className="w-3.5 h-3.5 text-[#00261D]" />
              <span>Your Next Adventure</span>
            </div>
            <h3
              className="text-3xl font-normal text-[#00261D] leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Ready for the North?
            </h3>
            <p className="text-xs text-[#555E59] leading-relaxed pt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Based on your saved items, an autumn trip to Phander Valley matches your style perfectly.
            </p>
          </div>

          <Link to="/plan-trip" className="relative z-10">
            <button className="w-full bg-white hover:bg-[#E7E9E5] text-[#00261D] border border-black/15 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Itinerary</span>
            </button>
          </Link>
        </div>

        {/* Card 2: Popular in Pakistan / Top 4 Most Saved Trips */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pl-1">
            <span
              className="text-xs uppercase font-bold tracking-wider text-[#414845]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Popular in Pakistan
            </span>
            <span className="text-[10px] font-bold text-[#717975] uppercase tracking-wider">Top Saved</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3.5 p-2 rounded-2xl border border-black/10 bg-white">
                  <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : (() => {
              const qualifiedItems = [...packages]
                .map((pkg) => ({
                  ...pkg,
                  saves: saveCounts[pkg.id] || 0,
                }))
                .filter((pkg) => pkg.saves >= 3)
                .sort((a, b) => {
                  if (b.saves !== a.saves) {
                    return b.saves - a.saves; // Highest saves first (e.g. 10, 7, 5, 4, 3)
                  }
                  const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                  const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                  if (timeA !== timeB) return timeB - timeA;
                  return String(b.id || '').localeCompare(String(a.id || ''));
                })
                .slice(0, 4);

              if (qualifiedItems.length === 0) {
                return (
                  <div className="p-5 rounded-2xl border border-dashed border-black/15 bg-white/60 text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#E7F7EE] flex items-center justify-center mx-auto text-emerald-800">
                      <Bookmark className="w-4 h-4 fill-emerald-800" />
                    </div>
                    <p className="text-xs font-bold text-[#00261D]">No Trending Trips Yet</p>
                    <p className="text-[11px] text-[#717975] leading-relaxed">
                      Trips require a minimum of <strong className="text-[#00261D]">3 saves</strong> from travelers to enter Popular in Pakistan.
                    </p>
                  </div>
                );
              }

              return qualifiedItems.map((item) => {
                const isCommunity = item.is_public_community === true;
                const targetLink = isCommunity ? `/trips/${item.id}` : `/explore/${item.id}`;
                const saves = item.saves;

                return (
                  <Link
                    key={item.id}
                    to={targetLink}
                    state={{ from: 'explore' }}
                    className="group flex items-center gap-3.5 p-2.5 rounded-2xl border border-black/10 bg-white hover:border-[#00261D] hover:shadow-md transition-all cursor-pointer block"
                  >
                    <div className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-[#001E17] via-[#00261D] to-[#011410] flex items-center justify-center">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const el = e.currentTarget.nextElementSibling;
                            if (el) el.style.display = 'flex';
                          }}
                          className="w-full h-full object-cover shadow-2xs group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : null}
                      <div
                        className="w-full h-full flex items-center justify-center text-xl select-none"
                        style={{ display: item.image_url ? 'none' : 'flex' }}
                      >
                        {getContextualEmoji(item.destination, item.title)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5
                          className="text-sm font-bold text-[#00261D] group-hover:underline truncate"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          {item.title}
                        </h5>
                      </div>
                      <p className="text-xs text-[#717975] truncate mt-0.5 flex items-center gap-1.5">
                        <span>{item.destination}</span>
                        <span className="text-black/30">•</span>
                        <span>{item.duration_days} Days</span>
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="font-semibold text-[#00261D]">
                          PKR {Number(item.price_per_person || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-[#E7F7EE] px-2 py-0.5 rounded-full">
                          <Bookmark className="w-2.5 h-2.5 fill-emerald-800" />
                          {saves} saves
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              });
            })()}
          </div>
        </div>
      </aside>
    </div>
  );
}
