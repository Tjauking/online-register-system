import { useEffect, useState } from 'react'
import api from '../../api/axios'
import PeoplePage from '../../components/PeoplePage'

const workload = {
  label: 'Resolved',
  render: (agent, perf) => {
    const stats = perf?.find((p) => p._id === agent._id)
    if (!stats) return <span className="cell-mono">0/0</span>
    const pct = Math.round((stats.resolved / stats.total) * 100)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
        <div className="hbar-track" style={{ flex: 1 }}><div className="hbar-fill" style={{ width: `${pct}%` }} /></div>
        <span className="cell-mono">{stats.resolved}/{stats.total}</span>
      </div>
    )
  }
}

export default function AdminAgents() {
  const [perf, setPerf] = useState(null)

  useEffect(() => {
    api.get('/admin/analytics').then((r) => setPerf(r.data.agentPerformance)).catch(() => setPerf([]))
  }, [])

  return (
    <PeoplePage
      title="Agents"
      subtitle="Agents join with the agent signup code and take complaints from the queue"
      endpoint="/admin/agents"
      listKey="agents"
      noun="agent"
      deleteNote="Their open complaints go back to the queue"
      extraColumns={[workload]}
      extraData={perf}
    />
  )
}
