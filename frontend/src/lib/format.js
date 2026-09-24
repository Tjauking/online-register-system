const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const OPEN_STATUSES = ['Pending', 'Assigned', 'In Progress']
export const DONE_STATUSES = ['Resolved', 'Closed']
export const isOpen = (c) => OPEN_STATUSES.includes(c.status)

export const formatDate = (d) => {
  const date = new Date(d)
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

export const formatDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const timeAgo = (d) => {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.round(h / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(d)
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

// Counts per calendar month for the last `n` months (oldest first), for mini bar charts
export const monthlyCounts = (items, predicate = () => true, n = 6) => {
  const now = new Date()
  const buckets = Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], value: 0 }
  })
  const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]))
  items.forEach((item) => {
    if (!predicate(item)) return
    const d = new Date(item.createdAt)
    const i = index[`${d.getFullYear()}-${d.getMonth()}`]
    if (i !== undefined) buckets[i].value += 1
  })
  return buckets
}

// Month-over-month change of the last bucket, as a signed whole percentage (null when not meaningful)
export const monthDelta = (buckets) => {
  const cur = buckets.at(-1)?.value ?? 0
  const prev = buckets.at(-2)?.value ?? 0
  if (!prev) return cur ? null : 0
  return Math.round(((cur - prev) / prev) * 100)
}

export const monthLabel = (year, month) => `${MONTHS[month - 1]} ${String(year).slice(2)}`

export const matches = (query, ...fields) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.some((f) => String(f ?? '').toLowerCase().includes(q))
}

// Time from submission to first Resolved/Closed status, in ms (null if never resolved)
export const resolutionTime = (c) => {
  const done = c.statusHistory?.find((h) => DONE_STATUSES.includes(h.status))
  return done ? new Date(done.changedAt) - new Date(c.createdAt) : null
}

export const formatDuration = (ms) => {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—'
  const mins = Math.max(1, Math.round(ms / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

export const average = (nums) => {
  const list = nums.filter((n) => n !== null && n !== undefined)
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null
}

// Target time to resolve, by priority; open complaints past it are overdue
export const SLA_HOURS = { High: 24, Medium: 72, Low: 168 }

export const isOverdue = (c) =>
  isOpen(c) && Date.now() - new Date(c.createdAt).getTime() > (SLA_HOURS[c.priority] ?? 72) * 3600 * 1000
