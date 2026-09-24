const STATUS_CLASS = {
  Pending: 'pill-pending',
  Assigned: 'pill-assigned',
  'In Progress': 'pill-progress',
  Resolved: 'pill-resolved',
  Closed: 'pill-closed'
}

export default function StatusBadge({ status }) {
  return <span className={`pill pill-dot ${STATUS_CLASS[status] || 'pill-closed'}`}>{status}</span>
}

export function PriorityPill({ priority }) {
  return <span className={`pill pill-${String(priority).toLowerCase()}`}>{priority}</span>
}

export function ActivePill({ active }) {
  return <span className={`pill pill-dot ${active ? 'pill-active' : 'pill-disabled'}`}>{active ? 'Active' : 'Disabled'}</span>
}
