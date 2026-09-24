import { useEffect, useState } from 'react'
import { Download, Inbox } from 'lucide-react'
import api from '../../api/axios'
import AppShell from '../../components/AppShell'
import ComplaintTable from '../../components/ComplaintTable'
import { Empty, PageHeader, Section, SkeletonRows } from '../../components/ui'
import { matches } from '../../lib/format'
import { downloadComplaintsCsv } from '../../lib/csv'

const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed']

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState(null)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.get('/complaints').then((r) => setComplaints(r.data.complaints)).catch(() => setComplaints([]))
  }, [])

  const all = complaints || []
  const rows = all
    .filter((c) => !status || c.status === status)
    .filter((c) => !priority || c.priority === priority)
    .filter((c) => matches(query, c.title, c.category, c.description, c.userId?.name, c.agentId?.name))

  return (
    <AppShell title="Complaints" search={query} onSearch={setQuery} searchPlaceholder="Search by title, user or agent…">
      <PageHeader
        title="Complaints"
        subtitle="Every complaint across all users"
        actions={
          <button className="btn btn-dark" onClick={() => downloadComplaintsCsv(rows)} disabled={!rows.length}>
            <Download />Export {rows.length !== all.length ? 'filtered' : 'all'}
          </button>
        }
      />

      <Section
        title="All complaints"
        subtitle={`${rows.length} of ${all.length} shown`}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="tabs" role="tablist" style={{ overflowX: 'auto', maxWidth: '100%' }}>
              {['', ...STATUSES].map((s) => (
                <button key={s || 'all'} role="tab" aria-selected={status === s} className={`tab ${status === s ? 'is-active' : ''}`} onClick={() => setStatus(s)}>
                  {s || 'All'}
                  <span className="mono">{s ? all.filter((c) => c.status === s).length : all.length}</span>
                </button>
              ))}
            </div>
            <select className="select" style={{ width: 150, height: 40 }} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
              <option value="">Any priority</option>
              {['High', 'Medium', 'Low'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        }
      >
        {!complaints ? <SkeletonRows rows={6} /> : rows.length === 0 ? (
          <Empty icon={Inbox} title={all.length ? 'No matching complaints' : 'No complaints yet'} text={all.length ? 'Try a different status, priority or search.' : 'They’ll appear here as soon as users submit them.'} />
        ) : (
          <ComplaintTable complaints={rows} columns={['title', 'user', 'priority', 'status', 'category', 'agent', 'updated']} />
        )}
      </Section>
    </AppShell>
  )
}
