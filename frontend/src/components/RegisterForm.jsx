import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function RegisterForm({ onLogin, onNavigate }) {
  const [form, setForm] = useState({
    name: '',
    teacher_id: '',
    password: '',
    class: '',
    section: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          class: parseInt(form.class)
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      onLogin(data.teacher)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-form-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Teacher Registration</h2>

        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Enter your full name"
          />
        </div>

        <div className="form-group">
          <label>Teacher ID</label>
          <input
            type="text"
            name="teacher_id"
            value={form.teacher_id}
            onChange={handleChange}
            required
            placeholder="Choose a unique Teacher ID"
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            placeholder="Min 6 characters"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Class</label>
            <select name="class" value={form.class} onChange={handleChange} required>
              <option value="">Select Class</option>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Class {i + 1}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Section</label>
            <select name="section" value={form.section} onChange={handleChange} required>
              <option value="">Select</option>
              {['A', 'B'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>

        <p className="auth-switch">
          Already have an account?{' '}
          <span onClick={() => onNavigate('login')}>Login here</span>
        </p>
      </form>
    </div>
  )
}

export default RegisterForm
