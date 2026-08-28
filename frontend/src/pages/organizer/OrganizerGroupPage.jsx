import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Users, ShieldCheck, Megaphone, AlertCircle } from 'lucide-react';
import { groupsService } from '../../services/groups';
import GroupChat from '../../components/shared/GroupChat';
import GroupMemberList from '../../components/shared/GroupMemberList';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Card } from '../../components/ui/card';

export default function OrganizerGroupPage() {
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
        console.error('Error fetching organizer group details:', err);
        setError(err.message || 'Access restricted.');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [packageId]);

  if (loading) {
    return <LoadingSpinner text="Connecting to your trip group workspace..." />;
  }

  if (error || !group) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Group Unavailable
        </h2>
        <p className="text-sm text-muted-foreground">
          {error || 'Unable to load this trip group.'}
        </p>
        <Link to="/organizer/groups">
          <button className="px-6 py-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-medium">
            Back to Trip Groups
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Navigation */}
      <div>
        <Link
          to="/organizer/groups"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Trip Groups
        </Link>
      </div>

      {/* Header Banner */}
      <Card className="p-6 sm:p-8 space-y-4 border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-foreground">
                <MapPin className="w-3 h-3" /> {group.destination || 'Pakistan'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-foreground">
                <Clock className="w-3 h-3" /> {group.duration_days ? `${group.duration_days} Days` : 'Trip'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                <ShieldCheck className="w-3.5 h-3.5" /> Host Organizer Controls
              </span>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-normal text-foreground"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {group.title} — Group Management
            </h1>
          </div>

          <Link to={`/organizer/trips/${group.package_id}/edit`}>
            <button className="px-5 py-2 rounded-full border border-border text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Edit Package Settings
            </button>
          </Link>
        </div>
      </Card>

      {/* Main Grid: Chat Stream + Member Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GroupChat packageId={packageId} groupTitle={group.title} />
        </div>
        <div className="lg:col-span-1">
          <GroupMemberList group={group} members={group.members || []} />
        </div>
      </div>
    </div>
  );
}
