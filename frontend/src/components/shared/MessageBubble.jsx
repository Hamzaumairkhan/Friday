import { ShieldCheck, CheckCheck, User } from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function MessageBubble({ message, isOwnMessage, currentUserAvatar }) {
  const isOrganizer = message.sender_role === 'ORGANIZER';
  const timeFormatted = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const avatarUrl = isOwnMessage ? currentUserAvatar : message.sender_profile_picture;
  const senderName = isOwnMessage ? 'You' : (message.sender_name || 'Traveler');

  return (
    <div className={`flex items-end gap-2.5 max-w-[85%] sm:max-w-[72%] ${isOwnMessage ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'}`}>
      {/* Sender Avatar (DP) */}
      <UserAvatar
        src={avatarUrl}
        name={message.sender_name || (isOwnMessage ? 'You' : 'Traveler')}
        size="sm"
        className="mb-0.5"
      />

      {/* Bubble Container */}
      <div className={`flex flex-col space-y-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Sender Name & Role Label Header */}
        <div className="flex items-center gap-1.5 px-1 text-[11px]">
          <span className={`font-bold ${isOwnMessage ? 'text-[#00261D]' : isOrganizer ? 'text-emerald-800' : 'text-slate-800'}`}>
            {isOwnMessage ? 'You' : message.sender_name}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
              isOrganizer
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {isOrganizer ? (
              <>
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-800" /> Admin
              </>
            ) : (
              <>
                <User className="w-2.5 h-2.5 text-slate-600" /> User
              </>
            )}
          </span>
        </div>

        {/* Speech Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs relative ${
            isOwnMessage
              ? 'bg-[#00261D] text-white rounded-br-xs'
              : isOrganizer
              ? 'bg-[#EBF7F1] text-[#00261D] border border-emerald-200/80 rounded-bl-xs'
              : 'bg-white text-[#1A1A1A] border border-black/10 rounded-bl-xs'
          }`}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <p className="pr-2">{message.message}</p>

          {/* Timestamp & WhatsApp Status Checkmark */}
          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isOwnMessage ? 'text-emerald-200/80' : 'text-[#717975]'}`}>
            <span>{timeFormatted}</span>
            {isOwnMessage && <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
        </div>
      </div>
    </div>
  );
}
