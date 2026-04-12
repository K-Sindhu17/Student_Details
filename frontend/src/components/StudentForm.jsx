import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function StudentForm({ selectedClass, user, editingStudent, onNavigate, onSave }) {
  const [subjects, setSubjects] = useState([])
  const [nextRollNo, setNextRollNo] = useState('')
  const [existingRollNos, setExistingRollNos] = useState([])
  const [form, setForm] = useState({
    name: '',
    roll_number: '',
    section: user?.section || 'A',
    marks: []
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSubjects()
    if (!editingStudent) {
      fetchExistingStudents()
    }
  }, [selectedClass])

  useEffect(() => {
    if (editingStudent && subjects.length > 0) {
      const marksMap = {}
      editingStudent.marks.forEach(m => { marksMap[m.subject] = m.marks })

      setForm({
        name: editingStudent.name,
        roll_number: editingStudent.roll_number,
        section: editingStudent.section,
        marks: subjects.map(s => ({
          subject: s.name,
          marks: marksMap[s.name] !== undefined ? marksMap[s.name] : 0,
          max: s.max
        }))
      })
    }
  }, [editingStudent, subjects])

  const fetchExistingStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students?class=${selectedClass}`)
      const data = await res.json()
      const sectionStudents = data.students.filter(s => s.section === user.section)
      const rollNos = sectionStudents.map(s => parseInt(s.roll_number)).filter(n => !isNaN(n)).sort((a, b) => a - b)
      setExistingRollNos(rollNos)
      const next = rollNos.length > 0 ? Math.max(...rollNos) + 1 : 1
      setNextRollNo(String(next))
      setForm(prev => ({ ...prev, roll_number: String(next) }))
    } catch (err) {
      // ignore
    }
  }

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_URL}/subjects?class=${selectedClass}`)
      const data = await res.json()
      setSubjects(data.subjects)

      if (!editingStudent) {
        setForm(prev => ({
          ...prev,
          marks: data.subjects.map(s => ({ subject: s.name, marks: '', max: s.max }))
        }))
      }
    } catch (err) {
      setError('Failed to load subjects')
    }
  }

  const handleMarkChange = (index, value) => {
    const newMarks = [...form.marks]
    newMarks[index] = { ...newMarks[index], marks: value }
    setForm({ ...form, marks: newMarks })
  }

  const handleAbsent = () => {
    setForm({
      ...form,
      marks: form.marks.map(m => ({ ...m, marks: 0 }))
    })
  }

  const getAverage = () => {
    const validMarks = form.marks.filter(m => m.marks !== '' && !isNaN(m.marks))
    if (validMarks.length === 0) return 0
    const total = validMarks.reduce((sum, m) => sum + Number(m.marks), 0)
    const divisor = selectedClass > 5 ? subjects.length - 1 : subjects.length
    return (total / divisor).toFixed(2)
  }

  const checkSkippedRollNo = () => {
    const entered = parseInt(form.roll_number)
    if (isNaN(entered) || editingStudent) return true

    const expected = nextRollNo ? parseInt(nextRollNo) : 1
    if (entered > expected) {
      const missing = []
      for (let i = expected; i < entered; i++) {
        if (!existingRollNos.includes(i)) {
          missing.push(i)
        }
      }
      if (missing.length > 0) {
        return window.confirm(
          `Roll number(s) ${missing.join(', ')} are not entered yet. Are you sure you want to skip and add roll number ${entered}?`
        )
      }
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!checkSkippedRollNo()) return

    for (const m of form.marks) {
      const maxMark = m.max || 100
      if (m.marks === '' || isNaN(m.marks) || m.marks < 0 || Number(m.marks) > maxMark) {
        setError(`${m.subject} marks must be between 0 and ${maxMark}`)
        return
      }
    }

    setLoading(true)

    try {
      const body = {
        name: form.name,
        roll_number: form.roll_number,
        section: form.section,
        marks: form.marks.map(m => ({ subject: m.subject, marks: Number(m.marks) }))
      }

      const url = editingStudent
        ? `${API_URL}/students/${editingStudent.id}`
        : `${API_URL}/students`

      const res = await fetch(url, {
        method: editingStudent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save student')
      }

      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="student-form-container">
      <button className="back-btn" onClick={() => onNavigate('class')}>&larr; Back</button>

      <form className="student-form" onSubmit={handleSubmit}>
        <h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
        <p className="form-subtitle">Class {selectedClass} - Section {user.section}</p>

        {error && <div className="form-error">{error}</div>}

        <div className="form-row">
          <div className="form-group">
            <label>Student Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Enter student name"
            />
          </div>

          <div className="form-group">
            <label>Roll Number {!editingStudent && nextRollNo && <span className="next-hint">(Next: {nextRollNo})</span>}</label>
            <input
              type="text"
              value={form.roll_number}
              onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
              required
              placeholder="Enter roll number"
            />
          </div>
        </div>

        <div className="marks-header">
          <h3 className="marks-heading">Subject Marks</h3>
          <button type="button" className="absent-btn" onClick={handleAbsent}>
            Absent (Set all to 0)
          </button>
        </div>

        <div className="marks-grid">
          {form.marks.map((m, index) => (
            <div key={m.subject} className="mark-input">
              <label>{m.subject} (0-{m.max})</label>
              <input
                type="number"
                min="0"
                max={m.max}
                value={m.marks}
                onChange={(e) => handleMarkChange(index, e.target.value)}
                required
                placeholder={`0-${m.max}`}
              />
            </div>
          ))}
        </div>

        <div className="average-display">
          Average: <strong>{getAverage()}</strong>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}
        </button>
      </form>
    </div>
  )
}

export default StudentForm
