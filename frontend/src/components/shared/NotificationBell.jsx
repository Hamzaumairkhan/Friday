import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Clock, MessageSquare, Trash2, X } from 'lucide-react';
import { notificationsService } from '../../services/notifications';
import { useAuth } from '../../context/AuthContext';
import { playNotificationSound } from '../../utils/notificationSound';

export default function NotificationBell({ align = 'right' }) {
  const navigate = useNavigate();
  const { isAuthenticated, role, backendUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const prevUnreadCountRef = useRef(null);

  const isOrganizer = role === 'ORGANIZER' || backendUser?.role === 'ORGANIZER';

  const fetchNotifications = async () => {
    const hasToken = !!localStorage.getItem('friday_session') || !!localStorage.getItem('token') || !!localStorage.getItem('auth_user');
    if (!isAuthenticated && !hasToken) return;
    try {
      const data = await notificationsService.listNotifications();
      setNotifications(data || []);
      const countRes = await notificationsService.getUnreadCount();
      const newCount = countRes?.unread_count || 0;

      // Play audio chime if new notifications arrived after initial mount
      if (prevUnreadCountRef.current !== null && newCount > prevUnreadCountRef.current) {
        playNotificationSound();
      }
      prevUnreadCountRef.current = newCount;
      setUnreadCount(newCount);
    } catch {
      // Silently handle guest / unauthorized states
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();

    const handleSync = () => {
      fetchNotifications();
    };
    window.addEventListener('friday_notifications_updated', handleSync);

    // Polling every 8 seconds for real-time notification alerts
    const interval = setInterval(fetchNotifications, 8000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('friday_notifications_updated', handleSync);
    };
  }, [isAuthenticated]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    window.dispatchEvent(new Event('friday_notifications_updated'));
    try {
      await notificationsService.markAsRead(id);
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    if (e) e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    window.dispatchEvent(new Event('friday_notifications_updated'));
    try {
      await notificationsService.markAllAsRead();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    if (target && !target.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    window.dispatchEvent(new Event('friday_notifications_updated'));
    try {
      await notificationsService.deleteNotification(id);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearAll = async (e) => {
    if (e) e.stopPropagation();
    setNotifications([]);
    setUnreadCount(0);
    window.dispatchEvent(new Event('friday_notifications_updated'));
    try {
      await notificationsService.clearAllNotifications();
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    if (notif.type === 'NEW_GROUP_MESSAGE' || notif.related_trip_id) {
      const targetId = notif.related_trip_id;
      if (isOrganizer) {
        navigate(`/organizer/groups/${targetId}`);
      } else {
        navigate(`/groups/${targetId}`);
      }
    } else if (notif.related_booking_id) {
      if (isOrganizer) {
        navigate('/organizer/bookings');
      } else {
        navigate(`/bookings/${notif.related_booking_id}`);
      }
    }
  };

  const dropdownAlignClass =
    align === 'left'
      ? 'left-0 right-auto'
      : 'right-0 left-auto';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-foreground hover:bg-black/5 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-[#00261D]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className={`absolute ${dropdownAlignClass} mt-3 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-3xl border border-black/10 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95`}>
          {/* Header */}
          <div className="p-4 border-b border-black/10 flex items-center justify-between bg-slate-50/70">
            <h4
              className="text-lg font-normal text-[#00261D]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Notifications
            </h4>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-[#717975] hover:text-[#00261D] flex items-center gap-1 transition-colors cursor-pointer font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-700" /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-[#717975] hover:text-red-600 flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-black/5">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#717975]">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 transition-colors flex items-start justify-between gap-2.5 cursor-pointer hover:bg-slate-100/80 ${
                    notif.is_read ? 'opacity-70 bg-transparent' : 'bg-emerald-50/40'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {notif.type === 'NEW_GROUP_MESSAGE' && (
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      )}
                      <p className="text-xs font-bold text-[#00261D] leading-tight truncate">
                        {notif.title}
                      </p>
                    </div>
                    <p className="text-xs text-[#414845] leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    {notif.created_at && (
                      <p className="text-[10px] text-[#717975] flex items-center gap-1 pt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.created_at).toLocaleDateString()} at{' '}
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        title="Mark as read"
                        className="p-1 rounded-full text-[#717975] hover:text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteNotification(notif.id, e)}
                      title="Remove notification"
                      className="p-1 rounded-full text-[#717975] hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
