import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, MapPin, ArrowRight, ShieldCheck, Clock, Search } from 'lucide-react';
import { groupsService } from '../../services/groups';
import EmptyState from '../../components/shared/EmptyState';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function OrganizerGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const data = await groupsService.listOrganizerGroups();
        setGroups(data || []);
      } catch (err) {
        console.error('Error fetching organizer trip groups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Fetching your trip groups..." />;
  }

  const filteredGroups = groups.filter((g) =>
    g.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.destination?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* ─── Header (Stitch 17_trip_communities.html) ─────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#420E00] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            ROAD CREW / COMMUNITY & DISPATCH
          </p>
          <h1
            className="text-5xl sm:text-6xl font-normal text-black leading-tight italic"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Stay close to your crew.
          </h1>
          <p className="text-sm text-[#6F6F6F]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Broadcast real-time announcements, answer traveler gear inquiries, and coordinate expedition departures.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-[#6F6F6F] absolute left-4 top-3.5" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search communities..."
            className="w-full bg-white border border-black/10 rounded-full pl-11 pr-5 py-3 text-xs text-black focus:outline-none focus:border-black shadow-xs"
          />
        </div>
      </header>

      {/* ─── Groups Grid ─────────────────────────────────────────────── */}
      {filteredGroups.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Active Trip Communities"
          description="When you publish tour packages and travelers enroll, your dedicated trip groups will appear here."
          actionText="View Published Packages"
          actionHref="/organizer/trips"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGroups.map((group) => {
            const confirmedCount = group.confirmed_travelers_count || 1;
            const maxCap = group.max_travelers || 20;
            const percentFilled = Math.min(100, Math.round((confirmedCount / maxCap) * 100));

            return (
              <article
                key={group.id}
                className="bg-white rounded-3xl border border-black/10 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Visual Cover Banner */}
                <div
                  className="relative h-44 w-full bg-cover bg-center overflow-hidden"
                  style={{
                    backgroundImage: `url('/images/stitch/stitch_asset_6.jpg')`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Active Tag */}
                  <div className="absolute top-4 right-4 bg-[#420E00] text-[#FFDBD0] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                    ACTIVE ROOM
                  </div>

                  {/* Title on Banner */}
                  <div className="absolute bottom-4 left-5 right-5 text-white">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/80 block mb-1">
                      {group.destination || 'Pakistan'}
                    </span>
                    <h3
                      className="text-2xl font-normal leading-tight italic line-clamp-1"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {group.title}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                  {/* Capacity Progress Bar */}
                  <div className="space-y-2 p-4 rounded-2xl bg-[#F8FAF6] border border-black/10 text-xs">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-[#6F6F6F] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-black" /> Confirmed Travelers
                      </span>
                      <span className="font-bold text-black font-mono">
                        {confirmedCount} / {maxCap} ({percentFilled}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-black h-full rounded-full transition-all"
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Link */}
                  <Link to={`/trips/${group.package_id}/group`}>
                    <button className="w-full py-3.5 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-transform hover:scale-[1.02] shadow-md flex items-center justify-center gap-2 cursor-pointer">
                      <MessageSquare className="w-4 h-4" /> Enter Community Chat &rarr;
                    </button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
