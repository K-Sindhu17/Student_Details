import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import ChangePassword from './pages/ChangePassword.jsx'

import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminStudents from './pages/admin/AdminStudents.jsx'
import AdminTeachers from './pages/admin/AdminTeachers.jsx'
import AdminClasses from './pages/admin/AdminClasses.jsx'

import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx'
import TeacherAttendance from './pages/teacher/TeacherAttendance.jsx'
import TeacherAssignments from './pages/teacher/TeacherAssignments.jsx'
import TeacherMarks from './pages/teacher/TeacherMarks.jsx'

import StudentDashboard from './pages/student/StudentDashboard.jsx'
import StudentProfile from './pages/student/StudentProfile.jsx'
import StudentAttendance from './pages/student/StudentAttendance.jsx'
import StudentAssignments from './pages/student/StudentAssignments.jsx'
import StudentMarks from './pages/student/StudentMarks.jsx'

function Home() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  // Only admin is forced through change-password (highest-privilege role).
  // Students/teachers get a dismissible reminder on their dashboard instead.
  if (user.role === 'admin' && user.must_change_password) {
    return <Navigate to="/change-password" replace />
  }
  return <Navigate to={`/${user.role}`} replace />
}

function withLayout(role, Component) {
  return (
    <ProtectedRoute role={role}>
      <Layout><Component /></Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />

      <Route path="/admin"          element={withLayout('admin', AdminDashboard)} />
      <Route path="/admin/students" element={withLayout('admin', AdminStudents)} />
      <Route path="/admin/teachers" element={withLayout('admin', AdminTeachers)} />
      <Route path="/admin/classes"  element={withLayout('admin', AdminClasses)} />

      <Route path="/teacher"             element={withLayout('teacher', TeacherDashboard)} />
      <Route path="/teacher/attendance"  element={withLayout('teacher', TeacherAttendance)} />
      <Route path="/teacher/assignments" element={withLayout('teacher', TeacherAssignments)} />
      <Route path="/teacher/marks"       element={withLayout('teacher', TeacherMarks)} />

      <Route path="/student"             element={withLayout('student', StudentDashboard)} />
      <Route path="/student/profile"     element={withLayout('student', StudentProfile)} />
      <Route path="/student/attendance"  element={withLayout('student', StudentAttendance)} />
      <Route path="/student/assignments" element={withLayout('student', StudentAssignments)} />
      <Route path="/student/marks"       element={withLayout('student', StudentMarks)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
