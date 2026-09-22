import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'

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
      if (data.user.role === 'ADMIN') navigate('/admin')
      else if (data.user.role === 'AGENT') navigate('/agent')
      else navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #fee2e2 100%)'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 8px 40px rgba(192,0,0,0.12)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔐</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>Welcome Back</h2>
            <p style={{ color: '#888', fontSize: '14px', marginTop: '6px' }}>Login to your account</p>
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#b91c1c', padding: '12px 16px',
              borderRadius: '8px', marginBottom: '20px', fontSize: '14px', borderLeft: '4px solid #c00000'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {[
              { label: 'Email Address', key: 'email', type: 'email' },
              { label: 'Password', key: 'password', type: 'password' }
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '7px', color: '#374151' }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  required
                  style={{
                    width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
                    borderRadius: '8px', fontSize: '14px', outline: 'none',
                    transition: 'border 0.2s'
                  }}
                  onFocus={e => e.target.style.border = '1.5px solid #c00000'}
                  onBlur={e => e.target.style.border = '1.5px solid #e5e7eb'}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: loading ? '#999' : '#c00000',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontWeight: 700, fontSize: '15px', marginTop: '8px',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#c00000', fontWeight: 600 }}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
