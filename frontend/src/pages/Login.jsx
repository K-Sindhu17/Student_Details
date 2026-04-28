import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const SCHOOL_NAME = 'ZPHS Parmalla'

const FIELD_LABEL = {
  student: 'Roll Number',
  teacher: 'Teacher ID',
  admin: 'Email',
}
const FIELD_PLACEHOLDER = {
  student: 'e.g. 101',
  teacher: 'e.g. t001',
  admin: 'admin@zphsparmalla.in',
}

export default function Login() {
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('student')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <div className="loading">Loading...</div>
  if (user) {
    if (user.must_change_password) return <Navigate to="/change-password" replace />
    return <Navigate to={`/${user.role}`} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const u = await login(identifier, password, role)
      navigate(u.must_change_password ? '/change-password' : `/${u.role}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>{SCHOOL_NAME}</h1>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>School Login</p>
        <div className="field">
          <label>Login as</label>
          <select value={role} onChange={(e) => { setRole(e.target.value); setIdentifier('') }}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="field">
          <label>{FIELD_LABEL[role]}</label>
          <input
            type={role === 'admin' ? 'email' : 'text'}
            required
            placeholder={FIELD_PLACEHOLDER[role]}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {(role === 'student' || role === 'teacher') && (
            <small className="muted">First-time login: password is the same as your {FIELD_LABEL[role].toLowerCase()}.</small>
          )}
        </div>
        {error && <div className="error">{error}</div>}
        <button disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
