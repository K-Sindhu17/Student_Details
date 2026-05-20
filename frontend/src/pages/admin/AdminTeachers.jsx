import { useEffect, useState } from 'react'
import { api } from '../../api'

const empty = { name: '', teacher_id: '', phone: '', class: '', subject: '' }

export default function AdminTeachers() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  const load = () => api.get('/admin/teachers').then(setItems)

  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setCreated(null)
    try {
      const r = await api.post('/admin/teachers', form)
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

  const resetPassword = async (id, label) => {
    if (!confirm(`Reset password for ${label}? They will be required to set a new password on next login.`)) return
    try {
      const r = await api.post(`/admin/teachers/${id}/reset-password`, {})
      alert(`Password reset.\nDefault password: ${r.default_password}`)
    } catch (err) { alert(err.message) }
  }

  return (
    <>
      <h2>Teachers</h2>
      <div className="card">
        <h3>Add teacher</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Login email is auto-generated as <code>{`${new Date().getFullYear()}A61tech{empId}@…`}</code> (e.g. <code>2026A61tech001@…</code>).
          Default password = teacher ID. Teacher must change it on first login.
        </p>
        <form onSubmit={submit}>
          <div className="grid grid-2">
            <div className="field"><label>Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></div>
            <div className="field"><label>Teacher ID</label><input required pattern="t?\d{1,3}" title="Digits only or t-prefix (e.g. 1, 12, t001)" placeholder="e.g. 1 or t001" value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}/></div>
            <div className="field"><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></div>
            <div className="field">
              <label>Class</label>
              <input placeholder="e.g. 3 or Nursery (optional)" value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}/>
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
                <td>
                  <button className="secondary small" onClick={() => resetPassword(t.id, t.name)}>Reset password</button>
                  {' '}
                  <button className="danger small" onClick={() => del(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
