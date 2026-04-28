import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'

export default function TeacherDashboard() {
  const [info, setInfo] = useState(null)
  const [students, setStudents] = useState([])
  useEffect(() => {
    api.get('/teacher/me/class').then(setInfo)
    api.get('/teacher/students').then(setStudents)
  }, [])
  if (!info) return <div className="loading">Loading...</div>
  return (
    <>
      <h2>Welcome</h2>
      <div className="card">
        <h3>Your class</h3>
        {info.class_id
          ? <p>Grade {info.grade} - Section {info.section} {info.subject ? `· ${info.subject}` : ''} ({students.length} students)</p>
          : <p className="muted">No class assigned. Ask the admin.</p>}
        <div className="row">
          <Link className="btn" to="/teacher/attendance">Mark attendance</Link>
          <Link className="btn secondary" to="/teacher/assignments">Manage assignments</Link>
          <Link className="btn secondary" to="/teacher/marks">Enter marks</Link>
        </div>
      </div>
      <div className="card">
        <h3>Students</h3>
        <table>
          <thead><tr><th>Roll</th><th>Name</th><th>Email</th></tr></thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td>{s.email}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
