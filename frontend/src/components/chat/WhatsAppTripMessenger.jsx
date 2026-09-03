import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Send,
  MessageSquare,
  ShieldCheck,
  Users,
  MapPin,
  Clock,
  CheckCheck,
  Smile,
  Paperclip,
  ChevronLeft,
  Info,
  ExternalLink,
  X,
  Phone,
  Mail,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { groupsService } from '../../services/groups';
import { notificationsService } from '../../services/notifications';
import { useAuth } from '../../context/AuthContext';
import MessageBubble from '../shared/MessageBubble';
import UserAvatar from '../shared/UserAvatar';
import { playNotificationSound } from '../../utils/notificationSound';
import { getContextualEmoji } from '../../utils/contextualEmoji';
import toast from 'react-hot-toast';

export default function WhatsAppTripMessenger({
  isOrganizer = true,
  initialGroupId = null,
}) {
  const navigate = useNavigate();
  const { backendUser, user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeGroupDetails, setActiveGroupDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  const currentUserId = backendUser?.id || user?.uid;

  // 1. Fetch available groups
  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      let data = [];
      if (isOrganizer) {
        data = await groupsService.listOrganizerGroups();
      } else {
        data = await groupsService.listTravelerGroups();
      }
      setGroups(data || []);

      // Auto-select initial group if provided in props or URL
      if (initialGroupId && Array.isArray(data) && data.length > 0) {
        const found = data.find((g) => g.package_id === initialGroupId || g.id === initialGroupId);
        if (found) {
          setSelectedGroup(found);
          setShowMobileChat(true);
        } else if (data.length > 0) {
          setSelectedGroup(data[0]);
        }
      } else if (!selectedGroup && Array.isArray(data) && data.length > 0) {
        setSelectedGroup(data[0]);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      toast.error('Failed to load community groups.');
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [isOrganizer, initialGroupId]);

  // 2. Fetch messages & details for selected group
  const fetchGroupDetailsAndMessages = async (targetId) => {
    try {
      const [details, msgs] = await Promise.all([
        groupsService.getTripGroup(targetId).catch(() => null),
        groupsService.getGroupMessages(targetId).catch(() => []),
      ]);
      if (details) setActiveGroupDetails(details);
      const msgArr = Array.isArray(msgs) ? msgs : [];
      setMessages(msgArr);
      prevMessageCountRef.current = msgArr.length;
    } catch (err) {
      console.error('Error loading group chat:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      setLoadingMessages(true);
      const targetId = selectedGroup.package_id || selectedGroup.id;
      fetchGroupDetailsAndMessages(targetId);

      // Periodic polling for active messages
      const interval = setInterval(() => {
        groupsService
          .getGroupMessages(targetId)
          .then((msgs) => {
            if (Array.isArray(msgs)) {
              if (msgs.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg && lastMsg.sender_id !== currentUserId) {
                  playNotificationSound();
                }
              }
              prevMessageCountRef.current = msgs.length;
              setMessages(msgs);
            }
          })
          .catch(() => {});
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [selectedGroup, currentUserId]);

  // Auto-clear unread chat notifications for this group upon viewing
  useEffect(() => {
    if (!selectedGroup) return;
    const autoClearChatNotifs = async () => {
      try {
        const notifs = await notificationsService.listNotifications();
        if (Array.isArray(notifs)) {
          const targetId = selectedGroup.package_id || selectedGroup.id;
          const chatNotifs = notifs.filter(
            (n) => !n.is_read && (n.type === 'NEW_GROUP_MESSAGE' || n.related_trip_id === targetId || n.related_trip_id === selectedGroup.id)
          );
          if (chatNotifs.length > 0) {
            for (const notif of chatNotifs) {
              await notificationsService.markAsRead(notif.id);
            }
            window.dispatchEvent(new Event('friday_notifications_updated'));
          }
        }
      } catch {}
    };
    autoClearChatNotifs();
  }, [selectedGroup]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Send message handler
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isSending || !selectedGroup) return;

    const textToSend = inputText.trim();
    const targetId = selectedGroup.package_id || selectedGroup.id;
    setInputText('');
    setIsSending(true);

    try {
      const newMsg = await groupsService.sendGroupMessage(targetId, textToSend);
      setMessages((prev) => [...prev, newMsg]);

      // Update last message in local groups list
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroup.id || g.package_id === targetId
            ? {
                ...g,
                last_message: textToSend,
                last_message_at: new Date().toISOString(),
              }
            : g
        )
      );
    } catch (err) {
      console.error('Send message failed:', err);
      toast.error('Failed to send message.');
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  // Filter groups by search query
  const filteredGroups = groups.filter((g) =>
    g.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.destination?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentUserAvatar =
    backendUser?.profile_picture ||
    user?.photoURL ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      backendUser?.name || user?.displayName || 'User'
    )}`;

  const activeTitle =
    activeGroupDetails?.title || selectedGroup?.title || 'Trip Community';
  const activeDestination =
    activeGroupDetails?.destination || selectedGroup?.destination || 'Pakistan';
  const activeConfirmed =
    activeGroupDetails?.confirmed_travelers_count ??
    selectedGroup?.confirmed_travelers_count ??
    0;
  const activeMax =
    activeGroupDetails?.max_travelers ?? selectedGroup?.max_travelers ?? 20;
  const activeImg =
    activeGroupDetails?.image_url ||
    selectedGroup?.image_url ||
    selectedGroup?.cover_image ||
    null;

  return (
    <div className="w-full max-w-7xl mx-auto h-[820px] max-h-[88vh] bg-white rounded-3xl border border-black/10 shadow-xl overflow-hidden flex flex-col md:flex-row">
      {/* ─── LEFT COLUMN: WhatsApp Chat List ──────────────────────────── */}
      <aside
        className={`w-full md:w-96 lg:w-[410px] border-r border-black/10 flex flex-col bg-[#FAFBF9] shrink-0 h-full ${
          showMobileChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Left Sidebar Header */}
        <div className="p-4 border-b border-black/10 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={currentUserAvatar}
              name={backendUser?.name || user?.displayName || (isOrganizer ? "Dev Byte's Expeditions" : 'Friday Traveler')}
              size="md"
            />
            <div>
              <h2 className="text-sm font-bold text-[#00261D] line-clamp-1">
                {backendUser?.name || user?.displayName || (isOrganizer ? "Dev Byte's Expeditions" : 'Friday Traveler')}
              </h2>
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                {isOrganizer ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-700" /> Host & Operator
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 text-emerald-700" /> Confirmed Traveler
                  </>
                )}
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#00261D]/5 text-[#00261D] border border-black/5">
            {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-black/10 bg-[#FAFBF9]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#717975] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start new chat..."
              className="w-full bg-white border border-black/10 rounded-full pl-9 pr-4 py-2 text-xs text-[#00261D] placeholder:text-[#8E9793] focus:outline-none focus:border-[#00261D] shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-black"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto divide-y divide-black/5">
          {loadingGroups ? (
            <div className="p-8 text-center space-y-2 text-[#717975]">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00261D]" />
              <p className="text-xs">Loading communities...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center space-y-3 text-[#717975]">
              <div className="w-10 h-10 rounded-full bg-white border border-black/10 flex items-center justify-center mx-auto">
                <MessageSquare className="w-5 h-5 text-[#717975]" />
              </div>
              <p className="text-xs font-medium">No communities found</p>
              {isOrganizer && (
                <Link
                  to="/organizer/trips"
                  className="text-xs text-emerald-800 font-bold underline block"
                >
                  View your tour packages
                </Link>
              )}
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected =
                selectedGroup &&
                (selectedGroup.id === group.id ||
                  selectedGroup.package_id === group.package_id);

              const formattedTime = group.last_message_at
                ? new Date(group.last_message_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              const groupImg = group.image_url || group.cover_image || null;

              return (
                <div
                  key={group.id || group.package_id}
                  onClick={() => {
                    setSelectedGroup(group);
                    setShowMobileChat(true);
                  }}
                  className={`p-3.5 flex items-center gap-3.5 cursor-pointer transition-all duration-200 hover:bg-black/5 relative ${
                    isSelected
                      ? 'bg-[#EBF5EF] border-l-4 border-[#00261D]'
                      : 'bg-white'
                  }`}
                >
                  {/* Group Thumbnail Photo */}
                  <div className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#001E17] via-[#00261D] to-[#011410] border border-black/10 flex items-center justify-center">
                    {groupImg ? (
                      <img
                        src={groupImg}
                        alt={group.title}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const el = e.currentTarget.nextElementSibling;
                          if (el) el.style.display = 'flex';
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center text-lg select-none"
                      style={{ display: groupImg ? 'none' : 'flex' }}
                    >
                      {getContextualEmoji(group.destination, group.title)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>

                  {/* Group Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-[#00261D] truncate">
                        {group.title}
                      </h4>
                      {formattedTime && (
                        <span className="text-[10px] text-[#717975] shrink-0 font-medium">
                          {formattedTime}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#717975]">
                      <p className="truncate max-w-[170px] sm:max-w-[190px]">
                        {group.last_message ? (
                          <span>{group.last_message}</span>
                        ) : (
                          <span className="italic text-[#8E9793]">
                            No messages yet. Say hello! 👋
                          </span>
                        )}
                      </p>
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        <Users className="w-2.5 h-2.5" />
                        {group.confirmed_travelers_count}/{group.max_travelers || 20}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ─── RIGHT COLUMN: Active WhatsApp Chat Pane ───────────────────── */}
      <main
        className={`flex-1 flex flex-col bg-[#EFEAE2] min-w-0 relative ${
          !showMobileChat ? 'hidden md:flex' : 'flex'
        }`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.025' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {selectedGroup ? (
          <>
            {/* WhatsApp Chat Header */}
            <header className="h-18 px-4 sm:px-6 bg-white border-b border-black/10 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 md:hidden text-black cursor-pointer"
                  title="Back to Chats List"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Group Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#001E17] via-[#00261D] to-[#011410] border border-black/10 shrink-0 flex items-center justify-center">
                  {activeImg ? (
                    <img
                      src={activeImg}
                      alt={activeTitle}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const el = e.currentTarget.nextElementSibling;
                        if (el) el.style.display = 'flex';
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  <div
                    className="w-full h-full flex items-center justify-center text-base select-none"
                    style={{ display: activeImg ? 'none' : 'flex' }}
                  >
                    {getContextualEmoji(activeDestination, activeTitle)}
                  </div>
                </div>

                {/* Group Details */}
                <div className="min-w-0">
                  <h3
                    className="text-base sm:text-lg font-normal text-[#00261D] truncate leading-tight"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {activeTitle} — Group Chat
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-[#717975] flex-wrap">
                    <span className="font-semibold text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-700" />
                      {isOrganizer ? 'Admin Host Controls' : 'Official Expedition Group'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#717975]" /> {activeDestination}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-bold text-[#00261D]">
                      <Users className="w-3 h-3 text-[#717975]" /> {activeConfirmed} / {activeMax} Confirmed
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowRosterModal(true)}
                  className="px-3.5 py-1.5 rounded-full border border-black/10 bg-[#FAFBF9] hover:bg-[#00261D] hover:text-white text-xs font-bold text-[#00261D] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Roster ({activeGroupDetails?.members?.length || activeConfirmed || 1})</span>
                </button>

                {selectedGroup.package_id && (
                  <Link
                    to={`/packages/${selectedGroup.package_id}`}
                    target="_blank"
                    className="p-2 rounded-full hover:bg-black/5 text-[#717975] hover:text-[#00261D] transition-colors"
                    title="View Public Tour Listing"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </header>

            {/* Messages Feed */}
            <div
              className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#F5F7F3]"
              style={{
                backgroundImage:
                  'radial-gradient(#00261D08 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              {/* Date Indicator Pill */}
              <div className="flex justify-center my-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 border border-black/10 text-[#717975] shadow-2xs backdrop-blur-xs">
                  EXPEDITION COMMUNITY CHAT
                </span>
              </div>

              {loadingMessages ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-2 text-[#717975]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00261D]" />
                  <p className="text-xs">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center p-6 text-center space-y-3 text-[#717975]">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-black/10 flex items-center justify-center shadow-2xs">
                    <MessageSquare className="w-6 h-6 text-[#00261D]" />
                  </div>
                  <h4
                    className="text-2xl font-normal text-[#00261D]"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    Start the Expedition Discussion
                  </h4>
                  <p className="text-xs max-w-sm text-[#717975]">
                    {isOrganizer
                      ? 'Broadcast departure timing, share packing checklists, and answer traveler queries in real time.'
                      : 'Say hello to your tour operator and fellow travelers to coordinate pickup points and gear!'}
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.sender_id === backendUser?.id || msg.sender_id === user?.uid}
                    currentUserAvatar={currentUserAvatar}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Composer Bar */}
            <footer className="p-3 sm:p-4 bg-white border-t border-black/10 shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 max-w-5xl mx-auto"
              >
                <button
                  type="button"
                  onClick={() => toast('Attachment feature is active for verified trip media.', { icon: '📎' })}
                  className="p-2.5 rounded-full hover:bg-black/5 text-[#717975] hover:text-[#00261D] transition-colors cursor-pointer shrink-0"
                  title="Attach file or itinerary update"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder="Type a message to the expedition group..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isSending}
                  className="flex-1 bg-[#FAFBF9] border border-black/10 rounded-full px-5 py-3 text-xs sm:text-sm text-[#00261D] placeholder:text-[#8E9793] focus:outline-none focus:border-[#00261D] focus:bg-white shadow-inner"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="p-3 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white transition-all disabled:opacity-30 cursor-pointer shadow-md shrink-0 flex items-center justify-center"
                  title="Send Message"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 text-[#717975]">
            <div className="w-16 h-16 rounded-3xl bg-white border border-black/10 flex items-center justify-center shadow-md">
              <MessageSquare className="w-8 h-8 text-[#00261D]" />
            </div>
            <h3
              className="text-3xl font-normal text-[#00261D]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Select a Trip Community
            </h3>
            <p className="text-xs max-w-md text-[#717975]">
              Choose one of your published tour package groups from the left sidebar to coordinate with confirmed travelers.
            </p>
          </div>
        )}
      </main>

      {/* ─── ROSTER MODAL ──────────────────────────────────────────────── */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-black/10 pb-4">
              <div>
                <h3
                  className="text-2xl font-normal text-[#00261D]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Enrolled Crew & Travelers
                </h3>
                <p className="text-xs text-[#717975]">
                  {activeConfirmed} Confirmed Seat(s) out of {activeMax} Max Capacity
                </p>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="p-2 rounded-full hover:bg-black/5 text-[#717975] hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member List */}
            <div className="max-h-80 overflow-y-auto space-y-3 divide-y divide-black/5">
              {/* Host Entry */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={currentUserAvatar}
                    name={backendUser?.name || user?.displayName || "Trip Operator"}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#00261D]">
                        {backendUser?.name || user?.displayName || "Trip Operator"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Admin Host
                      </span>
                    </div>
                    <span className="text-[10px] text-[#717975]">Verified Organizer</span>
                  </div>
                </div>
              </div>

              {/* Confirmed Travelers */}
              {activeGroupDetails?.members && activeGroupDetails.members.length > 0 ? (
                activeGroupDetails.members
                  .filter((m) => m.role !== 'ORGANIZER')
                  .map((m) => (
                    <div key={m.id} className="pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={m.profile_picture}
                          name={m.name || 'Traveler'}
                          size="sm"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#00261D]">{m.name}</p>
                          <span className="text-[10px] text-[#717975]">
                            Confirmed Traveler
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                        Seat Reserved
                      </span>
                    </div>
                  ))
              ) : (
                <div className="py-6 text-center text-xs text-[#717975]">
                  No co-travelers enrolled yet. Once travelers book, they will automatically join this roster.
                </div>
              )}
            </div>

            <button
              onClick={() => setShowRosterModal(false)}
              className="w-full py-3 rounded-full bg-[#00261D] text-white text-xs font-bold transition-all hover:bg-[#00261D]/90 cursor-pointer shadow-md"
            >
              Close Roster
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
