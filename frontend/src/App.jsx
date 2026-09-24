import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

import UserDashboard from './pages/user/UserDashboard'
import CreateComplaint from './pages/user/CreateComplaint'
import ComplaintDetails from './pages/user/ComplaintDetails'
import Feedback from './pages/user/Feedback'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import './landing.css'

import AgentDashboard from './pages/agent/AgentDashboard'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAgents from './pages/admin/AdminAgents'
import AdminComplaints from './pages/admin/AdminComplaints'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/redirect" replace />
  return children
}

// New pages start at the top; in-page anchors (#faq) still scroll to their target
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => { if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  return null
}

function RoleHome() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
  if (user.role === 'AGENT') return <Navigate to="/agent" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/redirect" element={<RoleHome />} />

          <Route path="/dashboard" element={<ProtectedRoute role="USER"><UserDashboard /></ProtectedRoute>} />
          <Route path="/create-complaint" element={<ProtectedRoute role="USER"><CreateComplaint /></ProtectedRoute>} />
          <Route path="/complaint/:id" element={<ProtectedRoute><ComplaintDetails /></ProtectedRoute>} />
          <Route path="/feedback/:id" element={<ProtectedRoute role="USER"><Feedback /></ProtectedRoute>} />

          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route path="/agent" element={<ProtectedRoute role="AGENT"><AgentDashboard /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute role="ADMIN"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/agents" element={<ProtectedRoute role="ADMIN"><AdminAgents /></ProtectedRoute>} />
          <Route path="/admin/complaints" element={<ProtectedRoute role="ADMIN"><AdminComplaints /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
