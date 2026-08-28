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
};

export default packagesService;
