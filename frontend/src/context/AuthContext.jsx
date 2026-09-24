import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'
import { closeSocket } from '../lib/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // The server is the source of truth for who is logged in and their role;
  // localStorage only remembers the token between visits
  useEffect(() => {
    if (!localStorage.getItem('cms_token')) {
      localStorage.removeItem('cms_user')
      setLoading(false)
      return
    }
    api.get('/auth/me')
      .then(({ data }) => {
        const { _id, name, email, role } = data.user
        const userData = { id: _id, name, email, role }
        localStorage.setItem('cms_user', JSON.stringify(userData))
        setUser(userData)
      })
      .catch(() => {
        // 401s are cleared by the axios interceptor; keep the cached user if the API is just unreachable
        const stored = localStorage.getItem('cms_user')
        if (stored && localStorage.getItem('cms_token')) setUser(JSON.parse(stored))
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('cms_token', token)
    localStorage.setItem('cms_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    closeSocket()
    localStorage.removeItem('cms_token')
    localStorage.removeItem('cms_user')
    setUser(null)
  }

  // After a profile edit, keep the cached user in sync
  const updateUser = (patch) => {
    setUser((u) => {
      const next = { ...u, ...patch }
      localStorage.setItem('cms_user', JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
