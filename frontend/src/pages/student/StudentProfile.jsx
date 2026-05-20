import { useEffect, useState } from 'react'
import { api } from '../../api'
import Mascot from '../../components/Mascot.jsx'

export default function StudentProfile() {
  const [profile, setProfile] = useState(null)
  useEffect(() => {
    api.get('/student/profile').then(setProfile)
  }, [])
  if (!profile) return <div className="loading">Loading...</div>

  const hasFather = !!profile.father_name
  const hasMother = !!profile.mother_name

  return (
    <>
      <div className="hero">
        <div className="hero-mascot">
          <Mascot size={90} />
        </div>
        <div>
          <h2>My Profile</h2>
          <p>Everything about you, in one place. ✨</p>
        </div>
      </div>

      <div className="card">
        <h3>📇 About me</h3>
        <div className="grid grid-2">
          <Field label="Name" value={profile.name} />
          <Field label="School email" value={profile.email} />
          <Field label="Roll number" value={profile.roll_number} />
          <Field label="Class" value={profile.class_label || '—'} />
          <Field label="Date of birth" value={profile.dob ? new Date(profile.dob).toLocaleDateString() : '—'} />
          <Field label="Phone" value={profile.phone || '—'} />
        </div>
        <Field label="Address" value={profile.address || '—'} />
      </div>

      {!hasFather && !hasMother ? (
        <div className="card bg-yellow">
          <h3>👨‍👩‍👧 Parents</h3>
          <p style={{ color: '#7C2D12', fontWeight: 700, marginBottom: 0 }}>
            No parent details linked yet. Ask the admin to add them.
          </p>
        </div>
      ) : (
        <div className="grid grid-2">
          {hasFather && (
            <ParentCard
              title="👨 Father"
              accent="bg-sky"
              name={profile.father_name}
              email={profile.father_email}
              phone={profile.father_phone}
            />
          )}
          {hasMother && (
            <ParentCard
              title="👩 Mother"
              accent="bg-coral"
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

function ParentCard({ title, accent, name, email, phone }) {
  return (
    <div className={`card ${accent}`}>
      <h3>{title}</h3>
      <div className="grid grid-2">
        <Field label="Name"  value={name  || '—'} />
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
      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}
