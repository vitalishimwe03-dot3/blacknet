import { defineStore } from 'pinia'
import api from '../utils/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    isModerator: (state) => state.user?.role === 'moderator' || state.user?.role === 'admin',
  },
  actions: {
    async checkAuth() {
      this.loading = true
      try {
        const { data } = await api.get('/auth/me')
        this.user = data.user
      } catch {
        this.user = null
      } finally {
        this.loading = false
      }
    },
    async login(login, password) {
      const { data } = await api.post('/auth/login', { login, password })
      this.user = data.user
      return data
    },
    async register(username, email, password, displayName) {
      const { data } = await api.post('/auth/register', { username, email, password, displayName })
      this.user = data.user
      return data
    },
    async logout() {
      await api.post('/auth/logout')
      this.user = null
    },
    async updateProfile(updates) {
      const { data } = await api.put('/users/profile', updates)
      this.user = { ...this.user, ...data.user }
    }
  }
})
