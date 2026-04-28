import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function TeacherMarks() {
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState([])
  const [form, setForm] = useState({ student_id: '', subject: '', exam_type: 'term', marks: '', max_marks: '100' })
  const [error, setError] = useState('')

  const load = () => Promise.all([api.get('/teacher/students'), api.get('/teacher/marks')])
    .then(([s, m]) => { setStudents(s); setMarks(m) })

  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/teacher/marks', {
        ...form,
        student_id: Number(form.student_id),
        marks: Number(form.marks),
        max_marks: Number(form.max_marks),
      })
      setForm({ student_id: '', subject: '', exam_type: 'term', marks: '', max_marks: '100' })
      load()
    } catch (err) { setError(err.message) }
  }

  return (
    <>
      <h2>Marks</h2>
      <div className="card">
        <h3>Enter marks</h3>
        <form onSubmit={submit}>
          <div className="grid grid-2">
            <div className="field">
              <label>Student</label>
              <select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}>
                <option value="">— Select —</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.roll_number} - {s.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Subject</label><input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}/></div>
            <div className="field">
              <label>Exam type</label>
              <select value={form.exam_type} onChange={e => setForm({ ...form, exam_type: e.target.value })}>
                <option value="term">Term</option>
                <option value="midterm">Midterm</option>
                <option value="quiz">Quiz</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div className="field"><label>Marks</label><input type="number" step="0.01" required value={form.marks} onChange={e => setForm({ ...form, marks: e.target.value })}/></div>
            <div className="field"><label>Max marks</label><input type="number" step="0.01" required value={form.max_marks} onChange={e => setForm({ ...form, max_marks: e.target.value })}/></div>
          </div>
          {error && <div className="error">{error}</div>}
          <button>Save</button>
        </form>
      </div>
      <div className="card">
        <h3>Recorded marks</h3>
        <table>
          <thead><tr><th>Roll</th><th>Student</th><th>Subject</th><th>Exam</th><th>Marks</th></tr></thead>
          <tbody>
            {marks.map(m => (
              <tr key={m.id}>
                <td>{m.roll_number}</td><td>{m.student_name}</td>
                <td>{m.subject}</td><td>{m.exam_type}</td>
                <td>{m.marks} / {m.max_marks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
