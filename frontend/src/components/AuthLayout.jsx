import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from './Logo'
import StatusBadge, { PriorityPill } from './StatusBadge'

// A static illustration of the product: one complaint moving through its lifecycle
function FlowCard() {
  const steps = [
    ['Pending', '09:12'],
    ['Assigned', '09:14'],
    ['In Progress', '09:20'],
    ['Resolved', '10:02']
  ]
  return (
    <div style={{ position: 'relative', background: '#1b1b1b', border: '1px solid #2c2c2c', borderRadius: 18, padding: 20, maxWidth: 440, boxShadow: '0 30px 60px rgba(0,0,0,.45)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 12, color: '#7d7d7d' }}>#A41F2C</div>
          <div style={{ color: '#fff', fontWeight: 500, marginTop: 2 }}>Wi-Fi drops every evening in block C</div>
        </div>
        <PriorityPill priority="High" />
      </div>
      <div style={{ borderTop: '1px dashed #333', margin: '16px 0' }} />
      <div style={{ display: 'grid', gap: 10 }}>
        {steps.map(([s, t], i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: i === steps.length - 1 ? 1 : 0.72 }}>
            <StatusBadge status={s} />
            <span className="mono" style={{ fontSize: 12, color: '#8a8a8a' }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <main className="auth-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/"><Logo /></Link>
          <Link to="/" className="btn btn-ghost btn-sm"><ArrowLeft />Back to site</Link>
        </div>
        <div className="auth-form">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-sub">{subtitle}</p>
          {children}
          <p className="auth-foot">{footer}</p>
        </div>
      </main>
      <aside className="auth-side" aria-hidden="true">
        <div className="dot-grid" />
        <div className="glow" style={{ top: -180, right: -160 }} />
        <FlowCard />
        <div style={{ position: 'relative' }}>
          <h2>Every complaint, tracked from <span className="serif-accent">first report</span> to final fix.</h2>
          <p style={{ marginTop: 12 }}>Users report issues, agents claim and resolve them over live chat, and admins see the whole picture.</p>
        </div>
      </aside>
    </div>
  )
}
