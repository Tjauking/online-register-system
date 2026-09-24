import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Check, CheckCircle2, FilePlus2, Hand, Inbox, LayoutGrid, LifeBuoy,
  ListChecks, MessagesSquare, Plus, ShieldCheck, Star, Timer, UserPlus, Users, Wrench, Zap
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BRAND } from '../lib/brand'
import Logo from '../components/Logo'
import StatusBadge, { PriorityPill } from '../components/StatusBadge'
import { Metric } from '../components/ui'
import { homeFor } from './Login'
import '../landing.css'

// Illustrative numbers for the product preview; the real app computes these from live data
const bars = (...v) => v.map((value, i) => ({ label: String(i), value }))
const SAMPLE_ROWS = [
  { title: 'Wi-Fi drops every evening', priority: 'High', status: 'In Progress', category: 'Network', agent: 'Dana K.', when: '12m ago' },
  { title: 'No hot water in block C', priority: 'High', status: 'Assigned', category: 'Water', agent: 'Sam O.', when: '38m ago' },
  { title: 'Charged twice for laundry card', priority: 'Medium', status: 'Pending', category: 'Service', agent: '—', when: '1h ago' },
  { title: 'Portal login loops back', priority: 'Low', status: 'Resolved', category: 'Technical', agent: 'Dana K.', when: '3h ago' }
]

const STEPS = [
  { icon: FilePlus2, title: 'Submitted', text: 'A user files a complaint with category, priority and an optional screenshot.', status: 'Pending' },
  { icon: Hand, title: 'Claimed', text: 'An agent takes it from the queue — high priority and oldest first.', status: 'Assigned' },
  { icon: Wrench, title: 'Worked on', text: 'User and agent talk it through over live chat on the complaint itself.', status: 'In Progress' },
  { icon: CheckCircle2, title: 'Resolved', text: 'The agent closes it out and every change is on the timeline.', status: 'Resolved', accent: true },
  { icon: Star, title: 'Rated', text: 'The user rates the outcome, feeding the team’s performance view.' }
]

const FAQ = [
  ['How does a complaint get assigned?', 'New complaints land in a shared queue that agents see ordered by priority, then age. An agent claims one with a single click, or an admin can assign it to a specific agent directly.'],
  ['Who can see my complaint and its chat?', 'Only you, the agent assigned to it, and admins. Other users and unassigned agents can’t open it, read its messages or download its attachment.'],
  ['What can I attach?', 'One image (PNG, JPG or GIF) or a PDF up to 5 MB per complaint. Files are served only to people who can see the complaint — they’re never publicly linked.'],
  ['How do I follow progress?', 'Each complaint has an activity timeline that records every status change with a timestamp, plus a live chat with the agent handling it.'],
  ['How do I join as an agent or admin?', 'Choose Agent or Admin when you sign up and enter the signup code your administrator gives you. Everyone else signs up as a user — no code needed.'],
  ['What happens after it’s resolved?', 'You can rate the resolution from one to five stars and leave a comment. Ratings roll up into the admin dashboard alongside resolution rates per agent.']
]

