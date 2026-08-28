import { Users, ShieldCheck, User } from 'lucide-react';
import { Card } from '../ui/card';

export default function GroupMemberList({ group, members = [] }) {
  const organizer = members.find((m) => m.role === 'ORGANIZER');
  const travelers = members.filter((m) => m.role !== 'ORGANIZER');
  const maxCap = group?.max_travelers || 20;
  const confirmedCount = group?.confirmed_travelers_count || travelers.length;

  return (
    <Card className="p-6 space-y-6 border border-border shadow-xs">
      {/* Capacity Header */}
      <div className="space-y-2 border-b border-border pb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Users className="w-4 h-4 text-foreground" /> Enrolled Group Size
          </span>
          <span className="font-bold text-foreground">
            {confirmedCount} / {maxCap} Seats
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-black dark:bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (confirmedCount / maxCap) * 100)}%` }}
          />
        </div>
      </div>

      {/* Organizer Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trip Host & Operator
        </h4>
        <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {organizer?.name?.charAt(0) || 'O'}
          </div>
          <div className="flex-1 truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground truncate">
                {organizer?.name || group?.organizer_name || 'Trip Organizer'}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
            <span className="text-[10px] text-muted-foreground">Trip Operator</span>
          </div>
        </div>
      </div>

      {/* Confirmed Travelers List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Confirmed Travelers ({travelers.length})
        </h4>

        {travelers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No other travelers have joined yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {travelers.map((traveler) => (
              <div
                key={traveler.id || traveler.user_id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border flex items-center gap-3 text-xs"
              >
                {traveler.profile_picture ? (
                  <img
                    src={traveler.profile_picture}
                    alt={traveler.name}
                    className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold shrink-0 text-foreground">
                    {traveler.name?.charAt(0) || 'T'}
                  </div>
                )}
                <div className="flex-1 truncate">
                  <span className="font-medium text-foreground block truncate">
                    {traveler.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Joined {traveler.joined_at ? new Date(traveler.joined_at).toLocaleDateString() : 'Confirmed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
