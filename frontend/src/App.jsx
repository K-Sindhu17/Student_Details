import { useState, useEffect } from 'react'
import Header from './components/Header'
import HomePage from './components/HomePage'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import ClassPage from './components/ClassPage'
import StudentForm from './components/StudentForm'
import StudentView from './components/StudentView'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [page, setPage] = useState('home')
  const [user, setUser] = useState(null)
  const [selectedClass, setSelectedClass] = useState(null)
  const [editingStudent, setEditingStudent] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      const data = await res.json()
      if (data.teacher) {
        setUser(data.teacher)
      }
    } catch (err) {
      // Not logged in
    } finally {
      setCheckingAuth(false)
    }
  }

  const handleLogin = (teacher) => {
    setUser(teacher)
    setSelectedClass(teacher.class)
    setPage('class')
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (err) {
      // Ignore
    }
    setUser(null)
    setPage('home')
  }

  const navigate = (pageName) => {
    setPage(pageName)
    if (pageName === 'home') {
      setSelectedClass(null)
      setEditingStudent(null)
    }
    if (pageName !== 'enter') {
      setEditingStudent(null)
    }
  }

  const handleSelectClass = (cls) => {
    setSelectedClass(cls)
    setPage('class')
  }

  const handleEditStudent = (student) => {
    setEditingStudent(student)
    setPage('enter')
  }

  const handleStudentSaved = () => {
    setEditingStudent(null)
    setPage('view')
  }

  if (checkingAuth) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />

      <main className="main-content">
        {page === 'home' && (
          <HomePage onSelectClass={handleSelectClass} />
        )}

        {page === 'login' && (
          <LoginForm onLogin={handleLogin} onNavigate={navigate} />
        )}

        {page === 'register' && (
          <RegisterForm onLogin={handleLogin} onNavigate={navigate} />
        )}

        {page === 'class' && selectedClass && (
          <ClassPage
            selectedClass={selectedClass}
            user={user}
            onNavigate={navigate}
          />
        )}

        {page === 'enter' && selectedClass && user && (
          <StudentForm
            selectedClass={selectedClass}
            user={user}
            editingStudent={editingStudent}
            onNavigate={navigate}
            onSave={handleStudentSaved}
          />
        )}

        {page === 'view' && selectedClass && (
          <StudentView
            selectedClass={selectedClass}
            user={user}
            onNavigate={navigate}
            onEditStudent={handleEditStudent}
          />
        )}
      </main>
    </div>
  )
}

export default App
