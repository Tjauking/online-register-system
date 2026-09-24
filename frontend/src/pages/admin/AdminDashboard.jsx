import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Download, Inbox, Loader2, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react'
import api from '../../api/axios'
import AppShell from '../../components/AppShell'
import ComplaintTable from '../../components/ComplaintTable'
import { Empty, Metric, PageHeader, Section, SkeletonRows } from '../../components/ui'
import { formatDate, isOverdue, matches, monthDelta } from '../../lib/format'
import { aiError, useAiStatus } from '../../lib/ai'
import { downloadComplaintsCsv } from '../../lib/csv'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Server returns sparse {year, month} groups; fill the last six months with zeros
const lastSixMonths = (byMonth, field) => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const hit = byMonth.find((m) => m._id.year === d.getFullYear() && m._id.month === d.getMonth() + 1)
    return { label: MONTHS[d.getMonth()], value: hit ? hit[field] : 0 }
  })
}

function HBarList({ items, empty }) {
  if (!items.length) return <p className="muted">{empty}</p>
  const max = Math.max(1, ...items.map((i) => i.max ?? i.value))
  return (
    <div className="hbar-list">
      {items.map((item) => (
        <div key={item.label}>
          <div className="hbar-head">
            <span>{item.label}</span>
            <span className="mono">{item.caption ?? item.value}</span>
          </div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${((item.value / (item.max ?? max)) * 100).toFixed(1)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [complaints, setComplaints] = useState(null)
  const [query, setQuery] = useState('')
  const [insight, setInsight] = useState(null)
  const [insightState, setInsightState] = useState('idle')
  const [insightError, setInsightError] = useState('')
  const ai = useAiStatus()

  const loadInsight = async (refresh = false) => {
    setInsightState('loading')
    setInsightError('')
    try {
      const { data } = await api.get(`/ai/insights${refresh ? '?refresh=1' : ''}`)
      setInsight(data)
      setInsightState('done')
    } catch (err) {
      setInsightError(aiError(err))
      setInsightState('error')
    }
  }

  useEffect(() => {
    if (ai.enabled) loadInsight()
  }, [ai.enabled])

  useEffect(() => {
    api.get('/admin/analytics').then((r) => setData(r.data)).catch(() => {})
    api.get('/complaints').then((r) => setComplaints(r.data.complaints)).catch(() => setComplaints([]))
  }, [])

  const derived = useMemo(() => {
    if (!data) return null
    const categories = [...data.byCategory].sort((a, b) => b.count - a.count)
    const top = categories[0]
    return {
      total: lastSixMonths(data.byMonth, 'count'),
      open: lastSixMonths(data.byMonth, 'open'),
      resolved: lastSixMonths(data.byMonth, 'resolved'),
      high: lastSixMonths(data.byMonth, 'high'),
      top,
      topShare: top && data.totalComplaints ? Math.round((top.count / data.totalComplaints) * 100) : 0,
      rate: data.totalComplaints ? Math.round((data.resolvedComplaints / data.totalComplaints) * 100) : 0,
      categories: categories.map((c) => ({ label: c._id, value: c.count })),
      agents: [...data.agentPerformance]
        .sort((a, b) => b.resolved - a.resolved)
        .map((a) => ({ label: a.agentName, value: a.resolved, max: a.total, caption: `${a.resolved}/${a.total} resolved` }))
    }
  }, [data])

  const overdue = (complaints || []).filter(isOverdue).length

  const recent = (complaints || [])
    .filter((c) => matches(query, c.title, c.category, c.status, c.priority, c.description, c.userId?.name, c.agentId?.name))
    .slice(0, 8)

  const actions = (
    <>
      <Link to="/admin/complaints" className="btn btn-outline"><SlidersHorizontal />All complaints</Link>
      <button className="btn btn-dark" onClick={() => downloadComplaintsCsv(complaints || [])} disabled={!complaints?.length}>
        <Download />Export
      </button>
    </>
  )

  return (
    <AppShell title="Overview" search={query} onSearch={setQuery} searchPlaceholder="Search recent complaints…">
      <PageHeader title="Overview" subtitle="How complaints are flowing across the team" actions={actions} />

      {!data || !derived ? (
        <div className="grid grid-summary">
          <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
        </div>
      ) : (
        <>
          <div className="grid grid-summary">
            <Section
              title={ai.enabled ? 'AI insights' : 'Insights'}
              icon={<span className="spark-icon"><Sparkles /></span>}
              actions={ai.enabled && (
                <button className="btn btn-ai btn-sm" onClick={() => loadInsight(true)} disabled={insightState === 'loading'} title="Generate fresh insights">
                  {insightState === 'loading' ? <Loader2 className="spin" /> : <RefreshCw />}{insightState === 'loading' ? 'Thinking…' : 'Refresh'}
                </button>
              )}
              subtitle={insight?.insight ? insight.insight : data.totalComplaints === 0 ? 'No complaints have been submitted yet. Metrics fill in as soon as the first one arrives.' : (
                <>
                  <strong>{derived.top._id}</strong> is the most common category at <strong>{derived.topShare}%</strong> of all complaints.{' '}
                  {data.unassigned > 0
                    ? <><strong>{data.unassigned} waiting</strong> for an agent{data.highOpen > 0 && <>, and {data.highOpen} open complaint{data.highOpen === 1 ? ' is' : 's are'} high priority</>}.</>
                    : <>Every open complaint has an agent.</>}
                  {overdue > 0 && <> <strong>{overdue} overdue</strong> against their response targets.</>}
                </>
              )}
              bodyClassName="section-pad"
            >
              <div style={{ fontWeight: 500, marginBottom: 12 }}>Team snapshot</div>
              <div className="stat-grid">
                <div className="stat-box">
                  <div className="stat-box-value">{derived.rate}%</div>
                  <div className="stat-box-label">Resolution rate</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-value">{data.ratingCount ? `${data.avgRating.toFixed(1)}/5` : '—'}</div>
                  <div className="stat-box-label">Customer rating</div>
                </div>
              </div>
              <div className="meta-line" style={{ marginTop: 18 }}>
                <span>Last updated:<b>{formatDate(new Date())}</b></span>
                <span>Active agents:<b>{data.activeAgents}</b></span>
                <span>Overdue:<b>{overdue}</b></span>
              </div>
              {insightState === 'error' && <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>AI insights unavailable: {insightError}</p>}
              {ai.loaded && !ai.enabled && (
                <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                  Add an <span className="mono">NVIDIA_API_KEY</span> to turn on AI insights — see <Link to="/settings" style={{ textDecoration: 'underline' }}>Settings</Link>.
                </p>
              )}
            </Section>

            <div className="metrics">
              <Metric title="Total complaints" value={data.totalComplaints} delta={monthDelta(derived.total)} bars={derived.total} />
              <Metric title="Open" value={data.openComplaints} caption="by month submitted" bars={derived.open} />
              <Metric title="Resolved" value={data.resolvedComplaints} caption="by month submitted" bars={derived.resolved} />
              <Metric title="High priority" value={data.highOpen} caption="open right now" bars={derived.high} />
            </div>
          </div>

          <div className="grid grid-2">
            <Section title="By category" subtitle="Where complaints are coming from" bodyClassName="section-pad">
              <HBarList items={derived.categories} empty="No complaints yet." />
            </Section>
            <Section title="Agent performance" subtitle="Resolved out of assigned, per agent" bodyClassName="section-pad">
              <HBarList items={derived.agents} empty="No complaints have been assigned yet." />
            </Section>
          </div>
        </>
      )}

      <Section
        title="Recent complaints"
        subtitle="Latest submissions from all users"
        actions={<Link to="/admin/complaints" className="btn btn-outline btn-sm">View all<ArrowRight /></Link>}
      >
        {!complaints ? <SkeletonRows /> : recent.length === 0 ? (
          <Empty icon={Inbox} title={complaints.length ? 'No matches' : 'No complaints yet'} text={complaints.length ? 'Try a different search.' : 'They’ll appear here as soon as users submit them.'} />
        ) : (
          <ComplaintTable complaints={recent} columns={['title', 'priority', 'status', 'category', 'agent', 'updated', 'note']} />
        )}
      </Section>
    </AppShell>
  )
}
