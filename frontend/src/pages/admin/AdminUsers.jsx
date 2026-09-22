import { useEffect, useState } from 'react'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

export default function AdminUsers() {
  const [users, setUsers] = useState([])

  useEffect(() => { load() }, [])

  const load = () => api.get('/admin/users').then(r => setUsers(r.data.users)).catch(() => {})

  const toggleActive = async (id) => {
    await api.put(`/admin/users/${id}/toggle-active`).catch(() => {})
    load()
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return
    await api.delete(`/admin/users/${id}`).catch(() => {})
    load()
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1a2e', marginBottom: '24px' }}>Manage Users</h1>
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>No users found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Name', 'Email', 'Phone', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px' }}>{u.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{u.email}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{u.phone}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: u.isActive ? '#dcfce7' : '#f3f4f6', color: u.isActive ? '#166534' : '#6b7280', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#9ca3af' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => toggleActive(u._id)} style={{ background: u.isActive ? '#fef3c7' : '#dcfce7', color: u.isActive ? '#92400e' : '#166534', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => remove(u._id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
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
