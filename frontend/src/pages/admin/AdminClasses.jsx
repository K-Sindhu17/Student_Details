import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function AdminClasses() {
  const [items, setItems] = useState([])
  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [error, setError] = useState('')

  const load = () => api.get('/admin/classes').then(setItems)
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/classes', { grade: Number(grade), section })
      setGrade(''); setSection('')
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
            <label>Grade</label>
            <input type="number" required value={grade} onChange={(e) => setGrade(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Section</label>
            <input required maxLength={1} value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} />
          </div>
          <button>Add</button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="card">
        <table>
          <thead><tr><th>ID</th><th>Grade</th><th>Section</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td><td>{c.grade}</td><td>{c.section}</td>
                <td><button className="danger small" onClick={() => del(c.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
