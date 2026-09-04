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

  // Toggle Private / Public Visibility & Allow Cloning Permission
  async toggleVisibility(tripId, isPublic, allowCloning = null) {
    const params = new URLSearchParams();
    if (isPublic !== undefined && isPublic !== null) params.append('is_public', isPublic);
    if (allowCloning !== undefined && allowCloning !== null) params.append('allow_cloning', allowCloning);
    return await api.post(`/trips/${tripId}/visibility?${params.toString()}`);
  },

  // Copy/Clone a public community trip into private account
  async copyTrip(tripId) {
    return await api.post(`/trips/${tripId}/clone`);
  },
  async cloneTrip(tripId) {
    return await api.post(`/trips/${tripId}/clone`);
  },

  // Record Trip View (+1)
  async recordView(tripId) {
    return await api.post(`/trips/${tripId}/view`).catch(() => null);
  },

  // Dynamic Reviews & Ratings for Community Trips
  async getReviews(tripId) {
    const res = await api.get(`/trips/${tripId}/reviews`);
    return res.data;
  },

  async createReview(tripId, data) {
    const res = await api.post(`/trips/${tripId}/reviews`, data);
    return res.data;
  },

  // Toggle/Record Trip Like (+1)
  async toggleLike(tripId) {
    return await api.post(`/trips/${tripId}/like`).catch(() => null);
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

  // Publish trip (Public or Private) and trigger email/WhatsApp dispatch
  async publishTrip(tripId, data = {}) {
    return await api.post(`/trips/${tripId}/publish`, data);
  },

  // Check destination weather advisory & suggested dates
  async checkWeather(destination, departureDate, durationDays = 3) {
    const params = new URLSearchParams({
      destination,
      duration_days: durationDays,
    });
    if (departureDate) params.append('departure_date', departureDate);
    return await api.get(`/trips/weather-check?${params.toString()}`);
  },

  // Validate whether destination is in Pakistan and auto-correct typos
  async validateDestination(destination) {
    return await api.post('/trips/validate-destination', { destination });
  },

  // Get 4 curated options per time slot for destination
  async getSlotOptions(destination) {
    return await api.get(`/trips/slot-options?destination=${encodeURIComponent(destination)}`);
  },

  // Add custom activity to day
  async addActivity(tripId, dayId, data) {
    return await api.post(`/trips/${tripId}/days/${dayId}/activities`, data);
  },

  // Update activity stop
  async updateActivity(tripId, activityId, data) {
    return await api.patch(`/trips/${tripId}/activities/${activityId}`, data);
  },

  // Delete activity stop
  async deleteActivity(tripId, activityId) {
    return await api.delete(`/trips/${tripId}/activities/${activityId}`);
  },

  // Add custom day to itinerary
  async addDay(tripId, data = {}) {
    return await api.post(`/trips/${tripId}/days`, data);
  },

  // Delete an itinerary day
  async deleteDay(tripId, dayId) {
    return await api.delete(`/trips/${tripId}/days/${dayId}`);
  },

  // Update day title / summary
  async updateDay(tripId, dayId, data) {
    return await api.patch(`/trips/${tripId}/days/${dayId}`, data);
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
