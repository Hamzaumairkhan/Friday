import { api } from './api';

export const groupsService = {
  // Get group information + member list for a package
  async getTripGroup(packageId) {
    return await api.get(`/groups/trips/${packageId}`);
  },

  // Get chronological messages for a package trip group
  async getGroupMessages(packageId) {
    return await api.get(`/groups/trips/${packageId}/messages`);
  },

  // Send a message or announcement into the trip group
  async sendGroupMessage(packageId, message) {
    return await api.post(`/groups/trips/${packageId}/messages`, { message });
  },

  // Authenticated Organizer: List all trip groups owned
  async listOrganizerGroups() {
    return await api.get('/groups/organizer/my-groups');
  },

  // Authenticated Traveler: List all confirmed trip groups
  async listTravelerGroups() {
    return await api.get('/groups/traveler/my-groups');
  },
};

export default groupsService;
