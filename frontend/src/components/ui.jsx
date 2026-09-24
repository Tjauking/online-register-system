import { AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2, Minus } from 'lucide-react'

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

// Grey shell with a header and a white inner card
export function Section({ title, subtitle, icon, actions, children, bodyClassName = '' }) {
  return (
    <section className="section">
      {(title || actions) && (
        <div className="section-head">
          <div>
            {title && <h2 className="section-title">{icon}{title}</h2>}
            {subtitle && <p className="section-sub">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={`section-body ${bodyClassName}`}>{children}</div>
    </section>
  )
}

export function MiniBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bars" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(', ')}>
      {data.map((d, i) => (
        <div
          key={i}
          className={`bar ${d.value === 0 ? 'is-muted' : ''}`}
          style={{ height: `${Math.max(11, (d.value / max) * 100)}%` }}
          title={`${d.label}: ${d.value}`}
        />
      ))}
    </div>
  )
}

// A metric tile: title, big number, month-over-month change and a six-month bar chart.
// `goodWhenUp` decides whether a rise is shown green (e.g. resolved) or red (e.g. new complaints).
export function Metric({ title, value, delta, caption = 'last 6 months', bars, goodWhenUp = false }) {
  const showDelta = delta !== null && delta !== undefined
  const positive = delta > 0
  const good = delta === 0 ? null : goodWhenUp ? positive : !positive
  return (
    <div className="metric">
      <div style={{ minWidth: 0 }}>
        <div className="metric-title">{title}</div>
        <div className="metric-value">
          <span className="mono">{value}</span>
          {showDelta && (
            <span className={`delta ${good === null ? 'muted' : good ? 'delta-pos' : 'delta-neg'}`} title="This month vs last month">
              {positive ? '+' : ''}{delta}%
            </span>
          )}
        </div>
        <div className="metric-caption">{caption}</div>
      </div>
      {bars && <MiniBars data={bars} />}
    </div>
  )
}

export function Trend({ value }) {
  if (!value) return <span className="trend trend-flat"><Minus />0%</span>
  const up = value > 0
  return (
    <span className={`trend ${up ? 'trend-up' : 'trend-down'}`}>
      {up ? <ArrowUpRight /> : <ArrowDownRight />}{Math.abs(value)}%
    </span>
  )
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon /></div>
      <div className="empty-title">{title}</div>
      {text && <p className="empty-text">{text}</p>}
      {action}
    </div>
  )
}

export function Alert({ type = 'error', children }) {
  const Icon = type === 'error' ? AlertCircle : CheckCircle2
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon />
      <span>{children}</span>
    </div>
  )
}

export function SkeletonRows({ rows = 4, cols = 5 }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24, padding: '16px' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton" style={{ height: 14, width: `${60 + ((r + c) % 3) * 15}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
