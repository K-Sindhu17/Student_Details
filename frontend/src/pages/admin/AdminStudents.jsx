import { useEffect, useState } from 'react'
import { api } from '../../api'

const empty = {
  name: '', roll_number: '', class_id: '',
  dob: '', address: '', phone: '',
  father_name: '', father_phone: '', father_email: '',
  mother_name: '', mother_phone: '', mother_email: '',
}

export default function AdminStudents() {
  const [items, setItems] = useState([])
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  const load = () => Promise.all([
    api.get('/admin/students'),
    api.get('/admin/classes'),
  ]).then(([s, c]) => { setItems(s); setClasses(c) })

  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setCreated(null)
    try {
      const r = await api.post('/admin/students', {
        ...form,
        class_id: Number(form.class_id),
      })
      setCreated(r)
      setForm(empty)
      load()
    } catch (err) { setError(err.message) }
  }

  const del = async (id) => {
    if (!confirm('Delete this student?')) return
    await api.del(`/admin/students/${id}`)
    load()
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <h2>Students <span className="muted" style={{ fontSize: '.8rem' }}>({items.length} / 4000)</span></h2>
      <div className="card">
        <h3>Add student</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Login email and default password are auto-generated from the roll number.
        </p>
        <form onSubmit={submit}>
          <div className="grid grid-2">
            <div className="field"><label>Name</label><input required value={form.name} onChange={set('name')}/></div>
            <div className="field"><label>Roll number</label><input required value={form.roll_number} onChange={set('roll_number')}/></div>
            <div className="field">
              <label>Class</label>
              <select required value={form.class_id} onChange={set('class_id')}>
                <option value="">— Select —</option>
                {classes.map(c => <option key={c.id} value={c.id}>Grade {c.grade} - {c.section}</option>)}
              </select>
            </div>
            <div className="field"><label>DOB</label><input type="date" value={form.dob} onChange={set('dob')}/></div>
            <div className="field"><label>Phone</label><input value={form.phone} onChange={set('phone')}/></div>
          </div>
          <div className="field"><label>Address</label><textarea rows={2} value={form.address} onChange={set('address')}/></div>

          <h4 style={{ marginBottom: '.5rem' }}>Father</h4>
          <div className="grid grid-3">
            <div className="field"><label>Name</label><input value={form.father_name} onChange={set('father_name')}/></div>
            <div className="field"><label>Phone</label><input value={form.father_phone} onChange={set('father_phone')}/></div>
            <div className="field"><label>Email</label><input type="email" value={form.father_email} onChange={set('father_email')}/></div>
          </div>

          <h4 style={{ marginBottom: '.5rem' }}>Mother</h4>
          <div className="grid grid-3">
            <div className="field"><label>Name</label><input value={form.mother_name} onChange={set('mother_name')}/></div>
            <div className="field"><label>Phone</label><input value={form.mother_phone} onChange={set('mother_phone')}/></div>
            <div className="field"><label>Email</label><input type="email" value={form.mother_email} onChange={set('mother_email')}/></div>
          </div>

          {error && <div className="error">{error}</div>}
          {created && (
            <div className="card" style={{ background: 'var(--bg)', marginTop: '.5rem' }}>
              <strong>Student created.</strong>
              <div>Login email: <code>{created.email}</code></div>
              <div>Default password: <code>{created.default_password}</code></div>
              <small className="muted">They will be required to change it on first login.</small>
            </div>
          )}
          <button>Add student</button>
        </form>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Roll</th><th>Name</th><th>Login email</th><th>Class</th><th>Father</th><th>Mother</th><th>Phone</th><th></th></tr></thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id}>
                <td>{s.roll_number}</td><td>{s.name}</td><td>{s.email}</td>
                <td>{s.class_label || '—'}</td>
                <td>{s.father_name || '—'}</td>
                <td>{s.mother_name || '—'}</td>
                <td>{s.phone || '—'}</td>
                <td><button className="danger small" onClick={() => del(s.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
