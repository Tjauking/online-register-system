import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import StatusBadge from '../../components/StatusBadge'

export default function UserDashboard() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/complaints/mine').then(r => {
      setComplaints(r.data.complaints)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const total = complaints.length
  const active = complaints.filter(c => !['Resolved', 'Closed'].includes(c.status)).length
  const resolved = complaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length

  const statCards = [
    { label: 'Total Complaints', value: total, color: '#c00000', icon: '📋' },
    { label: 'Active', value: active, color: '#d97706', icon: '⏳' },
    { label: 'Resolved', value: resolved, color: '#16a34a', icon: '✅' }
  ]

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1a2e' }}>My Dashboard</h1>
          <Link to="/create-complaint" style={{
            background: '#c00000', color: '#fff', padding: '10px 22px',
            borderRadius: '8px', fontWeight: 600, fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            + New Complaint
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {statCards.map((s, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: '12px', padding: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}`
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>My Complaints</h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>Loading...</div>
          ) : complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <p style={{ color: '#888' }}>No complaints yet. <Link to="/create-complaint" style={{ color: '#c00000', fontWeight: 600 }}>Submit one now</Link></p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Title', 'Category', 'Priority', 'Status', 'Agent', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px' }}>{c.title}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{c.category}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                        background: c.priority === 'High' ? '#fee2e2' : c.priority === 'Medium' ? '#fef3c7' : '#f0fdf4',
                        color: c.priority === 'High' ? '#c00000' : c.priority === 'Medium' ? '#92400e' : '#166534'
                      }}>
                        {c.priority}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{c.agentId?.name || '-'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#9ca3af' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => navigate(`/complaint/${c._id}`)}
                        style={{
                          background: '#c00000', color: '#fff', border: 'none',
                          padding: '7px 16px', borderRadius: '6px', fontSize: '13px',
                          fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
