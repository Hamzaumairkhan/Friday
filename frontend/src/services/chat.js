import { api } from './api';

export const chatService = {
  // Send message to AI Copilot
  async sendMessage(message, conversationId = null, tripId = null) {
    return await api.post('/chat', {
      message,
      conversation_id: conversationId,
      trip_id: tripId,
    });
  },

  // Get full conversation history
  async getConversation(conversationId) {
    return await api.get(`/chat/${conversationId}`);
  },
};

export default chatService;
