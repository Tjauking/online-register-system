import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'USER', signupCode: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.user)
      if (data.user.role === 'ADMIN') navigate('/admin')
      else if (data.user.role === 'AGENT') navigate('/agent')
      else navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inp = (label, key, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '7px', color: '#374151' }}>
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        placeholder={placeholder}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        required
        style={{
          width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
          borderRadius: '8px', fontSize: '14px', outline: 'none'
        }}
        onFocus={e => e.target.style.border = '1.5px solid #c00000'}
        onBlur={e => e.target.style.border = '1.5px solid #e5e7eb'}
      />
    </div>
  )

  return (
    <div>
      <Navbar />
      <div style={{
        minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '24px',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #fee2e2 100%)'
      }}>
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '40px',
          width: '100%', maxWidth: '460px',
          boxShadow: '0 8px 40px rgba(192,0,0,0.12)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>Create Account</h2>
            <p style={{ color: '#888', fontSize: '14px', marginTop: '6px' }}>Join the complaint management system</p>
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#b91c1c', padding: '12px 16px',
              borderRadius: '8px', marginBottom: '18px', fontSize: '14px', borderLeft: '4px solid #c00000'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '7px', color: '#374151' }}>
                Register As
              </label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value, signupCode: '' })}
                style={{
                  width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff'
                }}
              >
                <option value="USER">User</option>
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {inp('Full Name', 'name')}
            {inp('Email Address', 'email', 'email')}
            {inp('Phone Number', 'phone', 'tel')}
            {inp('Password', 'password', 'password')}

            {form.role !== 'USER' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '7px', color: '#374151' }}>
                  {form.role === 'AGENT' ? 'Agent Signup Code' : 'Admin Signup Code'}
                </label>
                <input
                  type="text"
                  value={form.signupCode}
                  onChange={e => setForm({ ...form, signupCode: e.target.value })}
                  required
                  placeholder="Enter secret code"
                  style={{
                    width: '100%', padding: '11px 14px', border: '1.5px solid #c00000',
                    borderRadius: '8px', fontSize: '14px', outline: 'none'
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: loading ? '#999' : '#c00000',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontWeight: 700, fontSize: '15px', marginTop: '6px'
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#c00000', fontWeight: 600 }}>Login here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
