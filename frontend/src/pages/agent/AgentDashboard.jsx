import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Hand, Inbox, ListChecks, Loader2 } from 'lucide-react'
import api from '../../api/axios'
import AppShell from '../../components/AppShell'
import ComplaintTable from '../../components/ComplaintTable'
import { Alert, Empty, Metric, PageHeader, Section, SkeletonRows } from '../../components/ui'
import { isOpen, matches, monthlyCounts } from '../../lib/format'

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 }

export default function AgentDashboard() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const view = params.get('view') === 'mine' ? 'mine' : 'pool'
  const [assigned, setAssigned] = useState([])
  const [pool, setPool] = useState([])
  const [loading, setLoading] = useState(true)
  const [taking, setTaking] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const loadAll = async () => {
    const [a, p] = await Promise.all([
      api.get('/complaints/assigned').catch(() => ({ data: { complaints: [] } })),
      api.get('/complaints/unassigned').catch(() => ({ data: { complaints: [] } }))
    ])
    setAssigned(a.data.complaints)
    setPool(p.data.complaints)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const take = async (id) => {
    setError('')
    setTaking(id)
    try {
      await api.put(`/complaints/${id}/take`)
      navigate(`/complaint/${id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to take complaint')
      setTaking(null)
      loadAll()
    }
  }

  const stats = useMemo(() => {
    const mineOpen = assigned.filter(isOpen)
    const mineDone = assigned.filter((c) => !isOpen(c))
    return {
      mineOpen, mineDone,
      poolBars: monthlyCounts(pool),
      openBars: monthlyCounts(assigned, isOpen),
      doneBars: monthlyCounts(assigned, (c) => !isOpen(c)),
      highBars: monthlyCounts(pool, (c) => c.priority === 'High'),
      highWaiting: pool.filter((c) => c.priority === 'High').length
    }
  }, [assigned, pool])

  // Queue is triaged: high priority first, then oldest first
  const poolRows = [...pool]
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || new Date(a.createdAt) - new Date(b.createdAt))
    .filter((c) => matches(query, c.title, c.category, c.priority, c.description, c.userId?.name))
  const mineRows = assigned.filter((c) => matches(query, c.title, c.category, c.status, c.priority, c.description, c.userId?.name))
  const rows = view === 'pool' ? poolRows : mineRows

  const title = view === 'pool' ? 'Queue' : 'My complaints'

  return (
    <AppShell title={title} search={query} onSearch={setQuery} searchPlaceholder={view === 'pool' ? 'Search the queue…' : 'Search your complaints…'}
      counts={{ pool: pool.length, mine: stats.mineOpen.length }}>
      <PageHeader
        title={title}
        subtitle={view === 'pool' ? 'Unassigned complaints, highest priority and oldest first' : 'Complaints you’ve taken on'}
      />

      <div className="metrics metrics-4">
        <Metric title="In queue" value={pool.length} caption="by month submitted" bars={stats.poolBars} />
        <Metric title="High priority" value={stats.highWaiting} caption="waiting in queue" bars={stats.highBars} />
        <Metric title="Working on" value={stats.mineOpen.length} caption="by month submitted" bars={stats.openBars} />
        <Metric title="Resolved" value={stats.mineDone.length} caption="by month submitted" bars={stats.doneBars} />
      </div>

      {error && <div style={{ marginTop: 20 }}><Alert>{error}</Alert></div>}

      <Section
        title={view === 'pool' ? 'Unassigned complaints' : 'Assigned to you'}
        subtitle={view === 'pool' ? 'Take one to claim it — it moves to your list and the customer sees it’s assigned' : 'Open one to chat with the customer and update its status'}
        actions={
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={view === 'pool'} className={`tab ${view === 'pool' ? 'is-active' : ''}`} onClick={() => navigate('/agent')}>
              <Inbox size={15} />Queue<span className="mono">{pool.length}</span>
            </button>
            <button role="tab" aria-selected={view === 'mine'} className={`tab ${view === 'mine' ? 'is-active' : ''}`} onClick={() => navigate('/agent?view=mine')}>
              <ListChecks size={15} />Mine<span className="mono">{assigned.length}</span>
            </button>
          </div>
        }
      >
        {loading ? <SkeletonRows /> : rows.length === 0 ? (
          view === 'pool'
            ? <Empty icon={Inbox} title={pool.length ? 'No matches' : 'Queue is clear'} text={pool.length ? 'Try a different search.' : 'New complaints will show up here as soon as they’re submitted.'} />
            : <Empty icon={ListChecks} title={assigned.length ? 'No matches' : 'Nothing assigned yet'} text={assigned.length ? 'Try a different search.' : 'Take a complaint from the queue to get started.'}
                action={!assigned.length && <button className="btn btn-dark" onClick={() => navigate('/agent')}><Inbox />Open queue</button>} />
        ) : view === 'pool' ? (
          <ComplaintTable
            complaints={rows}
            columns={['title', 'user', 'priority', 'category', 'submitted', 'note']}
            action={(c) => (
              <button className="btn btn-sm btn-accent" onClick={() => take(c._id)} disabled={taking !== null}>
                {taking === c._id ? <Loader2 className="spin" /> : <Hand />}Take
              </button>
            )}
          />
        ) : (
          <ComplaintTable complaints={rows} columns={['title', 'user', 'priority', 'status', 'category', 'updated', 'note']} />
        )}
      </Section>
    </AppShell>
  )
}
