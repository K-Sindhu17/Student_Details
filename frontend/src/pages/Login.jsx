import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { api } from '../api'
import Mascot from '../components/Mascot.jsx'

const SCHOOL_NAME = 'ZPHS Parmalla'

const ROLES = [
  { key: 'student', label: 'Student', emoji: '🎒' },
  { key: 'teacher', label: 'Teacher', emoji: '📚' },
  { key: 'admin',   label: 'Admin',   emoji: '🛡️' },
]

const EMAIL_FORMAT_HINT = {
  student: 'Format: {joinYear}{schoolCode}st{roll}@your-school',
  teacher: 'Format: {joinYear}{schoolCode}tech{id}@your-school',
  admin:   'Format: admin@your-school',
}
const FIRST_LOGIN_HINT = {
  student: 'First-time login? Use your roll number as password.',
  teacher: 'First-time login? Use your teacher ID (e.g. t001) as password.',
}

export default function Login() {
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('student')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotId, setForgotId] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [forgotFocused, setForgotFocused] = useState(false)

  if (loading) return <div className="loading">Loading...</div>
  if (user) {
    if (user.role === 'admin' && user.must_change_password) {
      return <Navigate to="/change-password" replace />
    }
    return <Navigate to={`/${user.role}`} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const u = await login(identifier, password, role)
      const force = u.role === 'admin' && u.must_change_password
      navigate(force ? '/change-password' : `/${u.role}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitForgot = async (e) => {
    e.preventDefault()
    setForgotMsg('')
    setForgotSubmitting(true)
    try {
      await api.post('/auth/request-password-reset', { role, identifier: forgotId })
      setForgotMsg('Sent! Your school admin will reset your password soon.')
      setForgotId('')
    } catch (err) {
      setForgotMsg(err.message)
    } finally {
      setForgotSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-shape s1" />
      <div className="login-shape s2" />
      <div className="login-shape s3" />

      <form className="login-card" onSubmit={onSubmit}>
        <div className="mascot">
          <Mascot size={120} waving />
        </div>
        <h1>{SCHOOL_NAME}</h1>
        <p className="subtitle">Welcome back, friend! 🌟</p>

        <div className="role-toggle" role="tablist" aria-label="Login as">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={role === r.key ? 'active' : ''}
              onClick={() => { setRole(r.key); setIdentifier(''); setError('') }}
            >
              <span className="emoji">{r.emoji}</span>
              {r.label}
            </button>
          ))}
        </div>

        <div className="field">
          <label>School email</label>
          <input
            type="email"
            required
            placeholder="your school email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            autoComplete="username"
          />
          {emailFocused && (
            <small className="muted">{EMAIL_FORMAT_HINT[role]}</small>
          )}
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {(role === 'student' || role === 'teacher') && (
            <small className="muted">{FIRST_LOGIN_HINT[role]}</small>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <button disabled={submitting} className="big" style={{ width: '100%', justifyContent: 'center' }}>
          {submitting ? 'Signing in…' : '✨  Sign in'}
        </button>

        {role !== 'admin' && (
          <p style={{ textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
            <button
              type="button"
              className="link-btn"
              onClick={() => { setForgotOpen((v) => !v); setForgotMsg('') }}
            >
              {forgotOpen ? 'Cancel' : 'Forgot password?'}
            </button>
          </p>
        )}

        {forgotOpen && role !== 'admin' && (
          <div className="card bg-yellow" style={{ marginTop: '.75rem' }}>
            <p className="muted" style={{ marginTop: 0, color: '#7C2D12', fontWeight: 700 }}>
              Type your school email — your admin will reset your password.
            </p>
            <div className="field">
              <input
                placeholder="your school email"
                value={forgotId}
                onChange={(e) => setForgotId(e.target.value)}
                onFocus={() => setForgotFocused(true)}
                onBlur={() => setForgotFocused(false)}
              />
              {forgotFocused && (
                <small className="muted" style={{ color: '#7C2D12', fontWeight: 700 }}>
                  {EMAIL_FORMAT_HINT[role]}
                </small>
              )}
            </div>
            <button
              type="button"
              className="accent"
              disabled={forgotSubmitting || !forgotId}
              onClick={submitForgot}
            >
              {forgotSubmitting ? 'Sending…' : 'Request reset'}
            </button>
            {forgotMsg && (
              <div className="muted" style={{ marginTop: '.6rem', color: '#7C2D12', fontWeight: 700 }}>
                {forgotMsg}
              </div>
            )}
          </div>
        )}

        {role === 'admin' && (
          <p className="muted" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.8rem' }}>
            Admin password is set during seeding. Contact the developer if locked out.
          </p>
        )}
      </form>
    </div>
  )
}
