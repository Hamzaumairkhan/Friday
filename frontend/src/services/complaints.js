import api from './api';

export const complaintsService = {
  async submitComplaint(payload) {
    const res = await api.post('/complaints', payload);
    return res.data;
  },
};
