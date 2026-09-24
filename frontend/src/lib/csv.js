import { formatDate } from './format'

const escape = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadComplaintsCsv(complaints) {
  const header = ['ID', 'Title', 'Category', 'Priority', 'Status', 'Submitted by', 'Agent', 'Created', 'Updated', 'Description']
  const rows = complaints.map((c) => [
    c._id, c.title, c.category, c.priority, c.status,
    c.userId?.name, c.agentId?.name, formatDate(c.createdAt), formatDate(c.updatedAt), c.description
  ])
  const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
