import { defineStore } from 'pinia'
import api from '@/services/api'

export const useStorageStore = defineStore('storage', {
  state: () => ({
    stats: null,
    files: [],
    loading: false,
    total: 0
  }),
  
  getters: {
    usedFormatted(state) {
      return state.stats ? formatBytes(state.stats.used) : '0 B'
    },
    limitFormatted(state) {
      return state.stats ? formatBytes(state.stats.limit) : '10 GB'
    },
    percentage(state) {
      return state.stats?.percentage || 0
    }
  },
  
  actions: {
    async fetchStats() {
      try {
        const { data } = await api.get('/files/storage')
        this.stats = data
        return data
      } catch (err) {
        this.stats = null
      }
    },
    
    async fetchFiles(params = {}) {
      try {
        const { data } = await api.get('/files', { params })
        this.files = data.files
        this.total = data.total
        return data
      } catch (err) {
        throw err
      }
    },
    
    async uploadFile(file) {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (e) => {
          this.uploadProgress = e.total ? Math.round((e.loaded / e.total) * 100) : 0
        }
      })
      await this.fetchStats()
      return data
    },
    
    async deleteFile(id) {
      await api.delete(`/files/${id}`)
      await this.fetchStats()
      await this.fetchFiles()
    }
  }
})

export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}