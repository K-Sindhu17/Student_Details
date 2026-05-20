import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext.jsx'
import Mascot from '../../components/Mascot.jsx'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  useEffect(() => {
    api.get('/admin/reports/summary').then(setData).catch(console.error)
  }, [])

  if (!data) return <div className="loading">Loading...</div>
  const { counts, attendance } = data
  const firstName = user.name?.split(' ')[0] || 'Admin'

  const maxDayTotal = Math.max(1, ...attendance.map((d) => (d.present + d.absent)))

  return (
    <>
      <div className="hero">
        <div className="hero-mascot">
          <Mascot size={100} />
        </div>
        <div>
          <h2>Welcome, {firstName}! 🛡️</h2>
          <p>Here's how the school is doing today.</p>
        </div>
      </div>

      <div className="grid grid-3">
        <Counter
          tone="bg-purple"
          icon="🎒"
          value={counts.students}
          label="Total students"
          subtitle={`out of 4000`}
        />
        <Counter
          tone="bg-mint"
          icon="📚"
          value={counts.teachers}
          label="Total teachers"
        />
        <Counter
          tone="bg-yellow"
          icon="🏫"
          value={counts.classes}
          label="Active classes"
        />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>📊 Attendance · last 7 days</h3>
          {attendance.length === 0 ? (
            <p className="muted">No attendance data yet — teachers will start marking soon!</p>
          ) : (
            <>
              <div className="bars">
                {attendance.map((d, i) => {
                  const totalDay = d.present + d.absent
                  const pPct = totalDay ? (d.present / maxDayTotal) * 100 : 0
                  const aPct = totalDay ? (d.absent / maxDayTotal) * 100 : 0
                  return (
                    <div key={d.date} className="bar" title={`${d.present} present · ${d.absent} absent`}>
                      <div className="stack">
                        <div className="seg present" style={{ height: `${pPct}%` }} />
                        <div className="seg absent" style={{ height: `${aPct}%` }} />
                      </div>
                      <div className="label">
                        {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="row" style={{ justifyContent: 'center', marginTop: '.6rem', gap: '.75rem' }}>
                <span className="chip success">● Present</span>
                <span className="chip danger">● Absent</span>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h3>🚀 Quick actions</h3>
          <div className="action-grid">
            <Link to="/admin/students" className="action-tile">
              <span className="emoji">🎒</span>
              Add student
              <span className="sub">enroll new</span>
            </Link>
            <Link to="/admin/teachers" className="action-tile">
              <span className="emoji">📚</span>
              Add teacher
              <span className="sub">onboard staff</span>
            </Link>
            <Link to="/admin/classes" className="action-tile">
              <span className="emoji">🏫</span>
              Classes
              <span className="sub">manage list</span>
            </Link>
            <Link to="/admin/students" className="action-tile">
              <span className="emoji">🔑</span>
              Reset password
              <span className="sub">help students</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="card bg-sky">
        <h3>💡 Tip of the day</h3>
        <p style={{ color: '#0C4A6E', fontWeight: 700, margin: 0 }}>
          When a student or teacher forgets their password, they can request a reset from the login screen — you'll get a notification with a link to reset it from their page. No back-and-forth needed!
        </p>
      </div>
    </>
  )
}

function Counter({ tone, icon, value, label, subtitle }) {
  const [display, setDisplay] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const duration = 900
    const t0 = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(eased * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => raf && cancelAnimationFrame(raf)
  }, [value])

  return (
    <div className={`card stat ${tone}`}>
      <span className="icon">{icon}</span>
      <div className="num">{display}</div>
      <div className="label">{label}</div>
      {subtitle && <div className="muted" style={{ marginTop: '.3rem', fontSize: '.75rem' }}>{subtitle}</div>}
    </div>
  )
}
