import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, FileUp, Loader2, Sparkles, X } from 'lucide-react'
import api from '../../api/axios'
import AppShell from '../../components/AppShell'
import { Alert, PageHeader, Section } from '../../components/ui'
import { PriorityPill } from '../../components/StatusBadge'
import { aiError, useAiStatus } from '../../lib/ai'

const CATEGORIES = ['Water Issue', 'Network Issue', 'Hostel Issue', 'Service Issue', 'Technical Issue', 'Other']
const ALLOWED = ['.png', '.jpg', '.jpeg', '.gif', '.pdf']
const MAX_BYTES = 5 * 1024 * 1024

const STEPS = [
  ['Pending', 'Your complaint enters the shared queue.'],
  ['Assigned', 'An agent picks it up and it becomes theirs.'],
  ['In Progress', 'You can chat with the agent in real time.'],
  ['Resolved', 'The agent closes it out and you can rate the result.']
]

export default function CreateComplaint() {
  const [form, setForm] = useState({ title: '', description: '', category: 'Network Issue', priority: 'Medium' })
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [suggesting, setSuggesting] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const ai = useAiStatus()
  const fileInput = useRef(null)
  const navigate = useNavigate()

  const suggest = async () => {
    setSuggesting(true)
    setAiMsg('')
    setSuggestion(null)
    try {
      const { data } = await api.post('/ai/triage', { title: form.title, description: form.description })
      setSuggestion(data.suggestion)
    } catch (err) {
      setAiMsg(aiError(err))
    } finally {
      setSuggesting(false)
    }
  }

  const applySuggestion = () => {
    setForm((f) => ({ ...f, title: suggestion.title || f.title, category: suggestion.category, priority: suggestion.priority }))
    setSuggestion(null)
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const pickFile = (f) => {
    if (!f) return
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED.includes(ext)) return setError('Attachments must be an image (PNG, JPG, GIF) or a PDF')
    if (f.size > MAX_BYTES) return setError('Attachments must be 5 MB or smaller')
    setError('')
    setFile(f)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('attachment', file)
      const { data } = await api.post('/complaints', fd)
      setSuccess(true)
      setTimeout(() => navigate(`/complaint/${data.complaint._id}`), 900)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint')
      setLoading(false)
    }
  }

  return (
    <AppShell title="New complaint">
      <PageHeader title="New complaint" subtitle="Tell us what’s wrong and we’ll route it to the right agent" />

      <div className="grid grid-detail">
        <Section title="Complaint details" subtitle="The more specific you are, the faster it gets resolved" bodyClassName="section-pad">
          <form onSubmit={handleSubmit}>
            {error && <div style={{ marginBottom: 16 }}><Alert>{error}</Alert></div>}
            {success && <div style={{ marginBottom: 16 }}><Alert type="success">Complaint submitted — opening it now…</Alert></div>}

            <div className="field">
              <label className="label" htmlFor="title">Title</label>
              <input id="title" className="input" value={form.title} onChange={set('title')} required maxLength={120} placeholder="e.g. Wi-Fi keeps dropping in room 204" />
            </div>

            <div className="field">
              <label className="label" htmlFor="description">Description <span className="hint mono">{form.description.length}/2000</span></label>
              <textarea id="description" className="textarea" rows={5} value={form.description} onChange={set('description')} required maxLength={2000} placeholder="What happened, when it started, and anything you’ve already tried…" />
              {ai.enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-ai btn-sm" onClick={suggest} disabled={suggesting || form.description.trim().length < 15}
                    title={form.description.trim().length < 15 ? 'Describe the problem first' : 'Suggest a title, category and priority'}>
                    {suggesting ? <Loader2 className="spin" /> : <Sparkles />}{suggesting ? 'Thinking…' : 'Suggest with AI'}
                  </button>
                  {aiMsg && <span style={{ color: 'var(--red)', fontSize: 13 }}>{aiMsg}</span>}
                </div>
              )}
            </div>

            {suggestion && (
              <div className="ai-card" style={{ marginTop: 16 }}>
                <div className="ai-card-head">
                  <span className="spark-icon"><Sparkles /></span>AI suggestion
                  <span className="ai-model">{ai.model}</span>
                </div>
                <div style={{ display: 'grid', gap: 6, marginTop: 10, fontSize: 14 }}>
                  <div><span className="muted">Title:</span> {suggestion.title}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="tag">{suggestion.category}</span><PriorityPill priority={suggestion.priority} />
                  </div>
                  {suggestion.reason && <div className="muted" style={{ fontSize: 13 }}>{suggestion.reason}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-dark btn-sm" onClick={applySuggestion}><Check />Apply</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSuggestion(null)}>Dismiss</button>
                </div>
              </div>
            )}

            <div className="field-row" style={{ marginTop: 16 }}>
              <div className="field">
                <label className="label" htmlFor="category">Category</label>
                <select id="category" className="select" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginTop: 0 }}>
                <span className="label">Priority</span>
                <div className="tabs" role="radiogroup" aria-label="Priority" style={{ display: 'flex' }}>
                  {['Low', 'Medium', 'High'].map((p) => (
                    <button type="button" key={p} role="radio" aria-checked={form.priority === p}
                      className={`tab ${form.priority === p ? 'is-active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => setForm({ ...form, priority: p })}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="field">
              <span className="label">Attachment <span className="hint">Optional · PNG, JPG, GIF or PDF up to 5 MB</span></span>
              <div
                className={`dropzone ${drag ? 'is-drag' : ''}`}
                role="button" tabIndex={0}
                onClick={() => fileInput.current.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]) }}
              >
                <span className="dropzone-icon"><FileUp /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {file ? (
                    <>
                      <span style={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      <span className="mono muted" style={{ fontSize: 12 }}>{(file.size / 1024).toFixed(0)} KB</span>
                    </>
                  ) : (
                    <>
                      <span style={{ display: 'block', fontWeight: 500 }}>Drop a file or click to browse</span>
                      <span className="muted" style={{ fontSize: 13 }}>Screenshots help agents reproduce the issue</span>
                    </>
                  )}
                </span>
                {file && (
                  <button type="button" className="icon-btn" aria-label="Remove attachment" onClick={(e) => { e.stopPropagation(); setFile(null) }}>
                    <X />
                  </button>
                )}
              </div>
              <input ref={fileInput} type="file" hidden accept={ALLOWED.join(',')} onChange={(e) => pickFile(e.target.files[0])} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/dashboard')}>Cancel</button>
              <button type="submit" className="btn btn-dark" disabled={loading}>
                {loading ? <Loader2 className="spin" /> : <ArrowRight />}
                {loading ? 'Submitting…' : 'Submit complaint'}
              </button>
            </div>
          </form>
        </Section>

        <Section title="What happens next" bodyClassName="section-pad">
          <ol className="timeline is-plan" style={{ padding: 0 }}>
            {STEPS.map(([status, text]) => (
              <li key={status}>
                <span className="timeline-dot" />
                <div className="timeline-status">{status}</div>
                <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>{text}</div>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </AppShell>
  )
}
