import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  MapPin,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { groupsService } from '../../services/groups';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';

export default function TravelerGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const data = await groupsService.listTravelerGroups();
        setGroups(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching traveler groups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return (
    <div className="w-full flex-1 flex justify-center px-4 sm:px-8 lg:px-12 py-8 min-h-screen bg-[#F8FAF6]">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#717975] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Users className="w-4 h-4 text-[#00261D]" />
              <span>TRAVELER COMMUNITY</span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-normal text-[#00261D]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Trip Groups & Chats
            </h1>
            <p className="text-xs sm:text-sm text-[#717975] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Connect with fellow adventurers and your trip organizer for confirmed expeditions.
            </p>
          </div>

          <Link to="/explore">
            <button className="px-6 py-2.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#00261D]/90 transition-all shadow-xs cursor-pointer">
              Join More Expeditions
            </button>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSpinner text="Loading your expedition groups..." />
        ) : groups.length === 0 ? (
          <EmptyState
            title="No Active Trip Groups"
            description="You don't have any confirmed trip group memberships yet. When you book an organizer tour package, your private group chat and manifest will appear here."
            actionText="Browse Verified Expeditions"
            actionHref="/explore"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-3xl border border-black/10 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#420E00] bg-[#BBEAD5]/30 px-3 py-1 rounded-full">
                        CONFIRMED GROUP
                      </span>
                      <h3
                        className="text-2xl sm:text-3xl font-normal text-[#00261D] mt-2.5"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      >
                        {group.name || group.package?.title || 'Expedition Group'}
                      </h3>
                      <p className="text-xs text-[#717975] flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{group.package?.destination || 'Pakistan'}</span>
                      </p>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-[#00261D]/10 text-[#00261D] flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  <p className="text-xs text-[#414845] leading-relaxed line-clamp-2">
                    {group.description || 'Private coordination group for confirmed travelers and tour leader.'}
                  </p>

                  <div className="flex items-center gap-4 py-3 border-y border-black/10 text-xs text-[#414845]">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#00261D]" />
                      <strong>{group.members_count || 1}</strong> members
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Organizer
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-[#717975]">Active coordination</span>
                  <Link to={`/trips/${group.package_id || group.id}/groups`}>
                    <button className="px-5 py-2.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:scale-105 transition-all shadow-xs cursor-pointer">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open Group Chat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
