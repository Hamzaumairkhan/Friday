import { api } from './api';

export const packagesService = {
  // Public marketplace packages list (optional filter by organizer_id)
  async listPackages(organizerId = null) {
    const query = organizerId ? `?organizer_id=${encodeURIComponent(organizerId)}` : '';
    return await api.get(`/packages${query}`);
  },

  // Public single package details
  async getPackage(packageId) {
    return await api.get(`/packages/${packageId}`);
  },

  // AI Description Generator for Packages
  async generateDescription(data) {
    return await api.post('/packages/generate-description', data);
  },

  // AI Structured Day-by-Day Itinerary Generator for Organizers
  async generateItinerary(data) {
    return await api.post('/packages/generate-itinerary', data);
  },

  // Unique view tracking (single count per visitor)
  async recordView(packageId) {
    if (!packageId) return null;
    let visitorId = localStorage.getItem('friday_visitor_id');
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('friday_visitor_id', visitorId);
    }
    const viewed = JSON.parse(localStorage.getItem('friday_viewed_packages') || '[]');
    if (viewed.includes(packageId)) {
      return { already_viewed: true };
    }
    viewed.push(packageId);
    localStorage.setItem('friday_viewed_packages', JSON.stringify(viewed));
    return await api.post(`/packages/${packageId}/view`, { visitor_id: visitorId });
  },

  // Traveler authentic reviews & ratings
  async getReviews(packageId) {
    return await api.get(`/packages/${packageId}/reviews`);
  },

  async createReview(packageId, data) {
    return await api.post(`/packages/${packageId}/reviews`, data);
  },
};

export default packagesService;