function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal') || []
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      })
    }, { rootMargin: '0px 0px -8% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}

function ProductPreview() {
  return (
    <div className="lp-preview reveal" aria-label="Preview of the admin dashboard">
      <div className="lp-preview-inner">
        <div className="lp-preview-side">
          <div style={{ padding: '2px 8px 14px' }}><Logo /></div>
          <div className="sb-divider" style={{ margin: '0 4px 10px' }} />
          <span className="sb-item is-active"><LayoutGrid />Overview</span>
          <span className="sb-item"><Inbox />Complaints<span className="sb-count">12</span></span>
          <span className="sb-item"><Users />Users</span>
          <span className="sb-item"><ShieldCheck />Agents</span>
        </div>
        <div className="lp-preview-panel">
          <div className="lp-preview-top">
            <span className="crumbs" style={{ fontSize: 13 }}><LayoutGrid /><span className="crumbs-parent">Main menu</span><span className="crumbs-sep">/</span><span className="crumbs-current">Overview</span></span>
            <span className="kbd">/</span>
          </div>
          <div className="lp-preview-body">
            <div className="metrics metrics-4">
              <Metric title="Open" value="12" delta={-8} caption="last 6 months" bars={bars(9, 14, 11, 16, 13, 12)} />
              <Metric title="Resolved" value="148" delta={12} caption="last 6 months" bars={bars(14, 18, 21, 26, 31, 38)} goodWhenUp />
              <Metric title="High priority" value="3" caption="open right now" bars={bars(4, 6, 3, 5, 2, 3)} />
              <Metric title="Rating" value="4.7" caption="out of 5" bars={bars(40, 42, 44, 45, 46, 47)} />
            </div>
            <div className="section" style={{ padding: 4 }}>
              <div className="section-head" style={{ padding: '10px 12px' }}>
                <div className="section-title" style={{ fontSize: 14 }}>Recent complaints</div>
                <span className="btn btn-outline btn-sm" style={{ pointerEvents: 'none' }}>View all<ArrowRight /></span>
              </div>
              <div className="section-body">
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th>Complaint</th><th>Priority</th><th>Status</th><th>Category</th><th>Agent</th><th>Updated</th></tr></thead>
                    <tbody>
                      {SAMPLE_ROWS.map((r) => (
                        <tr key={r.title}>
                          <td className="cell-title">{r.title}</td>
                          <td><PriorityPill priority={r.priority} /></td>
                          <td><StatusBadge status={r.status} /></td>
                          <td><span className="tag">{r.category}</span></td>
                          <td>{r.agent}</td>
                          <td className="cell-mono">{r.when}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="lp-fade" />
    </div>
  )
}

function FeatureCard({ tag, title, text, children }) {
  return (
    <article className="lp-feature reveal">
      <div className="dot-grid" />
      <span className="lp-feature-tag">{tag}</span>
      <div className="lp-feature-art">{children}</div>
      <div style={{ position: 'relative' }}>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  )
}

export default function Home() {
  const { user } = useAuth()
  const rootRef = useReveal()
  const year = new Date().getFullYear()

  const primary = user
    ? <Link to={homeFor(user.role)} className="btn btn-dark btn-lg">Open dashboard<ArrowRight /></Link>
    : <Link to="/register" className="btn btn-dark btn-lg">Get started free<ArrowRight /></Link>

  return (
    <div className="lp" ref={rootRef}>
      <div className="lp-nav-wrap">
        <nav className="lp-nav" aria-label="Main">
          <Link to="/"><Logo /></Link>
          <div className="lp-nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#roles">Roles</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="lp-nav-cta">
            {user ? (
              <Link to={homeFor(user.role)} className="btn btn-dark">Dashboard<ArrowRight /></Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">Sign in</Link>
                <Link to="/register" className="btn btn-dark">Get started</Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* hero */}
      <header className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-glow" />
        <div className="lp-container">
          <span className="lp-eyebrow" style={{ position: 'relative' }}><i />Complaint management, rebuilt</span>
          <h1 className="lp-h1">Resolve complaints<br /><span className="serif-accent">as fast as</span> they come in</h1>
          <p className="lp-lead">
            {BRAND} gives users one place to report problems, agents a prioritised queue with live chat,
            and admins a real-time view of how the whole team is doing.
          </p>
          <div className="lp-hero-cta">
            {primary}
            <a href="#how" className="btn btn-outline btn-lg">See how it works</a>
          </div>
          <div className="lp-hero-meta">
            <span><Zap />Real-time chat</span>
            <span><Timer />Full status history</span>
            <span><ShieldCheck />Role-based access</span>
          </div>
          <ProductPreview />
        </div>
      </header>

      {/* lifecycle */}
      <section id="how" className="lp-section">
        <div className="lp-container">
          <div className="lp-head-center reveal">
            <span className="lp-eyebrow"><i />How it works</span>
            <h2 className="lp-h2">One clear path for <span className="serif-accent">every complaint</span></h2>
            <p className="lp-lead">From the moment it’s filed to the moment it’s rated, everyone can see exactly where a complaint stands.</p>
          </div>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className={`lp-step reveal ${s.accent ? 'is-accent' : ''}`} style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="lp-step-n">0{i + 1}</span>
                <div className="lp-step-icon"><s.icon /></div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                {s.status ? <StatusBadge status={s.status} /> : <span className="pill pill-resolved" style={{ gap: 4 }}><Star size={12} fill="currentColor" />4.8</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="lp-section is-tint">
        <div className="lp-container">
          <div className="lp-head-center reveal">
            <span className="lp-eyebrow"><i />Features</span>
            <h2 className="lp-h2">Everything you need to <span className="serif-accent">close the loop</span></h2>
            <p className="lp-lead">Built around the work itself — not ticket forms. Each piece does one job well.</p>
          </div>
          <div className="lp-features">
            <FeatureCard tag="Live chat" title="Talk it through, in real time" text="Every complaint has its own chat thread. Messages arrive instantly for the user and the assigned agent.">
              <div className="lp-art-card" style={{ display: 'grid' }}>
                <div className="lp-art-bubble them">The Wi-Fi drops again around 8pm 😕</div>
                <div className="lp-art-bubble me">Rebooting the access point on your floor now.</div>
                <div className="lp-art-bubble them">Back up — thanks!</div>
              </div>
            </FeatureCard>
            <FeatureCard tag="Smart queue" title="The right complaint, next" text="Agents see unassigned work sorted by priority and age, and claim it with one click — no double handling.">
              <div className="lp-art-card">
                {[['No hot water', 'High'], ['Router offline', 'High'], ['Noisy corridor', 'Medium'], ['Broken locker', 'Low']].map(([t, p]) => (
                  <div key={t} className="lp-art-row"><span>{t}</span><PriorityPill priority={p} /></div>
                ))}
              </div>
            </FeatureCard>
            <FeatureCard tag="Timeline" title="Every change, on the record" text="Status updates are logged with timestamps, so users never have to ask “any update?” again.">
              <div className="lp-art-card">
                {[['Pending', '09:12'], ['Assigned', '09:14'], ['In Progress', '09:20'], ['Resolved', '10:02']].map(([s, t]) => (
                  <div key={s} className="lp-art-row"><StatusBadge status={s} /><span className="mono" style={{ fontSize: 11.5, color: '#8a8a8a' }}>{t}</span></div>
                ))}
              </div>
            </FeatureCard>
            <FeatureCard tag="Analytics" title="See where it hurts" text="Volumes by month and category, resolution rates per agent and customer ratings — in one dashboard.">
              <div className="lp-art-card">
                <div className="lp-art-bars">{[38, 55, 42, 70, 58, 86, 64].map((h, i) => <div key={i} style={{ height: `${h}%` }} />)}</div>
              </div>
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* roles */}
      <section id="roles" className="lp-section">
        <div className="lp-container">
          <div className="lp-head-center reveal">
            <span className="lp-eyebrow"><i />Roles</span>
            <h2 className="lp-h2">Built for <span className="serif-accent">everyone</span> involved</h2>
            <p className="lp-lead">Three roles, one system. Each person sees exactly what they need and nothing they shouldn’t.</p>
          </div>
          <div className="lp-bento">
            <div className="lp-tile span-2 reveal">
              <div className="lp-tile-split">
                <div>
                  <span className="lp-tile-label">FOR USERS</span>
                  <h3>Report a problem in under a minute</h3>
                  <ul className="lp-list">
                    <li><Check />Pick a category and priority, attach a screenshot</li>
                    <li><Check />Follow its status and chat with your agent</li>
                    <li><Check />Rate the resolution when it’s done</li>
                  </ul>
                </div>
                <div className="section" style={{ padding: 4 }}>
                  <div className="section-body" style={{ padding: 16, display: 'grid', gap: 12 }}>
                    <div className="field"><span className="label">Title</span><div className="input" style={{ display: 'flex', alignItems: 'center' }}>No hot water in block C</div></div>
                    <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="field"><span className="label">Category</span><div className="input" style={{ display: 'flex', alignItems: 'center' }}>Water Issue</div></div>
                      <div className="field"><span className="label">Priority</span><div style={{ height: 40, display: 'flex', alignItems: 'center' }}><PriorityPill priority="High" /></div></div>
                    </div>
                    <span className="btn btn-dark" style={{ pointerEvents: 'none' }}><Plus />Submit complaint</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-tile reveal" style={{ transitionDelay: '80ms' }}>
              <span className="lp-tile-label">FOR AGENTS</span>
              <h3>A queue that tells you what’s next</h3>
              <ul className="lp-list">
                <li><Inbox />Unassigned work, triaged by priority</li>
                <li><MessagesSquare />Live chat on every complaint</li>
                <li><ListChecks />Your own list of open and resolved cases</li>
              </ul>
            </div>

            <div className="lp-tile span-3 is-dark reveal">
              <div className="dot-grid" />
              <div className="lp-tile-split" style={{ position: 'relative' }}>
                <div>
                  <span className="lp-tile-label">FOR ADMINS</span>
                  <h3>The whole operation, at a glance</h3>
                  <ul className="lp-list">
                    <li><BarChart3 />Six-month trends, categories and per-agent performance</li>
                    <li><Users />Enable, disable and remove users and agents</li>
                    <li><UserPlus />Assign complaints directly and export to CSV</li>
                  </ul>
                </div>
                <div className="metrics">
                  <Metric title="Resolved" value="148" delta={12} bars={bars(14, 18, 21, 26, 31, 38)} goodWhenUp />
                  <Metric title="Open" value="12" delta={-8} bars={bars(9, 14, 11, 16, 13, 12)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="lp-section is-tint">
        <div className="lp-container lp-faq">
          <div className="reveal">
            <span className="lp-eyebrow"><i />FAQ</span>
            <h2 className="lp-h2">Frequently <span className="serif-accent">asked</span> questions</h2>
            <p className="lp-lead">The short version of how {BRAND} works. Anything else, ask your administrator.</p>
            <div className="lp-help-card">
              <span className="spark-icon" style={{ width: 34, height: 34 }}><LifeBuoy /></span>
              <div>
                <div style={{ fontWeight: 500 }}>Already have an account?</div>
                <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Sign in to see your complaints and messages.</div>
                <Link to="/login" className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>Sign in<ArrowRight /></Link>
              </div>
            </div>
          </div>
          <div className="lp-faq-list">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="lp-faq-item reveal" open={i === 0} style={{ transitionDelay: `${i * 50}ms` }}>
                <summary>
                  <span className="n">0{i + 1}</span>
                  {q}
                  <span className="chev" aria-hidden="true"><Plus /></span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="lp-section" style={{ paddingBottom: 0 }}>
        <div className="lp-container">
          <div className="lp-cta reveal">
            <div className="dot-grid" />
            <div className="glow" style={{ right: -120, top: -260 }} />
            <div style={{ position: 'relative' }}>
              <h2>Ready to <span className="serif-accent">clear the backlog</span>?</h2>
              <p>Create an account and file your first complaint in under a minute.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, position: 'relative', flexWrap: 'wrap' }}>
              {user
                ? <Link to={homeFor(user.role)} className="btn btn-accent btn-lg">Open dashboard<ArrowRight /></Link>
                : <>
                    <Link to="/register" className="btn btn-accent btn-lg">Get started<ArrowRight /></Link>
                    <Link to="/login" className="btn btn-outline btn-lg">Sign in</Link>
                  </>}
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="lp-footer">
        <div className="dot-grid" />
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div>
              <Logo />
              <p style={{ color: '#8d8d8d', marginTop: 14, maxWidth: 320 }}>
                Complaint management for teams that want every issue tracked, owned and resolved.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <ul>
                <li><a href="#how">How it works</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#roles">Roles</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4>Account</h4>
              <ul>
                <li><Link to="/login">Sign in</Link></li>
                <li><Link to="/register">Create account</Link></li>
              </ul>
            </div>
          </div>
          <div className="lp-wordmark" aria-hidden="true">{BRAND}</div>
          <div className="lp-footer-bottom">
            <span>© {year} {BRAND}</span>
            <span>Built with React, Express &amp; MongoDB</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
