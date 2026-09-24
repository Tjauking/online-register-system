import { useNavigate } from 'react-router-dom'
import StatusBadge, { PriorityPill } from './StatusBadge'
import { AlarmClock } from 'lucide-react'
import { SLA_HOURS, isOverdue, timeAgo } from '../lib/format'

const COLUMNS = {
  title: {
    label: 'Complaint',
    render: (c) => (
      <div className="cell-title">
        {c.title}
        {isOverdue(c) && (
          <span className="pill pill-overdue" style={{ height: 20, fontSize: 11.5, marginLeft: 8, verticalAlign: 1 }} title={`Open longer than the ${SLA_HOURS[c.priority]}h target for ${c.priority} priority`}>
            <AlarmClock size={11} />Overdue
          </span>
        )}
      </div>
    )
  },
  user: { label: 'Submitted by', render: (c) => c.userId?.name || <span className="muted">Deleted user</span> },
  priority: { label: 'Priority', render: (c) => <PriorityPill priority={c.priority} /> },
  status: { label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  category: { label: 'Category', render: (c) => <span className="tag">{c.category.replace(' Issue', '')}</span> },
  agent: { label: 'Agent', render: (c) => c.agentId?.name || <span className="muted">Unassigned</span> },
  updated: { label: 'Updated', render: (c) => <span className="cell-mono">{timeAgo(c.updatedAt || c.createdAt)}</span> },
  submitted: { label: 'Submitted', render: (c) => <span className="cell-mono">{timeAgo(c.createdAt)}</span> },
  note: { label: 'Notes', render: (c) => <div className="cell-note" title={c.description}>{c.description}</div> }
}

export default function ComplaintTable({ complaints, columns, action }) {
  const navigate = useNavigate()
  const open = (id) => navigate(`/complaint/${id}`)

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((key) => <th key={key}>{COLUMNS[key].label}</th>)}
            {action && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr
              key={c._id}
              className={action ? '' : 'is-link'}
              onClick={action ? undefined : () => open(c._id)}
              onKeyDown={action ? undefined : (e) => e.key === 'Enter' && open(c._id)}
              tabIndex={action ? undefined : 0}
            >
              {columns.map((key) => <td key={key}>{COLUMNS[key].render(c)}</td>)}
              {action && <td><div className="cell-actions">{action(c)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
