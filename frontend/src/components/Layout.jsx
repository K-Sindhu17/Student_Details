import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import NotificationBell from './NotificationBell.jsx'

const NAV = {
  admin: [
    { to: '/admin',          label: 'Dashboard', icon: '🏠', end: true },
    { to: '/admin/students', label: 'Students',  icon: '🎒' },
    { to: '/admin/teachers', label: 'Teachers',  icon: '📚' },
    { to: '/admin/classes',  label: 'Classes',   icon: '🏫' },
  ],
  teacher: [
    { to: '/teacher',             label: 'Dashboard',   icon: '🏠', end: true },
    { to: '/teacher/attendance',  label: 'Attendance',  icon: '✅' },
    { to: '/teacher/assignments', label: 'Quizzes',     icon: '📝' },
    { to: '/teacher/marks',       label: 'Marks',       icon: '🌟' },
  ],
  student: [
    { to: '/student',             label: 'Home',        icon: '🏠', end: true },
    { to: '/student/profile',     label: 'My Profile',  icon: '🦉' },
    { to: '/student/attendance',  label: 'Attendance',  icon: '✅' },
    { to: '/student/assignments', label: 'Quizzes',     icon: '📝' },
    { to: '/student/marks',       label: 'My Marks',    icon: '🌟' },
  ],
}

const ROLE_EMOJI = { admin: '🛡️', teacher: '📚', student: '🎒' }

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = NAV[user.role] || []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <div className="topbar">
        <strong>
          <span className="brand-emoji">🦉</span>
          ZPHS Parmalla
        </strong>
        <div className="row">
          <span className="role-pill">{ROLE_EMOJI[user.role]} {user.role}</span>
          <span className="user-name">Hi, {user.name?.split(' ')[0] || 'friend'}!</span>
          <NotificationBell />
          <Link to="/change-password" className="btn secondary small">🔑 Password</Link>
          <button className="secondary small" onClick={handleLogout}>👋 Logout</button>
        </div>
      </div>
      <div className="layout">
        <nav className="sidebar">
          <h2>Menu</h2>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="nav-icon">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
          <div className="sidebar-mascot">
            <span className="emoji">🌟</span>
            <div>Keep learning,<br/>keep shining!</div>
          </div>
        </nav>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
