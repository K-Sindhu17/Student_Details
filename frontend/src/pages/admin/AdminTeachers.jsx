import { useEffect, useState } from 'react'
import { api } from '../../api'

const empty = { name: '', teacher_id: '', phone: '', class_id: '', subject: '' }

export default function AdminTeachers() {
  const [items, setItems] = useState([])
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  const load = () => Promise.all([api.get('/admin/teachers'), api.get('/admin/classes')])
    .then(([t, c]) => { setItems(t); setClasses(c) })

  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setCreated(null)
    try {
      const r = await api.post('/admin/teachers', { ...form, class_id: form.class_id || null })
      setCreated(r)
      setForm(empty)
      load()
    } catch (err) { setError(err.message) }
  }

  const del = async (id) => {
    if (!confirm('Delete this teacher?')) return
    await api.del(`/admin/teachers/${id}`)
    load()
  }

  return (
    <>
      <h2>Teachers</h2>
      <div className="card">
        <h3>Add teacher</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Login email and default password are auto-generated from the teacher ID.
        </p>
        <form onSubmit={submit}>
          <div className="grid grid-2">
            <div className="field"><label>Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></div>
            <div className="field"><label>Teacher ID</label><input required placeholder="e.g. t001" value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}/></div>
            <div className="field"><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></div>
            <div className="field">
              <label>Class</label>
              <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}>
                <option value="">— None —</option>
                {classes.map(c => <option key={c.id} value={c.id}>Grade {c.grade} - {c.section}</option>)}
              </select>
            </div>
            <div className="field"><label>Subject</label><input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}/></div>
          </div>
          {error && <div className="error">{error}</div>}
          {created && (
            <div className="card" style={{ background: 'var(--bg)', marginTop: '.5rem' }}>
              <strong>Teacher created.</strong>
              <div>Login email: <code>{created.email}</code></div>
              <div>Default password: <code>{created.default_password}</code></div>
              <small className="muted">They will be required to change it on first login.</small>
            </div>
          )}
          <button>Add teacher</button>
        </form>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Teacher ID</th><th>Name</th><th>Login email</th><th>Phone</th><th>Class</th><th>Subject</th><th></th></tr></thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id}>
                <td>{t.teacher_id}</td><td>{t.name}</td><td>{t.email}</td>
                <td>{t.phone || '—'}</td><td>{t.class_label || '—'}</td><td>{t.subject || '—'}</td>
                <td><button className="danger small" onClick={() => del(t.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
