import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function StudentMarks() {
  const [marks, setMarks] = useState([])
  useEffect(() => { api.get('/student/marks').then(setMarks) }, [])
  return (
    <>
      <h2>My Marks</h2>
      <div className="card">
        {marks.length === 0 ? <p className="muted">No marks yet.</p> : (
          <table>
            <thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th>%</th><th>Date</th></tr></thead>
            <tbody>
              {marks.map((m, i) => (
                <tr key={i}>
                  <td>{m.subject}</td>
                  <td>{m.exam_type}</td>
                  <td>{m.marks} / {m.max_marks}</td>
                  <td>{((m.marks / m.max_marks) * 100).toFixed(1)}%</td>
                  <td>{new Date(m.recorded_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
