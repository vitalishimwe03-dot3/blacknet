import { defineStore } from 'pinia'
import api from '@/services/api'

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: []
  }),
  
  actions: {
    show(message, type = 'info', duration = 4000) {
      const id = Date.now() + Math.random()
      this.toasts.push({ id, message, type })
      
      setTimeout(() => {
        this.remove(id)
      }, duration)
      
      return id
    },
    
    success(message) {
      return this.show(message, 'success')
    },
    
    error(message) {
      return this.show(message, 'error', 6000)
    },
    
    info(message) {
      return this.show(message, 'info')
    },
    
    remove(id) {
      this.toasts = this.toasts.filter(t => t.id !== id)
    }
  }
})