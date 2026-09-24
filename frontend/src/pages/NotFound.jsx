import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import { homeFor } from './Login'

export default function NotFound() {
  const { user } = useAuth()
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div className="lp-hero-bg" style={{ inset: 0 }} />
      <div style={{ textAlign: 'center', position: 'relative', maxWidth: 420 }}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: 32 }}><Logo /></Link>
        <div className="empty-icon" style={{ width: 56, height: 56 }}><Compass /></div>
        <div className="mono muted" style={{ fontSize: 13 }}>404</div>
        <h1 className="page-title" style={{ marginTop: 6 }}>This page doesn’t exist</h1>
        <p className="page-sub">The link may be broken, or the page may have moved.</p>
        <Link to={user ? homeFor(user.role) : '/'} className="btn btn-dark" style={{ marginTop: 24 }}>
          <ArrowLeft />{user ? 'Back to dashboard' : 'Back to home'}
        </Link>
      </div>
    </main>
  )
}
