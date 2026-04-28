import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import NotificationBell from './NotificationBell.jsx'

const NAV = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/students', label: 'Students' },
    { to: '/admin/teachers', label: 'Teachers' },
    { to: '/admin/classes', label: 'Classes' },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', end: true },
    { to: '/teacher/attendance', label: 'Attendance' },
    { to: '/teacher/assignments', label: 'Assignments' },
    { to: '/teacher/marks', label: 'Marks' },
  ],
  student: [
    { to: '/student', label: 'Dashboard', end: true },
    { to: '/student/attendance', label: 'Attendance' },
    { to: '/student/assignments', label: 'Assignments' },
    { to: '/student/marks', label: 'Marks' },
  ],
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const links = NAV[user.role] || []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <div className="topbar">
        <strong>ZPHS Parmalla</strong>
        <div className="row">
          <span className="role-pill">{user.role}</span>
          <span className="muted">{user.name}</span>
          {user.role !== 'admin' && <NotificationBell />}
          <Link to="/change-password" className="secondary small btn">Password</Link>
          <button className="secondary small" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="secondary small" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="layout">
        <nav className="sidebar">
          <h2>Menu</h2>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => isActive ? 'active' : ''}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
