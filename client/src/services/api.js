import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || 'Request failed'
    const status = error.response?.status
    
    if (status === 401 && !window.location.pathname.includes('/auth/')) {
      // Clear auth state - handled by stores
      window.dispatchEvent(new CustomEvent('auth-unauthorized'))
    }
    
    return Promise.reject({ message, status, ...error })
  }
)

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default api