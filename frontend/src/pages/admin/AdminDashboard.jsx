import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/admin/reports/summary').then(setData).catch(console.error) }, [])
  if (!data) return <div className="loading">Loading...</div>
  const { counts, attendance } = data
  return (
    <>
      <h2>Overview</h2>
      <div className="grid grid-4">
        <div className="card stat"><div className="num">{counts.students}</div><div className="label">Students</div></div>
        <div className="card stat"><div className="num">{counts.teachers}</div><div className="label">Teachers</div></div>
        <div className="card stat"><div className="num">{counts.classes}</div><div className="label">Classes</div></div>
      </div>
      <div className="card">
        <h3>Attendance (last 7 days)</h3>
        {attendance.length === 0 ? <p className="muted">No attendance data yet.</p> : (
          <table>
            <thead><tr><th>Date</th><th>Present</th><th>Absent</th></tr></thead>
            <tbody>
              {attendance.map((r) => (
                <tr key={r.date}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td>{r.present}</td>
                  <td>{r.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
