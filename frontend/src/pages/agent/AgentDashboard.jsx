import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import StatusBadge from '../../components/StatusBadge'

export default function AgentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [assigned, setAssigned] = useState([])
  const [pool, setPool] = useState([])
  const [tab, setTab] = useState('pool')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const [a, p] = await Promise.all([
      api.get('/complaints/assigned').catch(() => ({ data: { complaints: [] } })),
      api.get('/complaints/unassigned').catch(() => ({ data: { complaints: [] } }))
    ])
    setAssigned(a.data.complaints)
    setPool(p.data.complaints)
  }

  const take = async (id) => {
    try {
      await api.put(`/complaints/${id}/take`)
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to take complaint')
    }
  }

  const stats = [
    { label: 'In Pool', value: pool.length, color: '#c00000', icon: '📥' },
    { label: 'My Assigned', value: assigned.length, color: '#d97706', icon: '📋' },
    { label: 'Resolved', value: assigned.filter(c => ['Resolved', 'Closed'].includes(c.status)).length, color: '#16a34a', icon: '✅' }
  ]

  const tabStyle = (active) => ({
    padding: '10px 24px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
    borderBottom: active ? '2px solid #c00000' : '2px solid transparent',
    color: active ? '#c00000' : '#6b7280', background: 'transparent'
  })

  const tableHead = (cols) => (
    <thead>
      <tr style={{ background: '#fafafa' }}>
        {cols.map(h => (
          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
        ))}
      </tr>
    </thead>
  )

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1a2e' }}>Agent Dashboard</h1>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>Agent ID: <code style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>{user?.id}</code></p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
            <button style={tabStyle(tab === 'pool')} onClick={() => setTab('pool')}>
              📥 Unassigned Pool ({pool.length})
            </button>
            <button style={tabStyle(tab === 'mine')} onClick={() => setTab('mine')}>
              📋 My Complaints ({assigned.length})
            </button>
          </div>

          {tab === 'pool' && (
            pool.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
                <p style={{ color: '#888' }}>No unassigned complaints right now.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {tableHead(['Title', 'User', 'Category', 'Priority', 'Submitted', ''])}
                <tbody>
                  {pool.map(c => (
                    <tr key={c._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px' }}>{c.title}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{c.userId?.name}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{c.category}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: c.priority === 'High' ? '#fee2e2' : c.priority === 'Medium' ? '#fef3c7' : '#f0fdf4', color: c.priority === 'High' ? '#c00000' : c.priority === 'Medium' ? '#92400e' : '#166534' }}>
                          {c.priority}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#9ca3af' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <button onClick={() => take(c._id)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                          Take
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'mine' && (
            assigned.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                <p style={{ color: '#888' }}>You haven't taken any complaints yet. Check the pool.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {tableHead(['Title', 'User', 'Category', 'Priority', 'Status', ''])}
                <tbody>
                  {assigned.map(c => (
                    <tr key={c._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px' }}>{c.title}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{c.userId?.name}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{c.category}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: c.priority === 'High' ? '#fee2e2' : '#fef3c7', color: c.priority === 'High' ? '#c00000' : '#92400e' }}>
                          {c.priority}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}><StatusBadge status={c.status} /></td>
                      <td style={{ padding: '14px 16px' }}>
                        <button onClick={() => navigate(`/complaint/${c._id}`)} style={{ background: '#c00000', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  )
}
