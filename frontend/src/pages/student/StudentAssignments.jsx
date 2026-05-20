import { useEffect, useState, useRef } from 'react'
import { api } from '../../api'
import Confetti from '../../components/Confetti.jsx'

export default function StudentAssignments() {
  const [items, setItems] = useState([])
  const [openId, setOpenId] = useState(null)

  const load = () => api.get('/student/assignments').then(setItems)
  useEffect(() => { load() }, [])

  if (openId) return <TakeQuiz id={openId} onExit={() => { setOpenId(null); load() }} />

  return (
    <>
      <h2>Assignments / Quizzes</h2>
      {items.length === 0 ? (
        <div className="card"><p className="muted">No assignments yet.</p></div>
      ) : items.map(a => (
        <div key={a.id} className="card">
          <div className="row">
            <h3 style={{ margin: 0 }}>{a.title}</h3>
            <div className="spacer" />
            <StatusBadge status={a.status} />
          </div>
          {a.description && <p className="muted">{a.description}</p>}
          <p className="muted">
            Questions: {a.question_count} · Total points: {a.total_points}
            {a.due_at && ` · Deadline: ${new Date(a.due_at).toLocaleString()}`}
            {a.duration_minutes && ` · Time limit: ${a.duration_minutes} min`}
          </p>
          {a.status === 'submitted' && (
            <p>
              Auto-graded score (MCQ): <strong>{Number(a.auto_score ?? 0)}</strong>
              {a.manual_score != null && <> · Teacher-graded (text): <strong>{Number(a.manual_score)}</strong></>}
              {' · Total: '}<strong>{Number(a.auto_score ?? 0) + Number(a.manual_score ?? 0)}</strong> / {a.total_points}
            </p>
          )}
          {(a.status === 'available' || a.status === 'in_progress') && (
            <button onClick={() => setOpenId(a.id)}>
              {a.status === 'in_progress' ? 'Resume' : 'Start quiz'}
            </button>
          )}
          {a.status === 'submitted' && (
            <button className="secondary small" onClick={() => setOpenId(a.id)}>
              View results
            </button>
          )}
        </div>
      ))}
    </>
  )
}

