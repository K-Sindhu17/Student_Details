import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function StudentAttendance() {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/student/attendance').then(setData) }, [])
  if (!data) return <div className="loading">Loading...</div>
  const { records, summary } = data
  const pct = summary.total ? ((summary.present / summary.total) * 100).toFixed(1) : '0'
  return (
    <>
      <h2>My Attendance</h2>
      <div className="grid grid-4">
        <div className="card stat"><div className="num">{pct}%</div><div className="label">Attendance</div></div>
        <div className="card stat"><div className="num">{summary.present || 0}</div><div className="label">Present</div></div>
        <div className="card stat"><div className="num">{summary.absent || 0}</div><div className="label">Absent</div></div>
        <div className="card stat"><div className="num">{summary.late || 0}</div><div className="label">Late</div></div>
      </div>
      <div className="card">
        <h3>Recent</h3>
        {records.length === 0 ? <p className="muted">No attendance records yet.</p> : (
          <table>
            <thead><tr><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.date}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td className={`tag-${r.status}`}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
