import { defineStore } from 'pinia'
import api from '../utils/api'

export const useMessagesStore = defineStore('messages', {
  state: () => ({
    conversations: [],
    currentMessages: [],
    currentConversation: null,
    loading: false,
    typing: {},
  }),
  actions: {
    async fetchConversations() {
      this.loading = true
      try {
        const { data } = await api.get('/messages')
        this.conversations = data.conversations
      } catch (e) { console.error(e) }
      finally { this.loading = false }
    },
    async fetchMessages(conversationId) {
      this.loading = true
      try {
        const { data } = await api.get(`/messages/${conversationId}`)
        this.currentMessages = data.messages
        this.currentConversation = conversationId
      } catch (e) { console.error(e) }
      finally { this.loading = false }
    },
    async sendMessage(conversationId, content, replyTo = null) {
      const { data } = await api.post(`/messages/${conversationId}`, { content, replyTo })
      this.currentMessages.push(data.message)
      return data.message
    },
    async createConversation(type, name, memberIds) {
      const { data } = await api.post('/messages', { type, name, memberIds })
      this.conversations.unshift(data.conversation)
      return data.conversation
    },
    addRealtimeMessage(message) {
      if (message.conversation_id === this.currentConversation) {
        this.currentMessages.push(message)
      }
    },
    setTyping(userId, isTyping) {
      this.typing[userId] = isTyping
    }
  }
})
