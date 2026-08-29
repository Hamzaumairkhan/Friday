import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { packagesService } from '../../services/packages';
import { organizersService } from '../../services/organizers';
import { tripsService } from '../../services/trips';
import EmptyState from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/ui/skeleton';
import toast from 'react-hot-toast';

export default function ExplorePage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [organizers, setOrganizers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchDestination, setSearchDestination] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('ALL');
  const [selectedBudget, setSelectedBudget] = useState('ALL');
  const [feedSource, setFeedSource] = useState('ALL'); // 'ALL', 'ORGANIZER', 'PUBLIC', 'SAVED'
  const [savedPackages, setSavedPackages] = useState({});

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

        const getDestinationFallback = (dest) => {
          const d = (dest || '').toLowerCase();
          if (d.includes('islamabad') || d.includes('margalla') || d.includes('faisal') || d.includes('rawalpindi')) return '/images/stitch/stitch_asset_4.jpg';
          if (d.includes('lahore') || d.includes('badshahi') || d.includes('punjab') || d.includes('faisalabad') || d.includes('multan')) return '/images/stitch/stitch_asset_2.jpg';
          if (d.includes('karachi') || d.includes('gwadar') || d.includes('ormara') || d.includes('kund') || d.includes('sindh')) return '/images/stitch/stitch_asset_5.jpg';
          if (d.includes('swat') || d.includes('kalam') || d.includes('malam') || d.includes('mahudand')) return '/images/stitch/stitch_asset_10.jpg';
          if (d.includes('naran') || d.includes('kaghan') || d.includes('saif') || d.includes('babusar')) return '/images/stitch/stitch_asset_9.jpg';
          if (d.includes('kumrat') || d.includes('jahaz') || d.includes('katora')) return '/images/stitch/stitch_asset_8.jpg';
          if (d.includes('fairy') || d.includes('nanga')) return '/images/stitch/stitch_asset_7.jpg';
          if (d.includes('skardu') || d.includes('deosai') || d.includes('shangrila')) return '/images/stitch/hero_mountains.jpg';
          if (d.includes('hunza') || d.includes('passu') || d.includes('altit') || d.includes('baltit')) return '/images/stitch/stitch_asset_6.jpg';
          return '/images/stitch/panoramic_lake.jpg';
        };

        return {
          id: ct.id,
          title: ct.title || `Trip to ${ct.destination}`,
          destination: ct.destination,
          duration_days: ct.duration || 4,
          price_per_person: pp,
          budget_total: totalBudget,
          image_url: ct.image_url || getDestinationFallback(ct.destination),
          is_public_community: true,
          max_group_size: travelersCount,
          difficulty: 'Flexible',
          organizer_id: null,
          creator_name: (ct.preferences && ct.preferences.lead_contact && ct.preferences.lead_contact.name) ? ct.preferences.lead_contact.name : 'Community Traveler',
        };
      });

      setPackages([...(pkgs || []), ...formattedCommunity]);

      const orgMap = {};
      (orgs || []).forEach((o) => {
        orgMap[o.id] = o;
      });
      setOrganizers(orgMap);

      // Load saved state from localStorage
      const savedIds = JSON.parse(localStorage.getItem('friday_saved_packages') || '[]');
      const savedMap = {};
      savedIds.forEach((id) => {
        savedMap[id] = true;
      });
      setSavedPackages(savedMap);
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
    let updated;
    if (savedIds.includes(pkgId)) {
      updated = savedIds.filter((id) => id !== pkgId);
      setSavedPackages((prev) => ({ ...prev, [pkgId]: false }));
      toast.success('Removed from Saved collection.');
    } else {
      updated = [...savedIds, pkgId];
      setSavedPackages((prev) => ({ ...prev, [pkgId]: true }));
      toast.success('Added to Saved collection!');
    }
    localStorage.setItem('friday_saved_packages', JSON.stringify(updated));
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
        <div className="w-full max-w-[760px] flex flex-col gap-8 overflow-hidden">
          {/* Sticky Search & Filters Header */}
          <header className="sticky top-0 bg-[#F8FAF6]/95 backdrop-blur-md z-30 py-3 space-y-3">
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

            {/* Sub-Filters: Duration & Budget Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <div className="flex items-center gap-1.5 bg-[#E7E9E5] p-1 rounded-full text-xs shrink-0">
                <span className="px-2 font-medium text-[#717975] uppercase text-[10px]">Duration:</span>
                {['ALL', 'SHORT', 'MEDIUM', 'LONG'].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setSelectedDuration(dur)}
                    className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                      selectedDuration === dur ? 'bg-[#00261D] text-white shadow-xs' : 'text-[#414845] hover:text-[#00261D]'
                    }`}
                  >
                    {dur === 'ALL' ? 'All' : dur === 'SHORT' ? '1-3 Days' : dur === 'MEDIUM' ? '4-6 Days' : '7+ Days'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 bg-[#E7E9E5] p-1 rounded-full text-xs shrink-0">
                <span className="px-2 font-medium text-[#717975] uppercase text-[10px]">Budget:</span>
                {['ALL', 'BUDGET', 'MID', 'PREMIUM'].map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBudget(b)}
                    className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                      selectedBudget === b ? 'bg-[#00261D] text-white shadow-xs' : 'text-[#414845] hover:text-[#00261D]'
                    }`}
                  >
                    {b === 'ALL' ? 'All' : b === 'BUDGET' ? '< 35k' : b === 'MID' ? '35k-60k' : '60k+'}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* Editorial Headline & Filter Buttons */}
          <div className="space-y-4">
            <h2
              className="text-4xl sm:text-5xl font-normal italic  leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif", color:"#00261D" }}
            >
              Find somewhere worth getting lost in
            </h2>

            {/* ─── ALL / BY ORGANIZER / BY PUBLIC / SAVED (Icon Only) ──────────── */}
            <div className="flex items-center gap-2.5 pt-1 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setFeedSource('ALL')}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  feedSource === 'ALL'
                    ? 'bg-[#00261D] text-white shadow-xs scale-105'
                    : 'bg-[#E7E9E5] text-[#414845] hover:bg-[#DCDFD9] hover:text-[#00261D]'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Sparkles className="w-4 h-4" />
                <span>All</span>
              </button>

              <button
                onClick={() => setFeedSource('ORGANIZER')}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  feedSource === 'ORGANIZER'
                    ? 'bg-[#00261D] text-white shadow-xs scale-105'
                    : 'bg-[#E7E9E5] text-[#414845] hover:bg-[#DCDFD9] hover:text-[#00261D]'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>By Organizer</span>
              </button>

              <button
                onClick={() => setFeedSource('PUBLIC')}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  feedSource === 'PUBLIC'
                    ? 'bg-[#00261D] text-white shadow-xs scale-105'
                    : 'bg-[#E7E9E5] text-[#414845] hover:bg-[#DCDFD9] hover:text-[#00261D]'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Users className="w-4 h-4" />
                <span>By Public</span>
              </button>

              <button
                onClick={() => setFeedSource('SAVED')}
                className={`p-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  feedSource === 'SAVED'
                    ? 'bg-[#00261D] text-white shadow-xs scale-105'
                    : 'bg-[#E7E9E5] text-[#414845] hover:bg-[#DCDFD9] hover:text-[#00261D]'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
                title="View Saved Trips"
                aria-label="View Saved Trips"
              >
                <Bookmark className={`w-4 h-4 ${feedSource === 'SAVED' ? 'fill-white' : ''}`} />
              </button>
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
                const targetLink = isCommunity ? `/trips/${pkg.id}` : `/explore/${pkg.id}`;

                return (
                  <article
                    key={pkg.id}
                    className="group bg-white rounded-2xl border border-black/10 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300"
                  >
                    {/* 400px Image Container with Film Matte Overlay */}
                    <div className="relative h-[360px] sm:h-[400px] w-full overflow-hidden bg-slate-100">
                      <img
                        src={pkg.image_url || '/images/stitch/stitch_asset_1.jpg'}
                        alt={pkg.title}
                        onError={(e) => {
                          e.currentTarget.src = '/images/stitch/stitch_asset_1.jpg';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                      {/* Verified / Community Badge */}
                      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-[#00261D] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase shadow-xs">
                        {isCommunity ? (
                          <>
                            <Users className="w-3.5 h-3.5 text-emerald-800" />
                            Community Shared Trip
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Verified Expedition
                          </>
                        )}
                      </div>

                      {/* Save / Bookmark Button */}
                      <button
                        onClick={(e) => toggleSave(pkg.id, e)}
                        className={`absolute top-4 right-4 h-10 w-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                          isSaved
                            ? 'bg-[#00261D] text-[#BBEAD5] scale-105 shadow-md ring-2 ring-white/60'
                            : 'bg-white/90 text-[#00261D] hover:bg-white hover:scale-105'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save to Bookmarks'}
                        aria-label={isSaved ? 'Remove from Saved' : 'Save to Bookmarks'}
                      >
                        <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-[#BBEAD5]' : ''}`} />
                      </button>
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
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-700 inline" />
                                <span>Verified Community Traveler</span>
                              </span>
                            ) : (
                              <>
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>{org?.rating || 4.9} ({org?.reviews_count || 48} reviews)</span>
                              </>
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
                        </div>

                        <Link to={targetLink} className="w-full sm:w-auto">
                          <button className="w-full sm:w-auto bg-[#00261D] hover:bg-[#00261D]/90 text-white rounded-full px-6 py-3 text-xs uppercase font-bold tracking-widest flex items-center justify-center gap-2 group-hover:gap-3 transition-all cursor-pointer shadow-sm">
                            <span>{isCommunity ? 'View Itinerary' : 'View Expedition'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
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

        {/* Card 2: Popular in Pakistan (With high-res image thumbnails) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pl-1">
            <span
              className="text-xs uppercase font-bold tracking-wider text-[#414845]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Popular in Pakistan
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                name: 'Fairy Meadows',
                tag: 'Mountain Retreat',
                image: '/images/stitch/stitch_asset_14.jpg',
                fallback: '/images/stitch/hero_mountains.jpg',
                query: 'Fairy Meadows',
              },
              {
                name: 'Lahore Heritage',
                tag: 'Cultural Tour',
                image: '/images/stitch/stitch_asset_19.jpg',
                fallback: '/images/stitch/stitch_asset_1.jpg',
                query: 'Lahore',
              },
              {
                name: 'Attabad Lake',
                tag: 'Water Expedition',
                image: '/images/stitch/stitch_asset_25.jpg',
                fallback: '/images/stitch/register_hero.jpg',
                query: 'Hunza',
              },
              {
                name: 'Skardu Valley',
                tag: 'Cold Desert Retreat',
                image: '/images/stitch/stitch_asset_2.jpg',
                fallback: '/images/stitch/login_hero.jpg',
                query: 'Skardu',
              },
            ].map((spot, idx) => (
              <div
                key={idx}
                onClick={() => setSearchDestination(spot.query)}
                className="group flex items-center gap-3.5 p-2 rounded-2xl border border-black/10 bg-white hover:border-[#00261D] hover:shadow-xs transition-all cursor-pointer"
              >
                <img
                  src={spot.image}
                  alt={spot.name}
                  onError={(e) => {
                    e.currentTarget.src = spot.fallback;
                  }}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-2xs"
                />
                <div className="flex-1 min-w-0">
                  <h5
                    className="text-sm font-bold text-[#00261D] group-hover:underline truncate"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {spot.name}
                  </h5>
                  <p className="text-xs text-[#717975] truncate mt-0.5">{spot.tag}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
