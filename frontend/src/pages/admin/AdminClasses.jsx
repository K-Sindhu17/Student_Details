import { useEffect, useState } from 'react'
import { api } from '../../api'

const GRADE_OPTIONS = [
  { value: -2, label: 'Nursery' },
  { value: -1, label: 'LKG' },
  { value: 0,  label: 'UKG' },
  { value: 1,  label: 'Class 1' },
  { value: 2,  label: 'Class 2' },
  { value: 3,  label: 'Class 3' },
  { value: 4,  label: 'Class 4' },
  { value: 5,  label: 'Class 5' },
  { value: 6,  label: 'Class 6' },
  { value: 7,  label: 'Class 7' },
  { value: 8,  label: 'Class 8' },
  { value: 9,  label: 'Class 9' },
  { value: 10, label: 'Class 10' },
]

const labelForGrade = (g) => {
  const opt = GRADE_OPTIONS.find((o) => o.value === Number(g))
  return opt ? opt.label : `Grade ${g}`
}

export default function AdminClasses() {
  const [items, setItems] = useState([])
  const [grade, setGrade] = useState('')
  const [error, setError] = useState('')

  const load = () => api.get('/admin/classes').then(setItems)
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/classes', { grade: Number(grade) })
      setGrade('')
      load()
    } catch (err) { setError(err.message) }
  }

  const del = async (id) => {
    if (!confirm('Delete this class?')) return
    await api.del(`/admin/classes/${id}`)
    load()
  }

  return (
    <>
      <h2>Classes</h2>
      <div className="card">
        <h3>Add class</h3>
        <form onSubmit={add} className="row" style={{ gap: '1rem' }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Class</label>
            <select required value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">— Select —</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <button>Add</button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="card">
        <table>
          <thead><tr><th>ID</th><th>Class</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td><td>{labelForGrade(c.grade)}</td>
                <td><button className="danger small" onClick={() => del(c.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
