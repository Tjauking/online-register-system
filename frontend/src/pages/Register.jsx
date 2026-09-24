import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import AuthLayout from '../components/AuthLayout'
import { Alert } from '../components/ui'
import { homeFor } from './Login'

const ROLES = [
  { value: 'USER', label: 'User', hint: 'Submit and track complaints' },
  { value: 'AGENT', label: 'Agent', hint: 'Resolve complaints · needs the agent code' },
  { value: 'ADMIN', label: 'Admin', hint: 'Manage the team · needs the admin code' }
]

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'USER', signupCode: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.user)
      navigate(homeFor(data.user.role))
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
      setLoading(false)
    }
  }

  const role = ROLES.find((r) => r.value === form.role)

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes less than a minute"
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit}>
        {error && <div style={{ marginBottom: 16 }}><Alert>{error}</Alert></div>}

        <div className="field">
          <span className="label">I’m joining as</span>
          <div className="role-seg" role="radiogroup" aria-label="Account type">
            {ROLES.map((r) => (
              <button type="button" key={r.value} role="radio" aria-checked={form.role === r.value}
                className={form.role === r.value ? 'is-active' : ''}
                onClick={() => setForm({ ...form, role: r.value, signupCode: '' })}>
                {r.label}
              </button>
            ))}
          </div>
          <span className="muted" style={{ fontSize: 12.5 }}>{role.hint}</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} required />
        </div>
        <div className="field-row" style={{ marginTop: 16 }}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" className="input" value={form.email} onChange={set('email')} required />
          </div>
          <div className="field" style={{ marginTop: 0 }}>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" type="tel" autoComplete="tel" className="input" value={form.phone} onChange={set('phone')} required />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Password <span className="hint">At least 8 characters</span></label>
          <input id="password" type="password" autoComplete="new-password" className="input" value={form.password} onChange={set('password')} required minLength={8} />
        </div>

        {form.role !== 'USER' && (
          <div className="field">
            <label className="label" htmlFor="code">{role.label} signup code</label>
            <input id="code" className="input mono" value={form.signupCode} onChange={set('signupCode')} required autoComplete="off"
              placeholder="Ask your administrator" />
          </div>
        )}

        <button type="submit" className="btn btn-dark btn-lg btn-block" style={{ marginTop: 24 }} disabled={loading}>
          {loading ? <Loader2 className="spin" /> : null}
          {loading ? 'Creating account…' : 'Create account'}
          {!loading && <ArrowRight />}
        </button>
      </form>
    </AuthLayout>
  )
}
