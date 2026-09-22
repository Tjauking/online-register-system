import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import StatusBadge from '../../components/StatusBadge'

export default function ComplaintDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [agentIdInput, setAgentIdInput] = useState('')
  const [error, setError] = useState('')
  const socketRef = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    fetchComplaint()
    fetchChat()

    const socket = io(`http://${window.location.hostname}:5000`, {
      auth: { token: localStorage.getItem('cms_token') }
    })
    socketRef.current = socket
    socket.emit('join_complaint', id)
    socket.on('receive_message', msg => {
      setMessages(prev => [...prev, msg])
    })
    return () => socket.disconnect()
  }, [id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchComplaint = async () => {
    try {
      const { data } = await api.get(`/complaints/${id}`)
      setComplaint(data.complaint)
      setNewStatus(data.complaint.status)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load complaint')
    }
  }

  const fetchChat = async () => {
    try {
      const { data } = await api.get(`/chat/${id}`)
      setMessages(data.messages)
    } catch {}
  }

  const sendMessage = () => {
    if (!msgInput.trim()) return
    socketRef.current?.emit('send_message', { complaintId: id, senderRole: user.role, message: msgInput.trim() })
    setMsgInput('')
  }

  const updateStatus = async () => {
    try {
      await api.put(`/complaints/${id}/status`, { status: newStatus })
      fetchComplaint()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status')
    }
  }

  const assignAgent = async () => {
    try {
      await api.put(`/complaints/${id}/assign`, { agentId: agentIdInput })
      fetchComplaint()
      setAgentIdInput('')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign agent')
    }
  }

  if (error) return <div><Navbar /><div style={{ textAlign: 'center', padding: '60px', color: '#c00000' }}>{error}</div></div>
  if (!complaint) return <div><Navbar /><div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading...</div></div>

  const isAgent = user.role === 'AGENT' || user.role === 'ADMIN'
  const isUser = user.role === 'USER'
  const isResolved = ['Resolved', 'Closed'].includes(complaint.status)

  const baseUrl = `http://${window.location.hostname}:5000`

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', flex: 1 }}>{complaint.title}</h2>
            <StatusBadge status={complaint.status} />
          </div>
          <p style={{ color: '#555', lineHeight: 1.7, marginBottom: '16px' }}>{complaint.description}</p>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[
              ['Category', complaint.category],
              ['Priority', complaint.priority],
              ['User', complaint.userId?.name],
              ['Agent', complaint.agentId?.name || 'Not assigned']
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginTop: '2px' }}>{v}</div>
              </div>
            ))}
          </div>
          {complaint.attachment && (
            <a href={`${baseUrl}${complaint.attachment}`} target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', marginTop: '16px', color: '#c00000', fontSize: '13px', fontWeight: 600 }}>
              📎 View Attachment
            </a>
          )}
          {isUser && isResolved && (
            <button onClick={() => navigate(`/feedback/${id}`)} style={{
              marginTop: '16px', padding: '10px 20px', background: '#16a34a',
              color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'block'
            }}>
              ⭐ Give Feedback
            </button>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: '#1a1a2e' }}>Status Timeline</h3>
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            {complaint.statusHistory.map((h, i) => (
              <div key={i} style={{ marginBottom: '16px', position: 'relative' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%', background: '#c00000',
                  position: 'absolute', left: '-19px', top: '4px'
                }} />
                {i < complaint.statusHistory.length - 1 && (
                  <div style={{ position: 'absolute', left: '-15px', top: '14px', width: '2px', height: '24px', background: '#e5e7eb' }} />
                )}
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{h.status}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{new Date(h.changedAt).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {isAgent && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#374151' }}>Update Status</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}>
                  {['Assigned', 'In Progress', 'Resolved', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={updateStatus} style={{ padding: '10px 20px', background: '#c00000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  Update
                </button>
              </div>
            </div>
          )}

          {user.role === 'ADMIN' && !complaint.agentId && (
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#374151' }}>Manually Assign Agent (paste Agent ID)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input value={agentIdInput} onChange={e => setAgentIdInput(e.target.value)}
                  placeholder="Agent User ID"
                  style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                <button onClick={assignAgent} style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  Assign
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1a1a2e' }}>💬 Live Chat</h3>
          <div style={{
            height: '320px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '10px',
            padding: '16px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px'
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', marginTop: 'auto', marginBottom: 'auto', fontSize: '14px' }}>
                No messages yet. Start the conversation.
              </div>
            ) : messages.map((m, i) => {
              const mine = m.senderId === user.id || m.senderId?._id === user.id
              return (
                <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '65%', padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: mine ? '#c00000' : '#e5e7eb', color: mine ? '#fff' : '#1a1a2e',
                    fontSize: '14px', lineHeight: 1.5
                  }}>
                    {!mine && <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', opacity: 0.7 }}>{m.senderRole}</div>}
                    {m.message}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message and press Enter..."
              style={{ flex: 1, padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              onFocus={e => e.target.style.border = '1.5px solid #c00000'}
              onBlur={e => e.target.style.border = '1.5px solid #e5e7eb'}
            />
            <button onClick={sendMessage} style={{ padding: '11px 22px', background: '#c00000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
