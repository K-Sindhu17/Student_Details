function Header({ user, onLogout, onNavigate }) {
  return (
    <header className="header">
      <div className="header-left">
        <h1 onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
          Student Management System
        </h1>
      </div>
      <div className="header-right">
        {user ? (
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-detail">Class {user.class} - Section {user.section}</span>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
          </div>
        ) : (
          <div className="auth-links">
            <button className="auth-btn" onClick={() => onNavigate('login')}>Login</button>
            <button className="auth-btn register" onClick={() => onNavigate('register')}>Register</button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
