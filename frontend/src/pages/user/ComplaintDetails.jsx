import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlarmClock, ArrowLeft, Loader2, MessagesSquare, Paperclip, RotateCcw, SendHorizontal, Sparkles, Star, UserPlus, WandSparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { getSocket } from '../../lib/socket'
import { aiError, useAiStatus } from '../../lib/ai'
import AppShell from '../../components/AppShell'
import StatusBadge, { PriorityPill } from '../../components/StatusBadge'
import { Alert, Empty, PageHeader, Section } from '../../components/ui'
import { DONE_STATUSES, SLA_HOURS, formatDateTime, isOverdue, timeAgo } from '../../lib/format'

const STATUSES = ['Assigned', 'In Progress', 'Resolved', 'Closed']
const ROLE_LABEL = { USER: 'Customer', AGENT: 'Agent', ADMIN: 'Admin' }
const SENTIMENT = { positive: 'pill-resolved', neutral: 'pill-closed', negative: 'pill-medium', frustrated: 'pill-high' }

export default function ComplaintDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState(null)
  const [messages, setMessages] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [msgInput, setMsgInput] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [agentIdInput, setAgentIdInput] = useState('')
  const [agents, setAgents] = useState([])
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [chatError, setChatError] = useState('')
  const [live, setLive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [reason, setReason] = useState('')
  const [summary, setSummary] = useState(null)
  const [aiBusy, setAiBusy] = useState('')
  const [aiMsg, setAiMsg] = useState('')
  const ai = useAiStatus()
  const logRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchComplaint()
    api.get(`/chat/${id}`).then(({ data }) => setMessages(data.messages)).catch(() => {})

    const socket = getSocket()
    if (!socket) return
    const join = () => {
      setLive(true)
      setChatError('')
      socket.emit('join_complaint', id)
    }
    const onMessage = (msg) => {
      if (msg.complaintId !== id) return
      setChatError('')
      setMessages((prev) => [...prev, msg])
    }
    const onDisconnect = () => setLive(false)
    const onChatError = (e) => setChatError(e?.message || 'Chat error')
    const onConnectError = () => { setLive(false); setChatError('Live chat is unavailable right now') }
    // Status changes made by someone else show up without a refresh
    const onNotification = (n) => {
      if (n.complaintId === id && n.type !== 'message') fetchComplaint()
    }
    if (socket.connected) join()
    socket.on('connect', join)
    socket.on('disconnect', onDisconnect)
    socket.on('receive_message', onMessage)
    socket.on('chat_error', onChatError)
    socket.on('connect_error', onConnectError)
    socket.on('notification', onNotification)
    return () => {
      socket.emit('leave_complaint', id)
      socket.off('connect', join)
      socket.off('disconnect', onDisconnect)
      socket.off('receive_message', onMessage)
      socket.off('chat_error', onChatError)
      socket.off('connect_error', onConnectError)
      socket.off('notification', onNotification)
    }
  }, [id])

  useEffect(() => {
    if (user.role !== 'ADMIN') return
    api.get('/admin/agents')
      .then(({ data }) => setAgents(data.agents.filter((a) => a.isActive)))
      .catch(() => {})
  }, [user.role])

  // Keep the newest message in view without scrolling the whole page
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages])

  const fetchComplaint = async () => {
    try {
      const { data } = await api.get(`/complaints/${id}`)
      setComplaint(data.complaint)
      setNewStatus(data.complaint.status)
      if (DONE_STATUSES.includes(data.complaint.status)) {
        api.get(`/feedback/${id}`).then((r) => setFeedback(r.data.feedback)).catch(() => {})
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load complaint')
    }
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!msgInput.trim()) return
    getSocket()?.emit('send_message', { complaintId: id, message: msgInput.trim() })
    setMsgInput('')
  }

  const reopen = async (e) => {
    e.preventDefault()
    await runAction(() => api.put(`/complaints/${id}/reopen`, { reason }), 'Could not reopen the complaint')
    setReopening(false)
    setReason('')
  }

  const summarize = async () => {
    setAiBusy('summary')
    setAiMsg('')
    try {
      const { data } = await api.post(`/ai/complaints/${id}/summary`)
      setSummary(data.summary)
    } catch (err) {
      setAiMsg(aiError(err))
    } finally {
      setAiBusy('')
    }
  }

  // Fills the message box; the agent reviews and edits before sending
  const draftReply = async () => {
    setAiBusy('reply')
    setAiMsg('')
    try {
      const { data } = await api.post(`/ai/complaints/${id}/reply`)
      setMsgInput(data.draft)
      inputRef.current?.focus()
    } catch (err) {
      setAiMsg(aiError(err))
    } finally {
      setAiBusy('')
    }
  }

  const runAction = async (fn, fallback) => {
    setActionError('')
    setSaving(true)
    try {
      await fn()
      await fetchComplaint()
    } catch (err) {
      setActionError(err.response?.data?.message || fallback)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = () => runAction(() => api.put(`/complaints/${id}/status`, { status: newStatus }), 'Failed to update status')

  const assignAgent = () => {
    if (!agentIdInput) return
    runAction(async () => {
      await api.put(`/complaints/${id}/assign`, { agentId: agentIdInput })
      setAgentIdInput('')
    }, 'Failed to assign agent')
  }

  // Attachments need the auth header, so fetch as a blob rather than linking directly
  const openAttachment = async () => {
    const tab = window.open('', '_blank')
    try {
      const { data } = await api.get(`/complaints/${id}/attachment`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      if (tab) tab.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      tab?.close()
      setActionError('Could not open the attachment')
    }
  }

  const backTo = user.role === 'ADMIN' ? '/admin/complaints' : user.role === 'AGENT' ? '/agent?view=mine' : '/dashboard'

  if (error || !complaint) {
    return (
      <AppShell title="Complaint" parent="Complaints">
        {error ? (
          <Empty icon={MessagesSquare} title="Can’t open this complaint" text={error}
            action={<button className="btn btn-outline" onClick={() => navigate(backTo)}><ArrowLeft />Go back</button>} />
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            <div className="skeleton" style={{ height: 30, width: '40%' }} />
            <div className="skeleton" style={{ height: 16, width: '25%' }} />
            <div className="skeleton" style={{ height: 320, marginTop: 16 }} />
          </div>
        )}
      </AppShell>
    )
  }

  const canManage = user.role === 'AGENT' || user.role === 'ADMIN'
  const isResolved = DONE_STATUSES.includes(complaint.status)
  const mine = (m) => (m.senderId?._id || m.senderId) === user.id

  const actions = (
    <>
      <button className="btn btn-outline" onClick={() => navigate(backTo)}><ArrowLeft />Back</button>
      {complaint.attachment && (
        <button className="btn btn-outline" onClick={openAttachment}><Paperclip />Attachment</button>
      )}
      {user.role === 'USER' && isResolved && (
        <button className="btn btn-outline" onClick={() => setReopening((r) => !r)}><RotateCcw />Reopen</button>
      )}
      {user.role === 'USER' && isResolved && !feedback && (
        <button className="btn btn-accent" onClick={() => navigate(`/feedback/${id}`)}><Star />Rate resolution</button>
      )}
    </>
  )

  return (
    <AppShell title={complaint.title} parent="Complaints">
      <PageHeader
        title={complaint.title}
        subtitle={<>
          <span className="mono muted">#{complaint._id.slice(-6).toUpperCase()}</span> · submitted {timeAgo(complaint.createdAt)}
          {isOverdue(complaint) && <> · <span className="pill pill-overdue" title={`${complaint.priority} priority target is ${SLA_HOURS[complaint.priority]}h`}><AlarmClock size={13} />Overdue</span></>}
        </>}
        actions={actions}
      />
      {actionError && <div style={{ marginBottom: 16 }}><Alert>{actionError}</Alert></div>}
      {reopening && (
        <form className="section" style={{ marginBottom: 20 }} onSubmit={reopen}>
          <div className="section-body section-pad">
            <div className="field">
              <label className="label" htmlFor="reason">What’s still wrong? <span className="hint mono">{reason.length}/500</span></label>
              <textarea id="reason" className="textarea" rows={3} maxLength={500} required autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder={complaint.agentId ? `${complaint.agentId.name} will see this and pick it back up.` : 'It goes back to the queue for an agent to pick up.'} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn btn-outline" onClick={() => setReopening(false)}>Cancel</button>
              <button className="btn btn-dark" disabled={saving || !reason.trim()}><RotateCcw />Reopen complaint</button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-detail">
        <div className="grid" style={{ gap: 20 }}>
          <Section title="Details">
            <p className="detail-desc">{complaint.description}</p>
            <dl className="detail-meta">
              <div><dt>Status</dt><dd><StatusBadge status={complaint.status} /></dd></div>
              <div><dt>Priority</dt><dd><PriorityPill priority={complaint.priority} /></dd></div>
              <div><dt>Category</dt><dd><span className="tag">{complaint.category}</span></dd></div>
              <div><dt>Submitted by</dt><dd>{complaint.userId?.name || '—'}</dd></div>
              <div><dt>Agent</dt><dd>{complaint.agentId?.name || <span className="muted">Unassigned</span>}</dd></div>
            </dl>
          </Section>

          <Section
            title="Conversation"
            subtitle="Messages are delivered instantly to everyone on this complaint"
            actions={<span className={`chat-status ${live ? 'is-live' : ''}`}>{live ? 'LIVE' : 'OFFLINE'}</span>}
          >
            <div className="chat">
              <div className="chat-log" ref={logRef}>
                {messages.length === 0 ? (
                  <Empty icon={MessagesSquare} title="No messages yet"
                    text={complaint.agentId ? 'Start the conversation below.' : 'You can leave a message now — the agent will see it once assigned.'} />
                ) : messages.map((m, i) => (
                  <div key={m._id || i} className={`msg ${mine(m) ? 'is-mine' : ''}`}>
                    <div style={{ minWidth: 0 }}>
                      <div className="msg-meta">
                        <span>{mine(m) ? 'You' : ROLE_LABEL[m.senderRole] || m.senderRole}</span>
                        <span>{formatDateTime(m.timestamp)}</span>
                      </div>
                      <div className="msg-bubble">{m.message}</div>
                    </div>
                  </div>
                ))}
              </div>
              {chatError && <div style={{ padding: '0 12px 8px' }}><Alert>{chatError}</Alert></div>}
              <form className="chat-input" onSubmit={sendMessage}>
                {canManage && ai.enabled && (
                  <button type="button" className="btn btn-ai" onClick={draftReply} disabled={aiBusy === 'reply'} title="Draft a reply with AI — you can edit it before sending">
                    {aiBusy === 'reply' ? <Loader2 className="spin" /> : <WandSparkles />}Draft
                  </button>
                )}
                <input ref={inputRef} className="input" value={msgInput} onChange={(e) => setMsgInput(e.target.value)} maxLength={2000}
                  placeholder="Write a message…" aria-label="Message" />
                <button type="submit" className="btn btn-dark" disabled={!msgInput.trim() || !live}>
                  <SendHorizontal />Send
                </button>
              </form>
            </div>
          </Section>
        </div>

        <div className="grid" style={{ gap: 20 }}>
          {canManage && (
            <Section title="Manage" bodyClassName="section-pad">
              <div className="field">
                <label className="label" htmlFor="status">Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select id="status" className="select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn btn-dark" onClick={updateStatus} disabled={saving || newStatus === complaint.status}>Update</button>
                </div>
              </div>
              {user.role === 'ADMIN' && !complaint.agentId && (
                <div className="field">
                  <label className="label" htmlFor="agent">Assign agent</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select id="agent" className="select" value={agentIdInput} onChange={(e) => setAgentIdInput(e.target.value)}>
                      <option value="">{agents.length ? 'Choose an agent…' : 'No active agents'}</option>
                      {agents.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                    <button className="btn btn-outline" onClick={assignAgent} disabled={saving || !agentIdInput}><UserPlus />Assign</button>
                  </div>
                </div>
              )}
            </Section>
          )}

          {ai.enabled && (
            <Section
              title="AI summary"
              icon={<span className="spark-icon"><Sparkles /></span>}
              actions={
                <button className="btn btn-ai btn-sm" onClick={summarize} disabled={aiBusy === 'summary'}>
                  {aiBusy === 'summary' ? <Loader2 className="spin" /> : <Sparkles />}{summary ? 'Refresh' : 'Summarise'}
                </button>
              }
              bodyClassName="section-pad"
            >
              {aiMsg && <div style={{ marginBottom: summary ? 12 : 0 }}><Alert>{aiMsg}</Alert></div>}
              {summary ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{summary.summary}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="muted" style={{ fontSize: 13 }}>Customer mood</span>
                    <span className={`pill pill-dot ${SENTIMENT[summary.sentiment]}`}>{summary.sentiment}</span>
                  </div>
                  {summary.nextStep && (
                    <div className="ai-card"><div className="ai-card-head">Suggested next step</div><p>{summary.nextStep}</p></div>
                  )}
                </div>
              ) : !aiMsg && (
                <p className="muted">Get a quick read of the problem, the conversation so far and what to do next.</p>
              )}
            </Section>
          )}

          {feedback && (
            <Section title="Feedback" bodyClassName="section-pad">
              <div style={{ display: 'flex', gap: 3, color: 'var(--accent)' }} aria-label={`${feedback.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={18} fill={n <= feedback.rating ? 'currentColor' : 'none'} />)}
              </div>
              {feedback.comment && <p style={{ marginTop: 10, color: 'var(--text-2)' }}>“{feedback.comment}”</p>}
            </Section>
          )}

          <Section title="Activity" subtitle="Every status change on this complaint">
            <ol className="timeline" style={{ paddingTop: 18 }}>
              {complaint.statusHistory.map((h, i) => (
                <li key={i}>
                  <span className="timeline-dot" />
                  <div className="timeline-status">{h.status}</div>
                  <div className="timeline-time">{formatDateTime(h.changedAt)}{h.changedBy?.name && ` · ${h.changedBy.name}`}</div>
                  {h.note && <div className="timeline-note">{h.note}</div>}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </AppShell>
  )
}
