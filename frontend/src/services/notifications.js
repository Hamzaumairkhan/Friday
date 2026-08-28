import { api } from './api';

export const notificationsService = {
  // List notifications for the authenticated user
  async listNotifications() {
    return await api.get('/notifications');
  },

  // Get unread notification count
  async getUnreadCount() {
    return await api.get('/notifications/unread-count');
  },

  // Mark single notification as read
  async markAsRead(notificationId) {
    return await api.patch(`/notifications/${notificationId}/read`);
  },

  // Mark all notifications as read
  async markAllAsRead() {
    return await api.patch('/notifications/read-all');
  },
};

export default notificationsService;