function Results({ data, onExit }) {
  const ansById = Object.fromEntries((data.my_answers || []).map(a => [a.question_id, a]))
  const auto = Number(data.submission?.auto_score ?? 0)
  const manual = Number(data.submission?.manual_score ?? 0)
  const total = auto + manual
  const max = Number(data.total_points || 0)
  const pct = max > 0 ? ((total / max) * 100).toFixed(0) : '0'
  const hasUngradedText = data.questions.some(q =>
    q.type === 'short_answer' && (ansById[q.id]?.points_earned == null)
  )

  return (
    <>
      <button className="secondary" onClick={onExit}>← Back to assignments</button>
      <h2 style={{ marginBottom: '.25rem' }}>{data.title} — Results</h2>
      <p className="muted">
        Submitted {new Date(data.submission.submitted_at).toLocaleString()}
      </p>

      <div className="grid grid-4">
        <div className="card stat"><div className="num">{total}</div><div className="label">Your score</div></div>
        <div className="card stat"><div className="num">{max}</div><div className="label">Out of</div></div>
        <div className="card stat"><div className="num">{pct}%</div><div className="label">Percentage</div></div>
      </div>

      {hasUngradedText && (
        <div className="card" style={{ borderLeft: '4px solid var(--warn)' }}>
          <strong>Some text answers are awaiting teacher review.</strong>
          <div className="muted">Your final total may go up once they're graded.</div>
        </div>
      )}

      <div className="card">
        <h3>Question breakdown</h3>
        {data.questions.map((q, i) => {
          const a = ansById[q.id] || {}
          const userAns = a.student_answer
          let badge = null
          if (q.type === 'mcq') {
            badge = a.is_correct
              ? <span className="tag-present">✓ Correct</span>
              : <span className="tag-absent">✗ Wrong</span>
          } else if (a.points_earned != null) {
            badge = <span className="tag-present">Graded: {Number(a.points_earned)} / {q.points}</span>
          } else {
            badge = <span className="tag-late">Pending teacher review</span>
          }
          return (
            <div key={q.id} className="card" style={{ background: 'var(--bg)' }}>
              <div className="row">
                <strong>Q{i + 1}. {q.text}</strong>
                <div className="spacer" />
                {badge}
              </div>
              <div className="muted" style={{ marginTop: '.4rem' }}>Worth: {q.points} point{q.points !== 1 ? 's' : ''}</div>
              <div style={{ marginTop: '.5rem' }}>
                <div><strong>Your answer:</strong> {userAns ? userAns : <em className="muted">(blank)</em>}</div>
                {q.type === 'mcq' && a.is_correct === false && (
                  <div><strong>Correct answer:</strong> {q.correct_answer}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function StatusBadge({ status }) {
  const map = {
    available:   { text: 'Available', cls: 'tag-present' },
    in_progress: { text: 'In progress', cls: 'tag-late' },
    submitted:   { text: 'Submitted', cls: 'tag-present' },
    time_up:     { text: 'Time up', cls: 'tag-absent' },
    closed:      { text: 'Closed (past deadline)', cls: 'tag-absent' },
  }
  const s = map[status] || { text: status, cls: '' }
  return <span className={s.cls}>{s.text}</span>
}

function TakeQuiz({ id, onExit }) {
  const [data, setData] = useState(null)
  const [answers, setAnswers] = useState({}) // { question_id: value }
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [celebrate, setCelebrate] = useState(false)
  const tickRef = useRef()

  const fetchQuiz = async () => {
    const d = await api.get(`/student/assignments/${id}`)
    setData(d)
    if (d.my_answers?.length) {
      setAnswers(Object.fromEntries(d.my_answers.map(a => [a.question_id, a.student_answer])))
    }
    return d
  }

  useEffect(() => { fetchQuiz() }, [id])

  // Countdown ticker
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  if (!data) return <div className="loading">Loading...</div>

  if (data.status === 'submitted') {
    return <Results data={data} onExit={onExit} />
  }
  if (data.status === 'closed') {
    return (
      <>
        <button className="secondary" onClick={onExit}>← Back</button>
        <div className="card"><h3>Closed</h3><p>The deadline ({new Date(data.due_at).toLocaleString()}) has passed. You can no longer take this quiz.</p></div>
      </>
    )
  }

  // If not started yet, show Start button
  if (!data.submission?.started_at) {
    return (
      <>
        <button className="secondary" onClick={onExit}>← Back</button>
        <div className="card">
          <h2>{data.title}</h2>
          {data.description && <p>{data.description}</p>}
          <p className="muted">
            {data.questions.length} questions
            {data.duration_minutes && ` · You will have ${data.duration_minutes} minutes once you click Start`}
          </p>
          <button onClick={async () => {
            try {
              await api.post(`/student/assignments/${id}/start`, {})
              fetchQuiz()
            } catch (e) { setError(e.message) }
          }}>Start quiz</button>
          {error && <div className="error">{error}</div>}
        </div>
      </>
    )
  }

  // Quiz in progress — effective deadline is min(start + duration, overall due_at)
  const startedAt = new Date(data.submission.started_at).getTime()
  const durationDeadline = data.duration_minutes ? startedAt + data.duration_minutes * 60_000 : null
  const overallDeadline = data.due_at ? new Date(data.due_at).getTime() : null
  const candidates = [durationDeadline, overallDeadline].filter(x => x != null)
  const dueAt = candidates.length ? Math.min(...candidates) : null
  const remaining = dueAt ? Math.max(0, dueAt - now) : null

  // Auto-submit when time hits zero
  if (dueAt && remaining === 0 && !submitting) {
    submit(true)
  }

  async function submit(auto = false) {
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        answers: data.questions.map(q => ({
          question_id: q.id,
          student_answer: answers[q.id] ?? null,
        })),
      }
      await api.post(`/student/assignments/${id}/submit`, payload)
      // Re-fetch so we get the now-revealed correct answers + per-question results
      await fetchQuiz()
      setCelebrate(true)
      setSubmitting(false)
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <>
      <Confetti fire={celebrate} onDone={() => setCelebrate(false)} />
      <div className="row">
        <h2 style={{ margin: 0 }}>{data.title}</h2>
        <div className="spacer" />
        {dueAt && (
          <span className={remaining < 60_000 ? 'tag-absent' : 'tag-late'} style={{ fontSize: '1.1rem' }}>
            ⏱ {fmtTime(remaining)}
          </span>
        )}
      </div>
      {data.description && <p className="muted">{data.description}</p>}

      {data.questions.map((q, i) => (
        <div className="card" key={q.id}>
          <strong>Q{i + 1}. {q.text}</strong>
          <p className="muted" style={{ margin: '.25rem 0' }}>{q.points} point{q.points !== 1 ? 's' : ''} · {q.type === 'mcq' ? 'Choose one' : 'Type your answer'}</p>
          {q.type === 'mcq' ? (
            <div>
              {(q.options || []).map(opt => (
                <label key={opt} style={{ display: 'block', cursor: 'pointer', padding: '.4rem 0' }}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                    style={{ width: 'auto', marginRight: '.5rem' }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <textarea rows={3} value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
          )}
        </div>
      ))}

      {error && <div className="error">{error}</div>}
      <div className="row">
        <button onClick={() => submit(false)} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit quiz'}
        </button>
        <button type="button" className="secondary" onClick={onExit}>Save & exit</button>
      </div>
    </>
  )
}
