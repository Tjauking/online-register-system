import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

import UserDashboard from './pages/user/UserDashboard'
import CreateComplaint from './pages/user/CreateComplaint'
import ComplaintDetails from './pages/user/ComplaintDetails'
import Feedback from './pages/user/Feedback'

import AgentDashboard from './pages/agent/AgentDashboard'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAgents from './pages/admin/AdminAgents'
import AdminComplaints from './pages/admin/AdminComplaints'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/login" replace />
  return children
}

function RoleHome() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
  if (user.role === 'AGENT') return <Navigate to="/agent" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/redirect" element={<RoleHome />} />

          <Route path="/dashboard" element={<ProtectedRoute role="USER"><UserDashboard /></ProtectedRoute>} />
          <Route path="/create-complaint" element={<ProtectedRoute role="USER"><CreateComplaint /></ProtectedRoute>} />
          <Route path="/complaint/:id" element={<ProtectedRoute><ComplaintDetails /></ProtectedRoute>} />
          <Route path="/feedback/:id" element={<ProtectedRoute role="USER"><Feedback /></ProtectedRoute>} />

          <Route path="/agent" element={<ProtectedRoute role="AGENT"><AgentDashboard /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute role="ADMIN"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/agents" element={<ProtectedRoute role="ADMIN"><AdminAgents /></ProtectedRoute>} />
          <Route path="/admin/complaints" element={<ProtectedRoute role="ADMIN"><AdminComplaints /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
