import { defineStore } from 'pinia'
import api from '@/services/api'

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    unread: 0,
    unreadMessages: 0,
    loaded: false
  }),
  
  getters: {
    totalUnread: (state) => state.unread + state.unreadMessages
  },
  
  actions: {
    async fetchCounts() {
      try {
        const { data } = await api.get('/notifications/unread')
        this.unread = data.notifications
        this.unreadMessages = data.messages
        this.loaded = true
      } catch (err) {
        this.unread = 0
        this.unreadMessages = 0
      }
    },
    
    setUnread(count) {
      this.unread = count
    },
    
    increment(type) {
      if (type === 'message') {
        this.unreadMessages++
      } else {
        this.unread++
      }
    },
    
    clear(type = 'all') {
      if (type === 'message') {
        this.unreadMessages = 0
      } else {
        this.unread = 0
      }
    }
  }
})