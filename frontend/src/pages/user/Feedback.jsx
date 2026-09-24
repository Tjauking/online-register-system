import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Star } from 'lucide-react'
import api from '../../api/axios'
import AppShell from '../../components/AppShell'
import { Alert, PageHeader, Section } from '../../components/ui'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

export default function Feedback() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) return setError('Please choose a star rating')
    setError('')
    setLoading(true)
    try {
      await api.post('/feedback', { complaintId: id, rating, comment })
      setSuccess(true)
      setTimeout(() => navigate(`/complaint/${id}`), 1000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback')
      setLoading(false)
    }
  }

  const shown = hovered || rating

  return (
    <AppShell title="Rate resolution" parent="Complaints">
      <PageHeader title="Rate the resolution" subtitle="Your rating goes straight to the team’s performance dashboard" />
      <div style={{ maxWidth: 560 }}>
        <Section title="How did we do?" bodyClassName="section-pad">
          <form onSubmit={handleSubmit}>
            {error && <div style={{ marginBottom: 16 }}><Alert>{error}</Alert></div>}
            {success && <div style={{ marginBottom: 16 }}><Alert type="success">Thanks for the feedback!</Alert></div>}

            <div className="stars" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHovered(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  className={`star ${n <= shown ? 'is-on' : ''}`}
                  onClick={() => setRating(n)} onMouseEnter={() => setHovered(n)}>
                  <Star />
                </button>
              ))}
            </div>
            <div className="mono" style={{ textAlign: 'center', height: 20, margin: '10px 0 18px', color: 'var(--text-2)', fontSize: 13 }}>
              {shown ? `${shown}/5 · ${LABELS[shown]}` : 'Select a rating'}
            </div>

            <div className="field">
              <label className="label" htmlFor="comment">Comment <span className="hint">Optional</span></label>
              <textarea id="comment" className="textarea" rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
                maxLength={1000} placeholder="What went well, and what could have been better?" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate(`/complaint/${id}`)}>Cancel</button>
              <button type="submit" className="btn btn-dark" disabled={loading}>
                {loading && <Loader2 className="spin" />}
                {loading ? 'Submitting…' : 'Submit feedback'}
              </button>
            </div>
          </form>
        </Section>
      </div>
    </AppShell>
  )
}
