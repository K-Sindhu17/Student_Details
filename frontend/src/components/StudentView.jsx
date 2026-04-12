import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function StudentView({ selectedClass, user, onNavigate, onEditStudent }) {
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('roll_number')
  const [sortOrder, setSortOrder] = useState('asc')
  const [filterSection, setFilterSection] = useState('')

  const isTeacherForClass = user && user.class === selectedClass;

  useEffect(() => {
    fetchStudents()
  }, [selectedClass])

  const fetchStudents = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/students?class=${selectedClass}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to fetch')

      setStudents(data.students)
      setSubjects(data.subjects || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return

    try {
      const res = await fetch(`${API_URL}/students/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')

      setStudents(students.filter(s => s.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const getMarkForSubject = (student, subject) => {
    const mark = student.marks.find(m => m.subject === subject)
    return mark ? mark.marks : '-'
  }

  const sortedStudents = [...students]
    .filter(s => !filterSection || s.section === filterSection)
    .sort((a, b) => {
      let valA, valB

      if (sortBy === 'name') {
        valA = a.name.toLowerCase()
        valB = b.name.toLowerCase()
      } else if (sortBy === 'roll_number') {
        valA = a.roll_number
        valB = b.roll_number
      } else if (sortBy === 'section') {
        valA = a.section
        valB = b.section
      } else if (sortBy === 'average') {
        valA = a.average
        valB = b.average
      } else {
        valA = getMarkForSubject(a, sortBy)
        valB = getMarkForSubject(b, sortBy)
        valA = valA === '-' ? -1 : valA
        valB = valB === '-' ? -1 : valB
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  const buildRows = () => {
    if (sortBy !== 'roll_number' || filterSection === '') return sortedStudents
    const rows = []
    const rollNos = sortedStudents.map(s => parseInt(s.roll_number)).filter(n => !isNaN(n))
    if (rollNos.length === 0) return sortedStudents
    const maxRoll = Math.max(...rollNos)
    const studentMap = {}
    sortedStudents.forEach(s => { studentMap[s.roll_number] = s })
    for (let i = 1; i <= maxRoll; i++) {
      const key = String(i)
      if (studentMap[key]) {
        rows.push(studentMap[key])
      } else {
        rows.push({ missing: true, roll_number: key })
      }
    }
    return rows
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="sort-icon">{'\u2195'}</span>
    return <span className="sort-icon active">{sortOrder === 'asc' ? '\u2191' : '\u2193'}</span>
  }

  return (
    <div className="student-view">
      <button className="back-btn" onClick={() => onNavigate('class')}>&larr; Back</button>

      <div className="view-header">
        <h2>Class {selectedClass} - Student Details</h2>
        <div className="view-controls">
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="section-filter"
          >
            <option value="">All Sections</option>
            {['A', 'B'].map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>
          <span className="student-count">{sortedStudents.length} students</span>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading students...</p>
        </div>
      ) : sortedStudents.length === 0 ? (
        <div className="empty-state">
          <p>No students found{filterSection ? ` in Section ${filterSection}` : ''}.</p>
          {isTeacherForClass && (
            <button className="submit-btn" onClick={() => onNavigate('enter')}>
              Add First Student
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th>Sl.No</th>
                <th onClick={() => handleSort('roll_number')} className="sortable">
                  Roll No <SortIcon field="roll_number" />
                </th>
                <th onClick={() => handleSort('name')} className="sortable">
                  Name <SortIcon field="name" />
                </th>
                <th onClick={() => handleSort('section')} className="sortable">
                  Section <SortIcon field="section" />
                </th>
                {subjects.map(sub => (
                  <th key={sub.name} onClick={() => handleSort(sub.name)} className="sortable">
                    {sub.name} <SortIcon field={sub.name} />
                  </th>
                ))}
                <th onClick={() => handleSort('average')} className="sortable">
                  Average <SortIcon field="average" />
                </th>
                {isTeacherForClass && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {buildRows().map((row, index) => (
                row.missing ? (
                  <tr key={`missing-${row.roll_number}`} className="missing-row">
                    <td>{index + 1}</td>
                    <td><span className="roll-number missing">{row.roll_number}</span></td>
                    <td colSpan={subjects.length + 3 + (isTeacherForClass ? 1 : 0)} className="missing-text">
                      Roll No {row.roll_number} — Not entered
                    </td>
                  </tr>
                ) : (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td><span className="roll-number">{row.roll_number}</span></td>
                  <td>{row.name}</td>
                  <td>{row.section}</td>
                  {subjects.map(sub => (
                    <td key={sub.name}>{getMarkForSubject(row, sub.name)}</td>
                  ))}
                  <td><strong>{row.average}</strong></td>
                  {isTeacherForClass && (
                    <td className="actions">
                      {row.section === user.section ? (
                        <>
                          <button
                            className="edit-btn"
                            onClick={() => onEditStudent(row)}
                          >
                            Edit
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(row.id, row.name)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="no-access">-</span>
                      )}
                    </td>
                  )}
                </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default StudentView
