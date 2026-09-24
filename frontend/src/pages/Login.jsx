import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import AuthLayout from '../components/AuthLayout'
import { Alert } from '../components/ui'

export const homeFor = (role) => (role === 'ADMIN' ? '/admin' : role === 'AGENT' ? '/agent' : '/dashboard')

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      navigate(homeFor(data.user.role))
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off"
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit}>
        {error && <div style={{ marginBottom: 16 }}><Alert>{error}</Alert></div>}
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" />
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="input" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <button type="submit" className="btn btn-dark btn-lg btn-block" style={{ marginTop: 24 }} disabled={loading}>
          {loading ? <Loader2 className="spin" /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
          {!loading && <ArrowRight />}
        </button>
      </form>
    </AuthLayout>
  )
}
