import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const styles = {
  nav: {
    background: 'linear-gradient(135deg, #c00000 0%, #8b0000 100%)',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
    boxShadow: '0 2px 12px rgba(192,0,0,0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  brand: {
    color: '#fff',
    fontWeight: 700,
    fontSize: '18px',
    letterSpacing: '0.3px'
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  link: {
    color: 'rgba(255,255,255,0.9)',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background 0.2s'
  },
  userBadge: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    marginRight: '8px'
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)',
    padding: '7px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer'
  }
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>⚡ Complaint Management</Link>
      <div style={styles.links}>
        {user ? (
          <>
            <span style={styles.userBadge}>{user.name} · {user.role}</span>
            {user.role === 'USER' && (
              <>
                <Link to="/dashboard" style={styles.link}>Dashboard</Link>
                <Link to="/create-complaint" style={styles.link}>New Complaint</Link>
              </>
            )}
            {user.role === 'AGENT' && (
              <Link to="/agent" style={styles.link}>Dashboard</Link>
            )}
            {user.role === 'ADMIN' && (
              <>
                <Link to="/admin" style={styles.link}>Dashboard</Link>
                <Link to="/admin/users" style={styles.link}>Users</Link>
                <Link to="/admin/agents" style={styles.link}>Agents</Link>
                <Link to="/admin/complaints" style={styles.link}>Complaints</Link>
              </>
            )}
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={{ ...styles.link, background: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}
