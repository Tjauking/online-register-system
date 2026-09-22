import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

export default function CreateComplaint() {
  const [form, setForm] = useState({ title: '', description: '', category: 'Network Issue', priority: 'Medium' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('attachment', file)
      await api.post('/complaints', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div style={{
        minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '32px 24px',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #fee2e2 100%)'
      }}>
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '40px',
          width: '100%', maxWidth: '580px',
          boxShadow: '0 8px 40px rgba(192,0,0,0.12)'
        }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>Submit New Complaint</h2>
            <p style={{ color: '#888', fontSize: '14px', marginTop: '6px' }}>Fill in the details below and we'll assign an agent to your case.</p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '18px', fontSize: '14px', borderLeft: '4px solid #c00000' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#dcfce7', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '18px', fontSize: '14px', borderLeft: '4px solid #16a34a' }}>
              ✅ Complaint submitted! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {[
              { label: 'Complaint Title', key: 'title', type: 'text', placeholder: 'e.g. WiFi not working in Room 204' }
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '7px', color: '#374151' }}>{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  required
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                  onFocus={e => e.target.style.border = '1.5px solid #c00000'}
                  onBlur={e => e.target.style.border = '1.5px solid #e5e7eb'}
                />
              </div>
            ))}

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '7px', color: '#374151' }}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
                rows={4}
                placeholder="Describe the issue in detail..."
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                onFocus={e => e.target.style.border = '1.5px solid #c00000'}
                onBlur={e => e.target.style.border = '1.5px solid #e5e7eb'}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '7px', color: '#374151' }}>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}>
                  {['Water Issue', 'Network Issue', 'Hostel Issue', 'Service Issue', 'Technical Issue', 'Other'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '7px', color: '#374151' }}>Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}>
                  {['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '7px', color: '#374151' }}>Attachment (optional)</label>
              <input type="file" accept=".png,.jpg,.jpeg,.gif,.pdf" onChange={e => setFile(e.target.files[0])}
                style={{ width: '100%', padding: '10px', border: '1.5px dashed #e5e7eb', borderRadius: '8px', fontSize: '13px' }} />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', background: loading ? '#999' : '#c00000',
              color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px'
            }}>
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
