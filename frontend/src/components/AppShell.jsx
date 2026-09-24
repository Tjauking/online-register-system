import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronsUpDown, Globe, Inbox, LayoutGrid, ListChecks, LogOut, Menu, PanelLeft,
  Search, Settings, ShieldCheck, SquarePen, UserRound, Users
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/format'
import Logo from './Logo'
import NotificationBell from './NotificationBell'

const NAV = {
  USER: [
    { to: '/dashboard', label: 'Overview', icon: LayoutGrid },
    { to: '/create-complaint', label: 'New complaint', icon: SquarePen }
  ],
  AGENT: [
    { to: '/agent', label: 'Queue', icon: Inbox, view: 'pool' },
    { to: '/agent?view=mine', label: 'My complaints', icon: ListChecks, view: 'mine' }
  ],
  ADMIN: [
    { to: '/admin', label: 'Overview', icon: LayoutGrid },
    { to: '/admin/complaints', label: 'Complaints', icon: Inbox },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/agents', label: 'Agents', icon: ShieldCheck }
  ]
}

const readCollapsed = () => {
  try { return localStorage.getItem('sb_collapsed') === '1' } catch { return false }
}

function isActive(item, location) {
  const path = item.to.split('?')[0]
  if (location.pathname !== path) return false
  if (!item.view) return true
  const view = new URLSearchParams(location.search).get('view') || 'pool'
  return view === item.view
}

export default function AppShell({ title, parent = 'Main menu', search, onSearch, searchPlaceholder = 'Quick search…', counts = {}, children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const searchRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => { setOpen(false); setMenuOpen(false) }, [location])

  // "/" focuses search, like most dev tools
  useEffect(() => {
    if (!onSearch) return
    const onKey = (e) => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        onSearch('')
        searchRef.current.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSearch])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem('sb_collapsed', c ? '0' : '1') } catch { /* storage unavailable */ }
      return !c
    })
  }

  // Leave the protected page first, so its route guard doesn't bounce us to /login
  const handleLogout = () => {
    navigate('/')
    logout()
  }

  const items = NAV[user?.role] || []

  return (
    <div className={`shell ${collapsed ? 'is-collapsed' : ''} ${open ? 'is-open' : ''}`}>
      <aside className="sidebar" aria-label="Sidebar">
        <div className="sb-head">
          <Link to="/redirect" aria-label="Home"><Logo /></Link>
          <button className="sb-collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand' : 'Collapse'}>
            <PanelLeft />
          </button>
        </div>
        <div className="sb-divider" />

        <div className="sb-label">Main menu</div>
        <nav className="sb-nav">
          {items.map((item) => {
            const Icon = item.icon
            const count = counts[item.view || item.to]
            return (
              <Link key={item.to} to={item.to} className={`sb-item ${isActive(item, location) ? 'is-active' : ''}`} title={collapsed ? item.label : undefined}>
                <Icon />
                <span className="sb-hide">{item.label}</span>
                {count > 0 && <span className="sb-count sb-hide">{count}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="sb-spacer" />

        <div className="sb-label">General</div>
        <nav className="sb-nav" style={{ marginBottom: 14 }}>
          <Link to="/settings" className={`sb-item ${location.pathname === '/settings' ? 'is-active' : ''}`} title={collapsed ? 'Settings' : undefined}>
            <Settings />
            <span className="sb-hide">Settings</span>
          </Link>
          <Link to="/" className="sb-item" title={collapsed ? 'Website' : undefined}>
            <Globe />
            <span className="sb-hide">Website</span>
          </Link>
        </nav>
        <div className="sb-divider" />

        <div style={{ position: 'relative' }} ref={menuRef}>
          {menuOpen && (
            <div className="sb-menu">
              <div className="sb-role">SIGNED IN AS {user?.role}</div>
              <button className="sb-item" style={{ width: '100%' }} onClick={handleLogout}>
                <LogOut />
                <span>Sign out</span>
              </button>
            </div>
          )}
          <button className="sb-user" onClick={() => setMenuOpen((m) => !m)} aria-expanded={menuOpen} aria-label="Account menu">
            <span className="avatar">{user ? initials(user.name) : <UserRound />}</span>
            <span className="sb-user-meta sb-hide">
              <span className="sb-user-name" style={{ display: 'block' }}>{user?.name}</span>
              <span className="sb-user-mail" style={{ display: 'block' }}>{user?.email}</span>
            </span>
            <ChevronsUpDown className="sb-hide" />
          </button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />

      <main className="panel">
        <header className="topbar">
          <button className="icon-btn topbar-menu" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <div className="crumbs">
            <LayoutGrid />
            <span className="crumbs-parent">{parent}</span>
            <span className="crumbs-sep">/</span>
            <span className="crumbs-current">{title}</span>
          </div>
          <div className="topbar-right">
            {onSearch && (
              <label className="search">
                <Search />
                <span className="sr-only">Search</span>
                <input ref={searchRef} value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} />
                <span className="kbd">/</span>
              </label>
            )}
            <NotificationBell />
          </div>
        </header>
        <div className="page">{children}</div>
      </main>
    </div>
  )
}
