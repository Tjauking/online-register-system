import axios from 'axios'

export const API_ORIGIN = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // A 401 from login/register is just a wrong password; let the form show it
    const isAuthForm = /\/auth\/(login|register)$/.test(err.config?.url || '')
    if (err.response?.status === 401 && !isAuthForm) {
      localStorage.removeItem('cms_token')
      localStorage.removeItem('cms_user')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
