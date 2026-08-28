import { api } from './api';

export const bookingsService = {
  // Create a booking request for a package
  async createBooking(data) {
    return await api.post('/bookings', data);
  },

  // List all bookings made by the current traveler
  async listUserBookings() {
    return await api.get('/bookings');
  },

  // Get single booking details
  async getBooking(bookingId) {
    return await api.get(`/bookings/${bookingId}`);
  },

  // Submit payment proof (Cloudinary URL)
  async submitPaymentProof(bookingId, paymentProofUrl) {
    return await api.post(`/bookings/${bookingId}/payment-proof`, {
      payment_proof_url: paymentProofUrl,
    });
  },

  // Get payment proof and organizer payment instructions
  async getPaymentProof(bookingId) {
    return await api.get(`/bookings/${bookingId}/payment-proof`);
  },
};

export default bookingsService;
