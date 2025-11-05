import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only auto-logout on 401 errors that are actually auth-related
    if (error.response?.status === 401 && error.config?.url?.includes('/api/auth')) {
      // Clear tokens and redirect to login only for auth endpoints
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/'
    } else if (error.response?.status === 401) {
      // For other 401s, just clear tokens but don't redirect immediately
      // Let the calling component handle the response
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
    return Promise.reject(error)
  }
)

export const authService = {
  async signUp(email, password) {
    const response = await api.post('/api/auth/signup', { email, password })
    return response.data
  },

  async signIn(email, password) {
    const response = await api.post('/api/auth/signin', { email, password })
    const { user, access_token, refresh_token } = response.data

    // Store tokens
    if (access_token) {
      localStorage.setItem('access_token', access_token)
    }
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token)
    }

    return { user, session: { access_token, refresh_token } }
  },

  async signOut() {
    // Clear local storage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')

    // You might want to call a logout endpoint if you have one
    // await api.post('/api/auth/signout')
  },

  getCurrentUser() {
    const token = localStorage.getItem('access_token')
    if (!token) return null

    try {
      // Decode JWT to get user info (basic implementation)
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        id: payload.sub,
        email: payload.email,
      }
    } catch (error) {
      return null
    }
  },

  isAuthenticated() {
    const token = localStorage.getItem('access_token')
    if (!token) return false

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp > currentTime
    } catch (error) {
      return false
    }
  }
}

export const healthService = {
  async checkBackend() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 })
      return response.data
    } catch (error) {
      throw new Error('Backend server is not responding')
    }
  }
}

export const imageService = {
  async uploadImages(files, onProgress) {
    const formData = new FormData()

    // Add files to form data
    Array.from(files).forEach((file) => {
      formData.append('images', file)
    })

    // Create axios instance for file upload with different headers
    const uploadConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      }
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/images/upload`,
      formData,
      uploadConfig
    )
    return response.data
  },

  async getImages(params = {}) {
    const response = await api.get('/api/images', { params })
    return response.data
  },

  async getImage(id) {
    const response = await api.get(`/api/images/${id}`)
    return response.data
  },

  async searchImages(params = {}) {
    const response = await api.get('/api/images/search', { params })
    return response.data
  },

  async getSimilarImages(id) {
    const response = await api.get(`/api/images/${id}/similar`)
    return response.data
  },

  async retryAI(imageId) {
    const response = await api.post(`/api/images/${imageId}/retry-ai`)
    return response.data
  },

  async getColors() {
    const response = await api.get('/api/images/colors')
    return response.data
  }
}

export default api