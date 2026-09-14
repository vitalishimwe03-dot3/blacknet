import { defineStore } from 'pinia'
import api from '../utils/api'

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
  }),
  actions: {
    async fetchNotifications() {
      try {
        const { data } = await api.get('/notifications')
        this.notifications = data.notifications
      } catch (e) { console.error(e) }
    },
    async fetchUnreadCount() {
      try {
        const { data } = await api.get('/notifications/unread-count')
        this.unreadCount = data.count
      } catch (e) { console.error(e) }
    },
    async markRead(id) {
      await api.put(`/notifications/${id}/read`)
      const n = this.notifications.find(n => n.id === id)
      if (n) { n.is_read = true; this.unreadCount = Math.max(0, this.unreadCount - 1) }
    },
    async markAllRead() {
      await api.put('/notifications/read-all')
      this.notifications.forEach(n => n.is_read = true)
      this.unreadCount = 0
    }
  }
})
