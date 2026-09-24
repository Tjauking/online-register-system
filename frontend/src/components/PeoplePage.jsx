import { useEffect, useState } from 'react'
import { Ban, CheckCircle2, Trash2, Users } from 'lucide-react'
import api from '../api/axios'
import AppShell from './AppShell'
import { ActivePill } from './StatusBadge'
import { Alert, Empty, PageHeader, Section, SkeletonRows } from './ui'
import { formatDate, initials, matches } from '../lib/format'

// Shared admin list for users and agents: search, enable/disable, delete with a two-step confirm
export default function PeoplePage({ title, subtitle, endpoint, listKey, noun, deleteNote, extraColumns = [], extraData }) {
  const [people, setPeople] = useState(null)
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const load = () => api.get(endpoint).then((r) => setPeople(r.data[listKey])).catch(() => setPeople([]))
  useEffect(() => { load() }, [endpoint])

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(null), 4000)
    return () => clearTimeout(t)
  }, [confirming])

  const act = async (id, fn) => {
    setError('')
    setBusy(id)
    try {
      await fn()
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  const toggle = (p) => act(p._id, () => api.put(`/admin/users/${p._id}/toggle-active`))
  const remove = (p) => {
    if (confirming !== p._id) return setConfirming(p._id)
    act(p._id, () => api.delete(`/admin/users/${p._id}`))
  }

  const all = people || []
  const rows = all.filter((p) => matches(query, p.name, p.email, p.phone))
  const active = all.filter((p) => p.isActive).length

  return (
    <AppShell title={title} search={query} onSearch={setQuery} searchPlaceholder={`Search ${noun}s by name or email…`}>
      <PageHeader title={title} subtitle={subtitle} />
      {error && <Alert>{error}</Alert>}

      <Section title={`All ${noun}s`} subtitle={`${active} active · ${all.length - active} disabled`}>
        {!people ? <SkeletonRows /> : rows.length === 0 ? (
          <Empty icon={Users} title={all.length ? 'No matches' : `No ${noun}s yet`} text={all.length ? 'Try a different search.' : undefined} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  {extraColumns.map((c) => <th key={c.label}>{c.label}</th>)}
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="avatar avatar-sm">{initials(p.name)}</span>
                        <div>
                          <div className="cell-title">{p.name}</div>
                          <div className="cell-sub">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="cell-mono">{p.phone}</td>
                    <td><ActivePill active={p.isActive} /></td>
                    {extraColumns.map((c) => <td key={c.label}>{c.render(p, extraData)}</td>)}
                    <td className="cell-mono">{formatDate(p.createdAt)}</td>
                    <td>
                      <div className="cell-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => toggle(p)} disabled={busy === p._id}>
                          {p.isActive ? <Ban /> : <CheckCircle2 />}{p.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(p)} disabled={busy === p._id}
                          title={confirming === p._id ? deleteNote : undefined}>
                          <Trash2 />{confirming === p._id ? 'Confirm' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </AppShell>
  )
}
