import { defineStore } from 'pinia'
import api from '../utils/api'

export const usePresenceStore = defineStore('presence', {
  state: () => ({
    online: {},
  }),
  getters: {
    onlineCount: (state) => Object.keys(state.online).length,
    onlineUserIds: (state) => Object.keys(state.online),
  },
  actions: {
    async fetchOnlineUsers() {
      try {
        const { data } = await api.get('/users/online')
        const online = {}
        data.users.forEach(u => { online[u.id] = true })
        this.online = online
      } catch (e) { console.error(e) }
    },
    setOnline(userId, isOnline) {
      if (isOnline) this.online[userId] = true
      else delete this.online[userId]
    },
    isOnline(userId) {
      return !!this.online[userId]
    },
  }
})