import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

export default function Feedback() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a star rating'); return }
    setError('')
    setLoading(true)
    try {
      await api.post('/feedback', { complaintId: id, rating, comment })
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1400)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

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
          boxShadow: '0 8px 40px rgba(192,0,0,0.12)', textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>Rate Your Experience</h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px' }}>How satisfied are you with the resolution?</p>

          {error && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '18px', fontSize: '14px' }}>{error}</div>
          )}
          {success && (
            <div style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '18px', fontSize: '14px' }}>✅ Thank you! Redirecting...</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                style={{
                  fontSize: '40px', cursor: 'pointer',
                  color: n <= (hovered || rating) ? '#f59e0b' : '#d1d5db',
                  transition: 'color 0.1s, transform 0.1s',
                  transform: n <= (hovered || rating) ? 'scale(1.15)' : 'scale(1)',
                  display: 'inline-block'
                }}
              >
                ★
              </span>
            ))}
          </div>

          {rating > 0 && (
            <div style={{ marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#c00000' }}>
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
            </div>
          )}

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            placeholder="Share your experience (optional)..."
            style={{
              width: '100%', padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: '8px',
              fontSize: '14px', outline: 'none', resize: 'vertical', marginTop: '16px', marginBottom: '20px'
            }}
            onFocus={e => e.target.style.border = '1.5px solid #c00000'}
            onBlur={e => e.target.style.border = '1.5px solid #e5e7eb'}
          />

          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: '13px', background: loading ? '#999' : '#c00000',
            color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer'
          }}>
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}
