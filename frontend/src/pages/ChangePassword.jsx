import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { api } from '../api'

export default function ChangePassword() {
  const { user, refresh, loading } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <div className="loading">Loading...</div>
  if (!user) return <Navigate to="/login" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (next !== confirm) return setError("Passwords don't match")
    if (next.length < 6) return setError('Password must be at least 6 characters')
    if (next === current) return setError('New password must be different from current')
    setSubmitting(true)
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: next })
      await refresh()
      navigate(`/${user.role}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>Change Password</h1>
        {user.must_change_password && (
          <p className="muted" style={{ textAlign: 'center' }}>
            You must change your default password before continuing.
          </p>
        )}
        <div className="field">
          <label>Current password</label>
          <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="field">
          <label>New password (min 6 chars)</label>
          <input type="password" required value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="field">
          <label>Confirm new password</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <div className="error">{error}</div>}
        <button disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
