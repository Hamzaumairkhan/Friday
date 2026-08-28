import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, ShieldCheck, Users, Megaphone, AlertCircle } from 'lucide-react';
import { groupsService } from '../../services/groups';
import GroupChat from '../../components/shared/GroupChat';
import GroupMemberList from '../../components/shared/GroupMemberList';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function TripGroupPage() {
  const { packageId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGroupData = async () => {
      setLoading(true);
      try {
        const data = await groupsService.getTripGroup(packageId);
        setGroup(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching trip group:', err);
        setError(err.message || 'Access restricted to confirmed travelers for this trip.');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [packageId]);

  if (loading) {
    return <LoadingSpinner text="Connecting to your private trip group..." />;
  }

  if (error || !group) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2
          className="text-3xl font-normal text-black"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Trip Group Restricted
        </h2>
        <p className="text-sm text-[#6F6F6F]" style={{ fontFamily: 'Inter, sans-serif' }}>
          {error || 'This private group is only accessible to travelers with verified, confirmed reservations for this organizer trip.'}
        </p>
        <div className="pt-4">
          <Link to="/my-trips">
            <button className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-medium">
              View My Bookings
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Link */}
      <Link
        to="/my-trips"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#6F6F6F] hover:text-black transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Trips
      </Link>

      {/* ─── Group Header (Stitch 9_trip_group.html) ─────────────────── */}
      <div className="space-y-4 border-b border-black/10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1
            className="text-4xl sm:text-5xl font-normal text-black uppercase"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {group.title}
          </h1>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full w-fit">
            CONFIRMED EXPEDITION
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-[#555E59]">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#6F6F6F]" />
            <span>{group.members?.length || 1} confirmed travelers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#6F6F6F]" />
            <span>{group.duration_days || 5} Days • {group.destination || 'Pakistan'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="font-semibold text-black">Host: {group.organizer_name}</span>
          </div>
        </div>
      </div>

      {/* ─── Pinned Announcement (Stitch) ────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-black/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#420E00]" />
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[#F8FAF6] flex items-center justify-center shrink-0 border border-black/5">
            <Megaphone className="w-5 h-5 text-black" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black uppercase tracking-wider text-[11px]">Verified Host Announcement</span>
              <span className="text-[#6F6F6F]">• Departure Update</span>
            </div>
            <h3 className="text-xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Welcome to the Official Expedition Group!
            </h3>
            <p className="text-[#555E59] leading-relaxed">
              We are excited to have you on board. Please introduce yourselves in the community chat below. Packing lists, departure schedules, and pickup points will be updated here live by your organizer.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Chat & Roster Split Layout ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <GroupChat packageId={packageId} groupTitle={group.title} />
        </div>
        <div className="lg:col-span-4">
          <GroupMemberList members={group.members || []} organizerName={group.organizer_name} />
        </div>
      </div>
    </div>
  );
}
