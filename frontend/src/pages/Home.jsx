import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const features = [
  { icon: '📝', title: 'Submit', desc: 'Register complaints with category, priority and attachments in seconds.' },
  { icon: '📡', title: 'Track Live', desc: 'Follow your complaint status in real time from Pending to Resolved.' },
  { icon: '💬', title: 'Chat', desc: 'Talk directly with the agent working on your issue via live chat.' },
  { icon: '⭐', title: 'Rate', desc: 'Give feedback and rating once your complaint is resolved.' },
]

const stats = [
  { number: '500+', label: 'Complaints Resolved' },
  { number: '50+', label: 'Active Agents' },
  { number: '98%', label: 'Satisfaction Rate' },
  { number: '24/7', label: 'Support Available' },
]

export default function Home() {
  return (
    <div>
      <Navbar />

      <div style={{
        background: 'linear-gradient(135deg, #c00000 0%, #6b0000 60%, #1a1a2e 100%)',
        minHeight: '88vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '60px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '720px', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '30px',
            padding: '8px 22px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '28px',
            letterSpacing: '0.5px'
          }}>
            🚀 ONLINE COMPLAINT MANAGEMENT SYSTEM
          </div>

          <h1 style={{
            fontSize: '52px',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.15,
            marginBottom: '20px'
          }}>
            Resolve Every<br />
            <span style={{ color: '#ffcdd2' }}>Complaint Fast</span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '18px',
            lineHeight: 1.7,
            marginBottom: '40px',
            maxWidth: '580px',
            margin: '0 auto 40px'
          }}>
            Submit, track, and resolve complaints in one centralized platform.
            Real-time chat with agents, live status updates, and instant feedback.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              background: '#fff',
              color: '#c00000',
              padding: '14px 36px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              Get Started Free
            </Link>
            <Link to="/login" style={{
              background: 'transparent',
              color: '#fff',
              padding: '14px 36px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '15px',
              border: '2px solid rgba(255,255,255,0.5)'
            }}>
              Login to Account
            </Link>
          </div>
        </div>
      </div>

      <div style={{
        background: '#c00000',
        padding: '32px 24px'
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          textAlign: 'center'
        }}>
          {stats.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{s.number}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '72px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 700, marginBottom: '48px', color: '#1a1a2e' }}>
          How It Works
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px'
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
              borderTop: '4px solid #c00000',
              transition: 'transform 0.2s'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '14px' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '10px', color: '#1a1a2e' }}>{f.title}</h3>
              <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #c00000 100%)',
        padding: '60px 24px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, marginBottom: '14px' }}>
          Ready to get started?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '28px', fontSize: '15px' }}>
          Join users who resolve complaints faster every day.
        </p>
        <Link to="/register" style={{
          background: '#fff',
          color: '#c00000',
          padding: '14px 40px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '15px',
          display: 'inline-block'
        }}>
          Create Free Account
        </Link>
      </div>

      <footer style={{
        background: '#1a1a2e',
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        padding: '20px',
        fontSize: '13px'
      }}>
        © 2026 Complaint Management System · Built with React + Node.js + MongoDB
      </footer>
    </div>
  )
}
