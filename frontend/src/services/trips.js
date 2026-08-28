import { api } from './api';

export const tripsService = {
  // Complete Guided AI Trip Planner
  async guidedPlan(data) {
    return await api.post('/trips/guided-plan', data);
  },

  // Create a new traveler personal trip (max 10 travelers)
  async createTrip(data) {
    return await api.post('/trips', data);
  },

  // List all user's trips
  async listTrips() {
    return await api.get('/trips');
  },

  // List public community trips
  async listCommunityTrips() {
    return await api.get('/trips/public/community');
  },

  // Get single trip details
  async getTrip(tripId) {
    return await api.get(`/trips/${tripId}`);
  },

  // Update trip details
  async updateTrip(tripId, data) {
    return await api.patch(`/trips/${tripId}`, data);
  },

  // Toggle Private / Public Visibility
  async toggleVisibility(tripId, isPublic) {
    return await api.post(`/trips/${tripId}/visibility?is_public=${isPublic}`);
  },

  // Copy/Clone a public community trip into private account
  async copyTrip(tripId) {
    return await api.post(`/trips/${tripId}/copy`);
  },

  // Dynamic replan
  async replanTrip(tripId, data) {
    return await api.post(`/trips/${tripId}/replan`, data);
  },

  // Add group member to private trip (max 10 members)
  async addMember(tripId, memberData) {
    return await api.post(`/trips/${tripId}/members`, memberData);
  },

  // Get trip itinerary
  async getItinerary(tripId) {
    return await api.get(`/trips/${tripId}/itinerary`);
  },

  // Get trip budget breakdown
  async getBudget(tripId) {
    return await api.get(`/trips/${tripId}/budget`);
  },

  // Match organizers for this trip
  async matchOrganizers(tripId) {
    return await api.post(`/trips/${tripId}/organizer-match`);
  },

  // List members of a group trip
  async listMembers(tripId) {
    return await api.get(`/groups/trips/${tripId}/members`);
  },

  // Delete a trip
  async deleteTrip(tripId) {
    return await api.delete(`/trips/${tripId}`);
  },
};

export default tripsService;
