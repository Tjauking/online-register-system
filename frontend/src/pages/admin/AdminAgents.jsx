import { useEffect, useState } from 'react'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

export default function AdminAgents() {
  const [agents, setAgents] = useState([])
  const [copied, setCopied] = useState('')

  useEffect(() => { load() }, [])

  const load = () => api.get('/admin/agents').then(r => setAgents(r.data.agents)).catch(() => {})

  const toggleActive = async (id) => {
    await api.put(`/admin/users/${id}/toggle-active`).catch(() => {})
    load()
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this agent?')) return
    await api.delete(`/admin/users/${id}`).catch(() => {})
    load()
  }

  const copy = (id) => {
    navigator.clipboard.writeText(id)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>Manage Agents</h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Agents self-register with the agent code. Copy an Agent ID to manually assign complaints.</p>

        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {agents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>No agents registered yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Name', 'Email', 'Phone', 'Agent ID', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px' }}>{a.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{a.email}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{a.phone}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', color: '#374151' }}>
                          {a._id.slice(0, 12)}...
                        </code>
                        <button onClick={() => copy(a._id)} style={{ background: copied === a._id ? '#dcfce7' : '#f3f4f6', color: copied === a._id ? '#166534' : '#374151', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                          {copied === a._id ? '✅ Copied' : 'Copy'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: a.isActive ? '#dcfce7' : '#f3f4f6', color: a.isActive ? '#166534' : '#6b7280', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        {a.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => toggleActive(a._id)} style={{ background: a.isActive ? '#fef3c7' : '#dcfce7', color: a.isActive ? '#92400e' : '#166534', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        {a.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => remove(a._id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        Delete
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
