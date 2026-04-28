import { useEffect, useState } from 'react'
import { api } from '../../api'



const blankMcq = () => ({ text: '', type: 'mcq', options: ['', ''], correct_answer: '', model_answer: '', points: 1 })
const blankText = () => ({ text: '', type: 'short_answer', options: [], correct_answer: '', model_answer: '', points: 1 })

// Convert a UTC ISO timestamp from the API into the value format expected
// by <input type="datetime-local"> (YYYY-MM-DDTHH:mm in the user's local time).
function toLocalDatetime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TeacherAssignments() {
  const [items, setItems] = useState([])
  const [view, setView] = useState({ mode: 'list' }) // list | form | submissions

  const load = () => api.get('/teacher/assignments').then(setItems)
  useEffect(() => { load() }, [])

  const del = async (id) => {
    if (!confirm('Delete this assignment? All submissions and answers will also be deleted.')) return
    await api.del(`/teacher/assignments/${id}`)
    load()
  }

  if (view.mode === 'form')        return <AssignmentForm editId={view.id} onDone={() => { setView({ mode: 'list' }); load() }} onCancel={() => setView({ mode: 'list' })} />
  if (view.mode === 'submissions') return <Submissions assignmentId={view.id} onBack={() => setView({ mode: 'list' })} />

  return (
    <>
      <div className="row">
        <h2>Assignments / Quizzes</h2>
        <div className="spacer" />
        <button onClick={() => setView({ mode: 'form' })}>+ New assignment</button>
      </div>
      {items.length === 0 ? (
        <div className="card"><p className="muted">No assignments yet.</p></div>
      ) : (
        <div className="card">
          <table>
            <thead><tr><th>Title</th><th>Questions</th><th>Deadline</th><th>Duration</th><th>Submissions</th><th></th></tr></thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.question_count}</td>
                  <td>{a.due_at ? new Date(a.due_at).toLocaleString() : 'No deadline'}</td>
                  <td>{a.duration_minutes ? `${a.duration_minutes} min` : 'No limit'}</td>
                  <td>{a.submission_count}</td>
                  <td>
                    <div className="row" style={{ gap: '.4rem', justifyContent: 'flex-end' }}>
                      <button className="small" onClick={() => setView({ mode: 'submissions', id: a.id })}>View</button>
                      <button className="secondary small" onClick={() => setView({ mode: 'form', id: a.id })}>Edit</button>
                      <button className="danger small" onClick={() => del(a.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function AssignmentForm({ editId, onDone, onCancel }) {
  const isEdit = editId != null
  const [meta, setMeta] = useState({ title: '', description: '', due_at: '', duration_minutes: '' })
  const [questions, setQuestions] = useState([blankMcq()])
  const [questionsLocked, setQuestionsLocked] = useState(false) // true if submissions exist
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // Load existing assignment for edit mode
  useEffect(() => {
    if (!isEdit) return
    Promise.all([
      api.get(`/teacher/assignments/${editId}`),
      api.get('/teacher/assignments'), // for submission count
    ]).then(([a, list]) => {
      const summary = list.find(x => x.id === editId)
      setQuestionsLocked((summary?.submission_count || 0) > 0)
      setMeta({
        title: a.title || '',
        description: a.description || '',
        due_at: toLocalDatetime(a.due_at),
        duration_minutes: a.duration_minutes || '',
      })
      setQuestions((a.questions || []).map(q => ({
        text: q.text,
        type: q.type,
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        model_answer: q.model_answer || '',
        points: Number(q.points) || 1,
      })))
    }).finally(() => setLoading(false))
  }, [editId])

  const updateQ = (i, patch) => setQuestions(qs => qs.map((q, j) => j === i ? { ...q, ...patch } : q))
  const removeQ = (i) => setQuestions(qs => qs.filter((_, j) => j !== i))
  const addOption = (i) => updateQ(i, { options: [...questions[i].options, ''] })
  const removeOption = (i, oi) => {
    const opts = questions[i].options.filter((_, j) => j !== oi)
    updateQ(i, { options: opts, correct_answer: opts.includes(questions[i].correct_answer) ? questions[i].correct_answer : '' })
  }
  const setOption = (i, oi, val) => {
    const opts = [...questions[i].options]
    const old = opts[oi]
    opts[oi] = val
    const patch = { options: opts }
    if (questions[i].correct_answer === old) patch.correct_answer = val
    updateQ(i, patch)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!questionsLocked) {
      if (questions.length === 0) return setError('Add at least one question')
      for (const q of questions) {
        if (!q.text.trim()) return setError('Every question needs text')
        if (q.type === 'mcq') {
          const opts = q.options.filter(o => o.trim())
          if (opts.length < 2) return setError('MCQ needs at least 2 options')
          if (!q.correct_answer || !opts.includes(q.correct_answer)) return setError('Pick a correct answer for each MCQ')
        }
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        title: meta.title,
        description: meta.description,
        // datetime-local gives us a local wall-clock string (no tz). Convert to UTC ISO
        // so the round-trip through Postgres preserves the moment the teacher meant.
        due_at: meta.due_at ? new Date(meta.due_at).toISOString() : null,
        duration_minutes: meta.duration_minutes ? Number(meta.duration_minutes) : null,
      }
      if (!questionsLocked) {
        payload.questions = questions.map(q => ({
          text: q.text,
          type: q.type,
          options: q.type === 'mcq' ? q.options.filter(o => o.trim()) : null,
          correct_answer: q.type === 'mcq' ? q.correct_answer : null,
          model_answer: q.type === 'short_answer' ? (q.model_answer || null) : null,
          points: Number(q.points) || 1,
        }))
      }
      if (isEdit) await api.put(`/teacher/assignments/${editId}`, payload)
      else await api.post('/teacher/assignments', payload)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <>
      <div className="row">
        <h2>{isEdit ? 'Edit assignment' : 'New assignment / quiz'}</h2>
        <div className="spacer" />
        <button className="secondary" onClick={onCancel}>Cancel</button>
      </div>
      <form onSubmit={submit}>
        <div className="card">
          <h3>Details</h3>
          <div className="field"><label>Title</label><input required value={meta.title} onChange={e => setMeta({ ...meta, title: e.target.value })} /></div>
          <div className="field"><label>Description (optional)</label><textarea rows={2} value={meta.description} onChange={e => setMeta({ ...meta, description: e.target.value })} /></div>
          <div className="grid grid-2">
            <div className="field">
              <label>Deadline (students must submit before)</label>
              <input type="datetime-local" value={meta.due_at} onChange={e => setMeta({ ...meta, due_at: e.target.value })} />
              <small className="muted">Leave empty = no deadline.</small>
            </div>
            <div className="field">
              <label>Duration in minutes</label>
              <input type="number" min="1" value={meta.duration_minutes} onChange={e => setMeta({ ...meta, duration_minutes: e.target.value })} placeholder="e.g. 20" />
              <small className="muted">Leave empty = no time limit.</small>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="row">
            <h3>Questions ({questions.length})</h3>
            <div className="spacer" />
            {!questionsLocked && (
              <>
                <button type="button" className="secondary small" onClick={() => setQuestions([...questions, blankMcq()])}>+ MCQ</button>
                <button type="button" className="secondary small" onClick={() => setQuestions([...questions, blankText()])}>+ Text</button>
              </>
            )}
          </div>

          {questionsLocked && (
            <div className="card" style={{ background: 'var(--bg)', borderLeft: '4px solid var(--warn)' }}>
              <strong>Questions are locked.</strong>
              <div className="muted">Students have already submitted. Editing questions would invalidate their answers. To change questions, delete this assignment and create a new one.</div>
            </div>
          )}

          {questions.map((q, i) => (
            <div key={i} className="card" style={{ background: 'var(--bg)' }}>
              <div className="row">
                <strong>Q{i + 1} · {q.type === 'mcq' ? 'Multiple choice' : 'Short answer'}</strong>
                <div className="spacer" />
                {!questionsLocked && (
                  <button type="button" className="danger small" onClick={() => removeQ(i)}>Remove</button>
                )}
              </div>
              <div className="field">
                <label>Question text</label>
                <textarea rows={2} value={q.text} onChange={e => updateQ(i, { text: e.target.value })} disabled={questionsLocked} />
              </div>
              <div className="field">
                <label>Points</label>
                <input type="number" min="0" step="0.5" style={{ width: 100 }} value={q.points} onChange={e => updateQ(i, { points: e.target.value })} disabled={questionsLocked} />
              </div>

              {q.type === 'mcq' && (
                <>
                  <label>Options (mark the correct one)</label>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="row" style={{ marginBottom: '.4rem' }}>
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={q.correct_answer === opt && opt !== ''}
                        onChange={() => updateQ(i, { correct_answer: opt })}
                        disabled={questionsLocked}
                        style={{ width: 'auto' }}
                      />
                      <input value={opt} onChange={e => setOption(i, oi, e.target.value)} placeholder={`Option ${oi + 1}`} disabled={questionsLocked} />
                      {!questionsLocked && q.options.length > 2 && <button type="button" className="danger small" onClick={() => removeOption(i, oi)}>×</button>}
                    </div>
                  ))}
                  {!questionsLocked && <button type="button" className="secondary small" onClick={() => addOption(i)}>+ Add option</button>}
                </>
              )}

              {q.type === 'short_answer' && (
                <div className="field">
                  <label>Model answer (optional, only visible to teacher when grading)</label>
                  <textarea
                    rows={2}
                    value={q.model_answer}
                    onChange={e => updateQ(i, { model_answer: e.target.value })}
                    disabled={questionsLocked}
                    placeholder="Reference answer to compare student responses against"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div className="error">{error}</div>}
        <div className="row">
          <button disabled={submitting}>
            {submitting ? 'Saving...' : (isEdit ? 'Save changes' : 'Create')}
          </button>
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </>
  )
}

function Submissions({ assignmentId, onBack }) {
  const [subs, setSubs] = useState(null)
  const [error, setError] = useState('')

  const load = () => api.get(`/teacher/assignments/${assignmentId}/submissions`).then(setSubs).catch(e => setError(e.message))
  useEffect(() => { load() }, [assignmentId])

  const grade = async (answerId, points_earned) => {
    await api.put(`/teacher/answers/${answerId}/grade`, { points_earned: Number(points_earned) })
    load()
  }

  if (!subs) return <div className="loading">Loading...</div>

  return (
    <>
      <div className="row">
        <button className="secondary" onClick={onBack}>← Back</button>
        <div className="spacer" />
      </div>
      <h2>Submissions</h2>
      {error && <div className="error">{error}</div>}
      {subs.length === 0 ? <div className="card"><p className="muted">No submissions yet.</p></div> : (
        subs.map(sub => (
          <div className="card" key={sub.id}>
            <h3>{sub.roll_number} · {sub.student_name}</h3>
            <p className="muted">
              {sub.submitted_at ? `Submitted ${new Date(sub.submitted_at).toLocaleString()}` : 'In progress'}
              {sub.auto_score != null && ` · Auto: ${Number(sub.auto_score)}`}
              {sub.manual_score != null && ` · Manual: ${Number(sub.manual_score)}`}
            </p>
            <table>
              <thead><tr><th>Q</th><th>Question</th><th>Answer</th><th>Correct</th><th>Points</th><th></th></tr></thead>
              <tbody>
                {sub.answers.map(a => (
                  <AnswerRow key={a.id} ans={a} onGrade={grade} />
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </>
  )
}

function AnswerRow({ ans, onGrade }) {
  const isMcq = ans.question_type === 'mcq'
  const isGraded = !isMcq && ans.points_earned != null
  const [editing, setEditing] = useState(!isGraded)
  const [pts, setPts] = useState(ans.points_earned ?? '')
  const [saving, setSaving] = useState(false)

  // If the underlying graded value changes (e.g., parent reload), reset local state
  useEffect(() => {
    setPts(ans.points_earned ?? '')
    setEditing(ans.points_earned == null && !isMcq)
  }, [ans.points_earned, isMcq])

  const save = async () => {
    setSaving(true)
    try {
      await onGrade(ans.id, pts)
      setEditing(false)
    } finally { setSaving(false) }
  }

  return (
    <tr>
      <td>{ans.position + 1}</td>
      <td style={{ maxWidth: 280 }}>{ans.question_text}</td>
      <td style={{ maxWidth: 280 }}>
        <div>{ans.student_answer || <em className="muted">(blank)</em>}</div>
        {!isMcq && ans.model_answer && (
          <div className="muted" style={{ marginTop: '.4rem', fontSize: '.8rem', borderLeft: '3px solid var(--primary)', paddingLeft: '.5rem' }}>
            <strong>Model answer:</strong> {ans.model_answer}
          </div>
        )}
      </td>
      <td>
        {isMcq
          ? (ans.is_correct === true ? <span className="tag-present">✓</span>
             : ans.is_correct === false ? <span className="tag-absent">✗ ({ans.correct_answer})</span>
             : '—')
          : (isGraded
              ? <span className="tag-present">Graded</span>
              : <span className="tag-late">Pending</span>)}
      </td>
      <td>
        {isMcq ? (
          `${ans.points_earned ?? 0} / ${ans.question_points}`
        ) : editing ? (
          <span className="row" style={{ gap: '.25rem' }}>
            <input style={{ width: 60 }} value={pts} onChange={e => setPts(e.target.value)} /> / {ans.question_points}
          </span>
        ) : (
          <span><strong>{Number(ans.points_earned)}</strong> / {ans.question_points}</span>
        )}
      </td>
      <td>
        {!isMcq && (editing
          ? <button className="small" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
          : <button className="secondary small" onClick={() => setEditing(true)}>Edit</button>
        )}
      </td>
    </tr>
  )
}
