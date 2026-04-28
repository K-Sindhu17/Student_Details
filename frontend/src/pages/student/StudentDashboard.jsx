import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null)
  useEffect(() => {
    api.get('/student/profile').then(setProfile)
  }, [])
  if (!profile) return <div className="loading">Loading...</div>

  const hasFather = !!profile.father_name
  const hasMother = !!profile.mother_name

  return (
    <>
      <h2>My Profile</h2>
      <div className="card">
        <div className="grid grid-2">
          <Field label="Name" value={profile.name} />
          <Field label="Email" value={profile.email} />
          <Field label="Roll number" value={profile.roll_number} />
          <Field label="Class" value={profile.class_label || '—'} />
          <Field label="DOB" value={profile.dob ? new Date(profile.dob).toLocaleDateString() : '—'} />
          <Field label="Phone" value={profile.phone || '—'} />
        </div>
        <Field label="Address" value={profile.address || '—'} />
      </div>

      {!hasFather && !hasMother ? (
        <div className="card">
          <h3>Parents</h3>
          <p className="muted">No parent details linked yet. Ask the admin.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {hasFather && (
            <ParentCard
              title="Father"
              name={profile.father_name}
              email={profile.father_email}
              phone={profile.father_phone}
            />
          )}
          {hasMother && (
            <ParentCard
              title="Mother"
              name={profile.mother_name}
              email={profile.mother_email}
              phone={profile.mother_phone}
            />
          )}
        </div>
      )}
    </>
  )
}

function ParentCard({ title, name, email, phone }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="grid grid-2">
        <Field label="Name" value={name || '—'} />
        <Field label="Phone" value={phone || '—'} />
        <Field label="Email" value={email || '—'} />
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div>{value}</div>
    </div>
  )
}
