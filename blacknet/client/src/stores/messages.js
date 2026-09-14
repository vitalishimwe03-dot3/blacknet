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
  getters: {
    typingUsers(state) {
      if (!state.currentConversation) return []
      const map = state.typing[state.currentConversation]
      if (!map) return []
      const now = Date.now()
      return Object.values(map)
        .filter(t => t.expiresAt > now)
        .map(t => t.username)
        .filter((v, i, a) => a.indexOf(v) === i)
    },
  },
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
        this.typing[conversationId] = {}
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
      const conv = this.conversations.find(c => c.id === message.conversation_id)
      if (conv) {
        conv.last_message = message.content
        conv.last_message_at = message.created_at
        const idx = this.conversations.findIndex(c => c.id === conv.id)
        if (idx > 0) {
          this.conversations.splice(idx, 1)
          this.conversations.unshift(conv)
        }
      }
    },
    applyMessageEdit(message) {
      const idx = this.currentMessages.findIndex(m => m.id === message.id)
      if (idx >= 0) {
        this.currentMessages[idx] = { ...this.currentMessages[idx], ...message }
      }
    },
    applyMessageDelete(messageId) {
      const idx = this.currentMessages.findIndex(m => m.id === messageId)
      if (idx >= 0) {
        this.currentMessages[idx] = { ...this.currentMessages[idx], content: '[deleted]', is_deleted: true }
      }
    },
    setTyping(conversationId, userId, username, isTyping) {
      if (!this.typing[conversationId]) this.typing[conversationId] = {}
      if (isTyping) {
        this.typing[conversationId][userId] = { username, expiresAt: Date.now() + 4000 }
      } else {
        delete this.typing[conversationId][userId]
      }
    },
  }
})