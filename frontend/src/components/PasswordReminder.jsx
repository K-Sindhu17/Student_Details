import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

// Friendly nudge shown when a user is still on their default password.
// Dismissable for the current browser session only — reappears on next login.
export default function PasswordReminder() {
  const { user } = useAuth()
  const key = user ? `pw_reminder_dismissed_${user.role}_${user.id}` : null
  const initialDismissed = key ? sessionStorage.getItem(key) === '1' : false
  const [dismissed, setDismissed] = useState(initialDismissed)

  if (!user || !user.must_change_password || dismissed) return null

  const handleDismiss = () => {
    if (key) sessionStorage.setItem(key, '1')
    setDismissed(true)
  }

  return (
    <div className="card bg-yellow" style={{ borderLeft: '6px solid var(--accent-hover)' }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: '.85rem' }}>
        <div style={{ fontSize: '2rem', lineHeight: 1 }}>🔑</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#7C2D12', margin: '0 0 .25rem' }}>
            You're still using your default password
          </h3>
          <p style={{ color: '#92400E', margin: 0, fontWeight: 700 }}>
            Anyone who knows your {user.role === 'student' ? 'roll number' : 'teacher ID'} can log in
            as you. Change it whenever you're ready — it only takes a minute.
          </p>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: '.4rem' }}>
          <Link to="/change-password" className="btn accent small">
            🔒 Change now
          </Link>
          <button
            type="button"
            className="link-btn"
            onClick={handleDismiss}
            style={{ color: '#92400E', fontSize: '.8rem' }}
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  )
}
