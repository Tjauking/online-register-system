import { useEffect, useState } from 'react'
import { KeyRound, Loader2, Save, Sparkles } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { Alert, PageHeader, Section } from '../components/ui'
import { formatDate } from '../lib/format'
import { useAiStatus } from '../lib/ai'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const ai = useAiStatus()
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [profileMsg, setProfileMsg] = useState(null)
  const [pwMsg, setPwMsg] = useState(null)
  const [saving, setSaving] = useState('')

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setMe(data.user)
      setProfile({ name: data.user.name, phone: data.user.phone })
    }).catch(() => {})
  }, [])

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving('profile')
    setProfileMsg(null)
    try {
      const { data } = await api.put('/auth/me', profile)
      setMe(data.user)
      updateUser({ name: data.user.name })
      setProfileMsg({ type: 'success', text: 'Profile saved' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Could not save profile' })
    } finally {
      setSaving('')
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (pw.newPassword !== pw.confirm) return setPwMsg({ type: 'error', text: 'New passwords don’t match' })
    setSaving('password')
    try {
      await api.put('/auth/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      setPwMsg({ type: 'success', text: 'Password updated' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Could not update password' })
    } finally {
      setSaving('')
    }
  }

  const dirty = me && (profile.name !== me.name || profile.phone !== me.phone)

  return (
    <AppShell title="Settings" parent="General">
      <PageHeader title="Settings" subtitle="Your profile, password and workspace details" />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Section title="Profile" subtitle="How you appear to agents and in notifications" bodyClassName="section-pad">
          <form onSubmit={saveProfile}>
            {profileMsg && <div style={{ marginBottom: 16 }}><Alert type={profileMsg.type}>{profileMsg.text}</Alert></div>}
            <div className="field">
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" className="input" value={profile.name} maxLength={80} required autoComplete="name"
                onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div className="field">
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" className="input" value={profile.phone} maxLength={30} required autoComplete="tel"
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <div className="field">
              <span className="label">Email <span className="hint">Can’t be changed</span></span>
              <div className="input mono" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', color: 'var(--text-2)' }}>{user?.email}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12, flexWrap: 'wrap' }}>
              <span className="muted mono" style={{ fontSize: 12 }}>{user?.role} · joined {me ? formatDate(me.createdAt) : '—'}</span>
              <button className="btn btn-dark" disabled={!dirty || saving === 'profile'}>
                {saving === 'profile' ? <Loader2 className="spin" /> : <Save />}Save changes
              </button>
            </div>
          </form>
        </Section>

        <div className="grid" style={{ gap: 20 }}>
          <Section title="Password" subtitle="Use at least 8 characters" bodyClassName="section-pad">
            <form onSubmit={changePassword}>
              {pwMsg && <div style={{ marginBottom: 16 }}><Alert type={pwMsg.type}>{pwMsg.text}</Alert></div>}
              <div className="field">
                <label className="label" htmlFor="current">Current password</label>
                <input id="current" type="password" className="input" value={pw.currentPassword} required autoComplete="current-password"
                  onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
              </div>
              <div className="field-row" style={{ marginTop: 16 }}>
                <div className="field">
                  <label className="label" htmlFor="new">New password</label>
                  <input id="new" type="password" className="input" value={pw.newPassword} required minLength={8} autoComplete="new-password"
                    onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="confirm">Confirm</label>
                  <input id="confirm" type="password" className="input" value={pw.confirm} required minLength={8} autoComplete="new-password"
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn btn-outline" disabled={saving === 'password'}>
                  {saving === 'password' ? <Loader2 className="spin" /> : <KeyRound />}Update password
                </button>
              </div>
            </form>
          </Section>

          <Section title="AI assistant" icon={<span className="spark-icon"><Sparkles /></span>} bodyClassName="section-pad">
            {!ai.loaded ? <p className="muted">Checking…</p> : ai.enabled ? (
              <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                On, using <span className="mono" style={{ color: 'var(--text)' }}>{ai.model}</span> via NVIDIA. It suggests categories when you file a complaint, summarises conversations{user?.role !== 'USER' && ', drafts replies'}{user?.role === 'ADMIN' && ' and writes dashboard insights'}. Suggestions are never applied without you.
              </p>
            ) : (
              <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                Off. {user?.role === 'ADMIN'
                  ? <>To turn it on, get a free API key at <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>build.nvidia.com</a>, add it to <span className="mono">backend/.env</span> as <span className="mono">NVIDIA_API_KEY</span>, and restart the server.</>
                  : 'Your administrator can enable it.'}
              </p>
            )}
          </Section>
        </div>
      </div>
    </AppShell>
  )
}
