import { defineStore } from 'pinia'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || '',
    loading: false
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin' || state.user?.role === 'super_admin',
    displayName: (state) => state.user?.display_name || state.user?.username || '',
    avatar: (state) => state.user?.avatar || ''
  },
  
  actions: {
    async fetchUser() {
      this.loading = true
      try {
        const { data } = await api.get('/auth/me')
        this.user = data
        return data
      } catch (err) {
        this.user = null
        throw err
      } finally {
        this.loading = false
      }
    },
    
    async login(login, password) {
      const { data } = await api.post('/auth/login', { login, password })
      this.token = data.token
      localStorage.setItem('token', data.token)
      this.user = data.user
      return data.user
    },
    
    async register(username, email, password, displayName) {
      const { data } = await api.post('/auth/register', { username, email, password, displayName })
      this.token = data.token
      localStorage.setItem('token', data.token)
      this.user = data.user
      return data.user
    },
    
    async logout() {
      try {
        await api.post('/auth/logout')
      } catch (e) {}
      this.user = null
      this.token = ''
      localStorage.removeItem('token')
    },
    
    async updateProfile(data) {
      const { data: user } = await api.put('/users/me/profile', data)
      this.user = { ...this.user, ...user }
      return user
    }
  }
})