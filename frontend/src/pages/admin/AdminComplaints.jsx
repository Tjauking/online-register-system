import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import StatusBadge from '../../components/StatusBadge'

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([])
  const [filter, setFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => { load() }, [filter])

  const load = () => {
    const q = filter ? `?status=${encodeURIComponent(filter)}` : ''
    api.get(`/complaints${q}`).then(r => setComplaints(r.data.complaints)).catch(() => {})
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1a2e' }}>All Complaints</h1>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}>
            <option value="">All Statuses</option>
            {['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>No complaints found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Title', 'User', 'Category', 'Priority', 'Status', 'Agent', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{c.userId?.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{c.category}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: c.priority === 'High' ? '#fee2e2' : c.priority === 'Medium' ? '#fef3c7' : '#f0fdf4', color: c.priority === 'High' ? '#c00000' : c.priority === 'Medium' ? '#92400e' : '#166534' }}>
                        {c.priority}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{c.agentId?.name || '-'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#9ca3af' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => navigate(`/complaint/${c._id}`)} style={{ background: '#c00000', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        Open
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
