import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext.jsx'

// Fallback for legacy notifications saved without an explicit `link`.
// Maps the title prefix to the right route per role.
function inferLink(title, role) {
  const t = String(title || '').toLowerCase()
  if (role === 'student') {
    if (t.startsWith('attendance')) return '/student/attendance'
    if (t.startsWith('marks updated')) return '/student/marks'
    if (
      t.startsWith('new quiz') ||
      t.startsWith('quiz updated') ||
      t.startsWith('new assignment') ||
      t.startsWith('marks graded')
    ) return '/student/assignments'
  }
  if (role === 'teacher') {
    if (t.includes('submitted')) return '/teacher/assignments'
  }
  return null
}

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const ref = useRef()
  const navigate = useNavigate()
  const { user } = useAuth()

  const fetchCount = () => api.get('/notifications/unread-count')
    .then(r => setCount(r.count || 0))
    .catch(() => {})

  // Poll every 30s
  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 30_000)
    return () => clearInterval(id)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const toggle = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoadingItems(true)
    try {
      const list = await api.get('/notifications')
      setItems(list)
    } finally { setLoadingItems(false) }
  }

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`, {})
    setItems(items.map(n => n.id === id ? { ...n, is_read: true } : n))
    fetchCount()
  }

  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id)
    const target = n.link || inferLink(n.title, user?.role)
    if (target) {
      setOpen(false)
      navigate(target)
    }
  }

  const markAllRead = async () => {
    await api.post('/notifications/mark-all-read', {})
    setItems(items.map(n => ({ ...n, is_read: true })))
    setCount(0)
  }

  return (
    <div className="bell-wrap" ref={ref}>
      <button className="bell-btn" onClick={toggle} aria-label="Notifications">
        🔔
        {count > 0 && <span className="bell-badge">{count > 99 ? '99+' : count}</span>}
      </button>
      {open && (
        <div className="bell-panel">
          <div className="bell-panel-header">
            <strong>Notifications</strong>
            {items.some(n => !n.is_read) && (
              <button className="link-btn" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="bell-panel-list">
            {loadingItems ? <div className="muted" style={{ padding: '1rem' }}>Loading…</div>
              : items.length === 0 ? <div className="muted" style={{ padding: '1rem' }}>No notifications</div>
              : items.map(n => {
                const hasTarget = !!(n.link || inferLink(n.title, user?.role))
                return (
                  <div
                    key={n.id}
                    className={`bell-item ${n.is_read ? 'read' : 'unread'} ${hasTarget ? 'clickable' : ''}`}
                    onClick={() => handleClick(n)}
                  >
                    <div className="bell-item-title">{n.title}</div>
                    {n.body && <div className="bell-item-body">{n.body}</div>}
                    <div className="bell-item-time">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}
    </div>
  )
}
