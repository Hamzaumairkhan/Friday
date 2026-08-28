import { api } from './api';

export const organizersService = {
  // Public catalog of tour organizers
  async listOrganizers(destination = null) {
    const query = destination ? `?destination=${encodeURIComponent(destination)}` : '';
    return await api.get(`/organizers${query}`);
  },

  // Public details for a specific organizer
  async getOrganizer(organizerId) {
    return await api.get(`/organizers/${organizerId}`);
  },

  // Authenticated Organizer: Get own profile
  async getMyProfile() {
    return await api.get('/organizers/me');
  },

  // Authenticated Organizer: Update own profile (verification fields protected on backend)
  async updateMyProfile(data) {
    return await api.patch('/organizers/me', data);
  },

  // Authenticated Organizer: List own packages
  async listMyPackages() {
    return await api.get('/organizers/me/packages');
  },

  // Authenticated Organizer: Create new package
  async createPackage(data) {
    return await api.post('/organizers/me/packages', data);
  },

  // Authenticated Organizer: Update package
  async updatePackage(packageId, data) {
    return await api.patch(`/organizers/me/packages/${packageId}`, data);
  },

  // Authenticated Organizer: Delete package
  async deletePackage(packageId) {
    return await api.delete(`/organizers/me/packages/${packageId}`);
  },

  // Authenticated Organizer: List bookings for own packages
  async listMyBookings() {
    return await api.get('/organizers/me/bookings');
  },

  // Authenticated Organizer: Update booking status (CONFIRMED, REJECTED, CANCELLED)
  async updateBookingStatus(bookingId, status) {
    return await api.patch(`/organizers/me/bookings/${bookingId}/status`, { status });
  },

  // Authenticated Organizer: Verify or reject payment proof
  async verifyPayment(bookingId, { action, rejection_reason = '' }) {
    return await api.patch(`/organizers/me/bookings/${bookingId}/payment`, {
      action,
      rejection_reason,
    });
  },
};

export default organizersService;
