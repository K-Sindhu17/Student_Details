import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import Mascot from '../../components/Mascot.jsx'
import PasswordReminder from '../../components/PasswordReminder.jsx'

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [marks, setMarks] = useState([])
  const [notifs, setNotifs] = useState([])

  useEffect(() => {
    api.get('/student/profile').then(setProfile).catch(() => {})
    api.get('/student/attendance').then(setAttendance).catch(() => {})
    api.get('/student/assignments').then(setAssignments).catch(() => {})
    api.get('/student/marks').then(setMarks).catch(() => {})
    api.get('/notifications').then((r) => setNotifs((r || []).slice(0, 5))).catch(() => {})
  }, [])

  const greeting = useGreeting()
  const firstName = profile?.name?.split(' ')[0] || 'there'

  const pct = attendance?.summary?.total
    ? Math.round((attendance.summary.present / attendance.summary.total) * 100)
    : 0

  const pending = useMemo(
    () => (assignments || []).filter((a) => a.status === 'available' || a.status === 'in_progress'),
    [assignments]
  )
  const recentMarks = (marks || []).slice(0, 4)

  return (
    <>
      <div className="hero">
        <div className="hero-mascot">
          <Mascot size={100} waving />
        </div>
        <div>
          <h2>{greeting}, {firstName}! 👋</h2>
          <p>
            {profile?.class_label && <>Class <strong>{profile.class_label}</strong> · </>}
            Roll <strong>{profile?.roll_number || '—'}</strong> · Let's make today awesome!
          </p>
        </div>
      </div>

      <PasswordReminder />

      <div className="grid grid-3">
        <AttendanceCard pct={pct} summary={attendance?.summary} />

        <div className="card bg-yellow">
          <h3>📝 Pending quizzes</h3>
          {pending.length === 0 ? (
            <p style={{ color: '#7C2D12', fontWeight: 700 }}>All caught up! Great job. 🌟</p>
          ) : (
            <>
              {pending.slice(0, 3).map((a) => (
                <div key={a.id} className="today-item">
                  <span className="dot yellow" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#4A2E00' }}>{a.title}</div>
                    <div className="meta" style={{ color: '#92400E' }}>
                      {a.due_at ? `Due ${formatDue(a.due_at)}` : 'No deadline'} · {a.question_count} Q
                    </div>
                  </div>
                </div>
              ))}
              <Link to="/student/assignments" className="btn accent small" style={{ marginTop: '.75rem' }}>
                Take a quiz →
              </Link>
            </>
          )}
        </div>

        <div className="card bg-mint">
          <h3>🌟 Recent marks</h3>
          {recentMarks.length === 0 ? (
            <p style={{ color: '#065F46', fontWeight: 700 }}>No marks yet — they'll show up here.</p>
          ) : (
            <>
              {recentMarks.map((m, i) => {
                const p = (m.marks / m.max_marks) * 100
                return (
                  <div key={i} className="today-item">
                    <span className="dot mint" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#065F46' }}>{m.subject}</div>
                      <div className="meta" style={{ color: '#047857' }}>
                        {m.exam_type} · {m.marks}/{m.max_marks} ({p.toFixed(0)}%)
                      </div>
                    </div>
                  </div>
                )
              })}
              <Link to="/student/marks" className="btn success small" style={{ marginTop: '.75rem' }}>
                See all marks →
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>🔔 What's new</h3>
          {notifs.length === 0 ? (
            <p className="muted">Nothing new right now.</p>
          ) : (
            notifs.map((n) => (
              <div key={n.id} className="today-item">
                <span className={`dot ${n.is_read ? 'purple' : 'coral'}`} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{n.title}</div>
                  {n.body && <div className="meta">{n.body}</div>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3>🚀 Quick actions</h3>
          <div className="action-grid">
            <Link to="/student/assignments" className="action-tile">
              <span className="emoji">📝</span>
              Take a quiz
              <span className="sub">{pending.length} pending</span>
            </Link>
            <Link to="/student/attendance" className="action-tile">
              <span className="emoji">✅</span>
              My attendance
              <span className="sub">{pct}% this term</span>
            </Link>
            <Link to="/student/marks" className="action-tile">
              <span className="emoji">🌟</span>
              My marks
              <span className="sub">{marks.length} recorded</span>
            </Link>
            <Link to="/student/profile" className="action-tile">
              <span className="emoji">🦉</span>
              My profile
              <span className="sub">view details</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

function AttendanceCard({ pct, summary }) {
  const present = summary?.present || 0
  const absent  = summary?.absent  || 0
  const late    = summary?.late    || 0
  const total   = summary?.total   || 0
  const tone =
    pct >= 90 ? 'You\'re a star! 🌟' :
    pct >= 75 ? 'Great going!' :
    pct >= 50 ? 'Keep showing up!' :
                'Let\'s aim higher!'

  return (
    <div className="card bg-purple">
      <h3>✅ Attendance</h3>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '.5rem 0 1rem' }}>
        <div className="donut" style={{ '--p': pct }}>
          <div className="donut-label">
            <span className="pct">{pct}%</span>
            <span className="sub">attendance</span>
          </div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: '.6rem' }}>
        <span className="chip success">P {present}</span>
        <span className="chip danger">A {absent}</span>
        {late > 0 && <span className="chip accent">L {late}</span>}
      </div>
      <p style={{ textAlign: 'center', marginTop: '.75rem', marginBottom: 0, fontWeight: 700, color: '#5B21B6' }}>
        {total > 0 ? tone : 'No records yet.'}
      </p>
    </div>
  )
}

function useGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return 'Up early'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Hi'
}

function formatDue(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = (d - now) / 36e5
  if (diffH < 0) return 'overdue'
  if (diffH < 24) return `in ${Math.round(diffH)}h`
  const diffD = Math.round(diffH / 24)
  return `in ${diffD}d`
}
