import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext.jsx'
import Mascot from '../../components/Mascot.jsx'
import PasswordReminder from '../../components/PasswordReminder.jsx'

const CLASS_LABEL = (g) =>
  g === -2 ? 'Nursery' : g === -1 ? 'LKG' : g === 0 ? 'UKG' : `Class ${g}`

const today = () => new Date().toISOString().slice(0, 10)

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [info, setInfo] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState(null)
  const [assignments, setAssignments] = useState([])

  useEffect(() => {
    api.get('/teacher/me/class').then(setInfo).catch(() => {})
    api.get('/teacher/students').then(setStudents).catch(() => {})
    api.get(`/teacher/attendance?date=${today()}`).then(setAttendance).catch(() => {})
    api.get('/teacher/assignments').then(setAssignments).catch(() => {})
  }, [])

  const markedToday = useMemo(() => {
    if (!attendance?.entries) return null
    const marked = attendance.entries.filter((e) => e.status).length
    return { marked, total: attendance.entries.length }
  }, [attendance])

  const allMarked = markedToday && markedToday.total > 0 && markedToday.marked === markedToday.total

  const recentSubs = (assignments || [])
    .filter((a) => a.submission_count > 0)
    .slice(0, 4)

  const totalSubmissions = (assignments || []).reduce((sum, a) => sum + (a.submission_count || 0), 0)

  if (!info) return <div className="loading">Loading...</div>

  const className = info.class_id ? CLASS_LABEL(info.grade) : 'No class yet'
  const firstName = user.name?.split(' ')[0] || 'Teacher'

  return (
    <>
      <div className="hero">
        <div className="hero-mascot">
          <Mascot size={100} waving />
        </div>
        <div>
          <h2>Hi {firstName}! 👋</h2>
          <p>
            {info.class_id
              ? <>You're teaching <strong>{className}</strong>{info.subject && <> · <strong>{info.subject}</strong></>} · {students.length} students</>
              : <>No class assigned yet. Ask the admin to assign one.</>}
          </p>
        </div>
      </div>

      <PasswordReminder />

      <AttendanceCTA
        markedToday={markedToday}
        allMarked={allMarked}
        hasClass={!!info.class_id}
      />

      <div className="grid grid-3">
        <div className="card stat bg-purple">
          <span className="icon">👨‍🎓</span>
          <div className="num">{students.length}</div>
          <div className="label">Students in class</div>
        </div>
        <div className="card stat bg-mint">
          <span className="icon">📝</span>
          <div className="num">{assignments.length}</div>
          <div className="label">Active quizzes</div>
        </div>
        <div className="card stat bg-yellow">
          <span className="icon">📨</span>
          <div className="num">{totalSubmissions}</div>
          <div className="label">Total submissions</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>📨 Recent quizzes</h3>
          {recentSubs.length === 0 ? (
            <p className="muted">No submissions yet. When students submit, they'll show up here.</p>
          ) : (
            recentSubs.map((a) => (
              <div key={a.id} className="today-item">
                <span className="dot purple" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{a.title}</div>
                  <div className="meta">{a.submission_count} submitted · {a.question_count} questions</div>
                </div>
                <Link to="/teacher/assignments" className="chip">Open</Link>
              </div>
            ))
          )}
          <Link to="/teacher/assignments" className="btn small" style={{ marginTop: '.6rem' }}>
            Manage quizzes →
          </Link>
        </div>

        <div className="card">
          <h3>🚀 Quick actions</h3>
          <div className="action-grid">
            <Link to="/teacher/attendance" className="action-tile">
              <span className="emoji">✅</span>
              Mark attendance
              <span className="sub">{markedToday ? `${markedToday.marked}/${markedToday.total} today` : 'today'}</span>
            </Link>
            <Link to="/teacher/assignments" className="action-tile">
              <span className="emoji">📝</span>
              New quiz
              <span className="sub">build & assign</span>
            </Link>
            <Link to="/teacher/marks" className="action-tile">
              <span className="emoji">🌟</span>
              Enter marks
              <span className="sub">term/exam</span>
            </Link>
            <Link to="/teacher/assignments" className="action-tile">
              <span className="emoji">🖊️</span>
              Grade answers
              <span className="sub">review text</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>🎒 My students</h3>
        {students.length === 0 ? (
          <p className="muted">No students in this class yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Roll</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td><span className="chip">{s.roll_number}</span></td>
                  <td style={{ fontWeight: 700 }}>{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function AttendanceCTA({ markedToday, allMarked, hasClass }) {
  if (!hasClass) return null

  if (allMarked) {
    return (
      <div className="card bg-mint" style={{ borderLeft: '6px solid var(--success)' }}>
        <div className="row">
          <div style={{ fontSize: '2rem' }}>🎉</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#065F46', marginBottom: '.15rem' }}>All attendance marked for today!</h3>
            <p className="muted" style={{ color: '#047857', margin: 0, fontWeight: 700 }}>
              {markedToday.marked} of {markedToday.total} students recorded. Good job! ✨
            </p>
          </div>
          <Link to="/teacher/attendance" className="btn success">Review →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-coral" style={{ borderLeft: '6px solid var(--danger)' }}>
      <div className="row">
        <div style={{ fontSize: '2rem' }}>📢</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#9F1239', marginBottom: '.15rem' }}>
            Mark today's attendance
          </h3>
          <p className="muted" style={{ color: '#BE123C', margin: 0, fontWeight: 700 }}>
            {markedToday
              ? `${markedToday.marked} of ${markedToday.total} marked so far. Let's finish the rest!`
              : 'Tap to start marking attendance for today.'}
          </p>
        </div>
        <Link to="/teacher/attendance" className="btn danger big">Mark now →</Link>
      </div>
    </div>
  )
}
