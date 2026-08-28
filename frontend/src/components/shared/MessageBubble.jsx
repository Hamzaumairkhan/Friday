import { ShieldCheck, User } from 'lucide-react';

export default function MessageBubble({ message, isOwnMessage }) {
  const isOrganizer = message.sender_role === 'ORGANIZER';
  const timeFormatted = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} space-y-1 max-w-[85%] sm:max-w-[75%]`}>
      {/* Sender Header (for other users) */}
      {!isOwnMessage && (
        <div className="flex items-center gap-1.5 px-1 text-xs">
          <span className="font-medium text-foreground">{message.sender_name}</span>
          {isOrganizer && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="w-3 h-3" /> Organizer
            </span>
          )}
        </div>
      )}

      {/* Message Content */}
      <div
        className={`p-4 rounded-3xl text-sm leading-relaxed whitespace-pre-line shadow-xs ${
          isOwnMessage
            ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-xs'
            : isOrganizer
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-foreground rounded-tl-xs'
            : 'bg-slate-100 dark:bg-slate-900 border border-border text-foreground rounded-tl-xs'
        }`}
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {message.message}
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-muted-foreground px-2">
        {timeFormatted}
      </span>
    </div>
  );
}
