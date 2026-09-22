const colors = {
  Pending:     { bg: '#fff3cd', color: '#856404' },
  Assigned:    { bg: '#cce5ff', color: '#004085' },
  'In Progress': { bg: '#e2d9f3', color: '#4a1f8b' },
  Resolved:    { bg: '#d4edda', color: '#155724' },
  Closed:      { bg: '#e2e3e5', color: '#383d41' }
}

export default function StatusBadge({ status }) {
  const style = colors[status] || { bg: '#eee', color: '#333' }
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      display: 'inline-block',
      whiteSpace: 'nowrap'
    }}>
      {status}
    </span>
  )
}
