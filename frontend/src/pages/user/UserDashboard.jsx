import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Plus, Sparkles } from 'lucide-react'
import api from '../../api/axios'
import AppShell from '../../components/AppShell'
import ComplaintTable from '../../components/ComplaintTable'
import { Empty, Metric, PageHeader, Section, SkeletonRows } from '../../components/ui'
import {
  average, formatDate, formatDuration, isOpen, matches, monthDelta, monthlyCounts, resolutionTime, timeAgo
} from '../../lib/format'

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'open', label: 'Open', test: isOpen },
  { key: 'done', label: 'Resolved', test: (c) => !isOpen(c) }
]

export default function UserDashboard() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.get('/complaints/mine')
      .then((r) => setComplaints(r.data.complaints))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const open = complaints.filter(isOpen)
    const done = complaints.filter((c) => !isOpen(c))
    const all = monthlyCounts(complaints)
    const openBars = monthlyCounts(complaints, isOpen)
    const doneBars = monthlyCounts(complaints, (c) => !isOpen(c))
    const highBars = monthlyCounts(complaints, (c) => c.priority === 'High')
    const lastResolved = [...done].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]
    return {
      open, done, all, openBars, doneBars, highBars, lastResolved,
      high: complaints.filter((c) => c.priority === 'High' && isOpen(c)).length,
      rate: complaints.length ? Math.round((done.length / complaints.length) * 100) : 0,
      avgTime: average(done.map(resolutionTime)),
      agents: new Set(complaints.map((c) => c.agentId?._id).filter(Boolean)).size
    }
  }, [complaints])

  const rows = complaints
    .filter(FILTERS.find((f) => f.key === filter).test)
    .filter((c) => matches(query, c.title, c.category, c.status, c.priority, c.description, c.agentId?.name))

  const newButton = (
    <Link to="/create-complaint" className="btn btn-dark"><Plus />New complaint</Link>
  )

  return (
    <AppShell title="Overview" search={query} onSearch={setQuery} searchPlaceholder="Search your complaints…">
      <PageHeader title="Overview" subtitle="Here’s where your complaints stand right now" actions={newButton} />

      <div className="grid grid-summary">
        <Section
          title="Summary"
          icon={<span className="spark-icon"><Sparkles /></span>}
          subtitle={loading ? 'Loading your summary…' : complaints.length === 0 ? (
              <>You haven’t submitted any complaints yet. Once you do, you’ll see each one move from <strong>Pending</strong> to <strong>Resolved</strong> here in real time.</>
            ) : (
              <>
                You have <strong>{stats.open.length} open</strong> complaint{stats.open.length === 1 ? '' : 's'}
                {stats.high > 0 && <>, <strong>{stats.high} marked high priority</strong></>}.{' '}
                {stats.lastResolved
                  ? <>The most recent resolution was “{stats.lastResolved.title}” {timeAgo(stats.lastResolved.updatedAt)}.</>
                  : <>Nothing has been resolved yet — agents will pick up your complaints from the queue.</>}
              </>
            )}
          bodyClassName="section-pad"
        >
          <div style={{ fontWeight: 500, marginBottom: 12 }}>Resolution snapshot</div>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-box-value">{stats.rate}%</div>
              <div className="stat-box-label">Resolved</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{formatDuration(stats.avgTime)}</div>
              <div className="stat-box-label">Avg. time to resolve</div>
            </div>
          </div>
          <div className="meta-line" style={{ marginTop: 18 }}>
            <span>Last updated:<b>{formatDate(new Date())}</b></span>
            <span>Agents helping you:<b>{stats.agents}</b></span>
          </div>
        </Section>

        <div className="metrics">
          <Metric title="Submitted" value={complaints.length} delta={monthDelta(stats.all)} bars={stats.all} />
          <Metric title="Open" value={stats.open.length} caption="by month submitted" bars={stats.openBars} />
          <Metric title="Resolved" value={stats.done.length} caption="by month submitted" bars={stats.doneBars} />
          <Metric title="High priority" value={stats.high} caption="open right now" bars={stats.highBars} />
        </div>
      </div>

      <Section
        title="Your complaints"
        subtitle="Everything you’ve submitted, newest first"
        actions={
          <div className="tabs" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.key} role="tab" aria-selected={filter === f.key} className={`tab ${filter === f.key ? 'is-active' : ''}`} onClick={() => setFilter(f.key)}>
                {f.label}
                <span className="mono">{complaints.filter(f.test).length}</span>
              </button>
            ))}
          </div>
        }
      >
        {loading ? <SkeletonRows /> : rows.length === 0 ? (
          <Empty
            icon={Inbox}
            title={complaints.length ? 'No matching complaints' : 'No complaints yet'}
            text={complaints.length ? 'Try a different filter or search.' : 'Submit your first complaint and we’ll route it to an agent.'}
            action={!complaints.length && newButton}
          />
        ) : (
          <ComplaintTable complaints={rows} columns={['title', 'priority', 'status', 'category', 'agent', 'updated', 'note']} />
        )}
      </Section>
    </AppShell>
  )
}
