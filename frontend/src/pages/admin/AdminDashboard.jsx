import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

const COLORS = ['#c00000', '#1d4ed8', '#16a34a', '#d97706', '#7c3aed', '#0891b2']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminDashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/admin/analytics').then(r => setData(r.data)).catch(() => {})
  }, [])

  if (!data) return <div><Navbar /><div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading analytics...</div></div>

  const statCards = [
    { label: 'Total Complaints', value: data.totalComplaints, color: '#c00000', icon: '📋' },
    { label: 'Open', value: data.openComplaints, color: '#d97706', icon: '⏳' },
    { label: 'Resolved', value: data.resolvedComplaints, color: '#16a34a', icon: '✅' },
    { label: 'Total Users', value: data.totalUsers, color: '#1d4ed8', icon: '👥' },
    { label: 'Active Agents', value: data.activeAgents, color: '#7c3aed', icon: '🧑‍💼' },
    { label: 'Avg Rating', value: data.avgRating?.toFixed(1) || '0.0', color: '#f59e0b', icon: '⭐' }
  ]

  const monthData = data.byMonth.map(m => ({
    name: `${MONTHS[m._id.month - 1]} ${m._id.year}`,
    complaints: m.count
  }))

  const categoryData = data.byCategory.map(c => ({ name: c._id, value: c.count }))

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1a2e', marginBottom: '28px' }}>Admin Dashboard</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {statCards.map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: '#1a1a2e' }}>Complaints by Month</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="complaints" stroke="#c00000" strokeWidth={2} dot={{ fill: '#c00000' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: '#1a1a2e' }}>Complaints by Category</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {data.agentPerformance?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: '#1a1a2e' }}>Agent Performance</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.agentPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="agentName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total Assigned" fill="#c00000" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
