import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function TeacherAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [entries, setEntries] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => api.get(`/teacher/attendance?date=${date}`).then(d => {
    setEntries(d.entries.map(e => ({ ...e, status: e.status || 'present' })))
  })

  useEffect(() => { load() }, [date])

  const setStatus = (student_id, status) => {
    setEntries(entries.map(e => e.student_id === student_id ? { ...e, status } : e))
  }

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await api.post('/teacher/attendance', {
        date,
        entries: entries.map(e => ({ student_id: e.student_id, status: e.status })),
      })
      setMsg('Saved.')
    } catch (err) { setMsg(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <h2>Attendance</h2>
      <div className="card">
        <div className="row" style={{ gap: '1rem' }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <button onClick={save} disabled={saving || entries.length === 0}>
            {saving ? 'Saving...' : 'Save attendance'}
          </button>
        </div>
        {msg && <div className="muted" style={{ marginTop: '.5rem' }}>{msg}</div>}
      </div>
      <div className="card">
        {entries.length === 0 ? <p className="muted">No students.</p> : (
          <table>
            <thead><tr><th>Roll</th><th>Name</th><th>Status</th></tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.student_id}>
                  <td>{e.roll_number}</td>
                  <td>{e.name}</td>
                  <td>
                    <select value={e.status} onChange={ev => setStatus(e.student_id, ev.target.value)}>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
