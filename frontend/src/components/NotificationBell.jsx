import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, MessageSquare, RotateCcw, Star, UserCheck, Workflow } from 'lucide-react'
import api from '../api/axios'
import { getSocket } from '../lib/socket'
import { timeAgo } from '../lib/format'

const ICONS = { assigned: UserCheck, status: Workflow, message: MessageSquare, reopened: RotateCcw, feedback: Star }

export default function NotificationBell() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const unread = items.filter((n) => !n.read).length

  useEffect(() => {
    api.get('/notifications').then(({ data }) => setItems(data.notifications)).catch(() => {})

    const socket = getSocket()
    if (!socket) return
    // Collapsed message notifications arrive again with the same id: replace, don't duplicate
    const onNote = (n) => setItems((prev) => [n, ...prev.filter((p) => p._id !== n._id)].slice(0, 30))
    socket.on('notification', onNote)
    return () => socket.off('notification', onNote)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openItem = (n) => {
    setOpen(false)
    if (!n.read) {
      setItems((prev) => prev.map((p) => (p._id === n._id ? { ...p, read: true } : p)))
      api.put(`/notifications/${n._id}/read`).catch(() => {})
    }
    if (n.complaintId) navigate(`/complaint/${n.complaintId}`)
  }

  const readAll = () => {
    setItems((prev) => prev.map((p) => ({ ...p, read: true })))
    api.put('/notifications/read-all').catch(() => {})
  }

  return (
    <div className="bell" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
        <Bell />
        {unread > 0 && <span className="bell-dot mono">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="bell-menu" role="menu">
          <div className="bell-head">
            <span style={{ fontWeight: 600 }}>Notifications</span>
            {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={readAll}><CheckCheck />Mark all read</button>}
          </div>
          <div className="bell-list">
            {items.length === 0 ? (
              <div className="muted" style={{ padding: '28px 16px', textAlign: 'center' }}>You’re all caught up.</div>
            ) : items.map((n) => {
              const Icon = ICONS[n.type] || Bell
              return (
                <button key={n._id} role="menuitem" className={`bell-item ${n.read ? '' : 'is-unread'}`} onClick={() => openItem(n)}>
                  <span className="bell-icon"><Icon /></span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="bell-title">{n.title}</span>
                    {n.body && <span className="bell-body">{n.body}</span>}
                  </span>
                  <span className="bell-time mono">{timeAgo(n.updatedAt || n.createdAt)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
