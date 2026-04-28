const express = require('express');
const { pool, query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('student'));

router.get('/profile', async (req, res) => {
  const [rows] = await query(
    `SELECT s.id, s.name, s.email, s.roll_number, s.dob, s.address, s.phone,
            s.father_name, s.father_phone, s.father_email,
            s.mother_name, s.mother_phone, s.mother_email,
            (c.grade || '-' || c.section) AS class_label
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE s.id = ?`,
    [req.user.id]
  );
  res.json(rows[0] || null);
});

router.get('/attendance', async (req, res) => {
  const [records] = await query(
    'SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 60',
    [req.user.id]
  );
  const [summaryRows] = await query(
    `SELECT
       SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)::int AS present,
       SUM(CASE WHEN status='absent'  THEN 1 ELSE 0 END)::int AS absent,
       SUM(CASE WHEN status='late'    THEN 1 ELSE 0 END)::int AS late,
       COUNT(*)::int AS total
     FROM attendance WHERE student_id = ?`,
    [req.user.id]
  );
  res.json({ records, summary: summaryRows[0] });
});

router.get('/marks', async (req, res) => {
  const [rows] = await query(
    'SELECT subject, exam_type, marks, max_marks, recorded_at FROM marks WHERE student_id = ? ORDER BY recorded_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

// ---- Assignments / Quizzes ----

// Compute status helper: available / in_progress / submitted / time_up / closed
function computeStatus(a, sub) {
  const now = Date.now();
  const due = a.due_at ? new Date(a.due_at).getTime() : null;
  if (sub?.submitted_at) return 'submitted';
  if (sub?.started_at) {
    const started = new Date(sub.started_at).getTime();
    const durationDeadline = a.duration_minutes ? started + a.duration_minutes * 60_000 : null;
    // Effective deadline = min(duration deadline, overall due_at)
    const effective = [durationDeadline, due].filter(x => x != null).reduce((a, b) => Math.min(a, b), Infinity);
    if (effective !== Infinity && now > effective) return 'time_up';
    return 'in_progress';
  }
  // Not started yet
  if (due && now > due) return 'closed';
  return 'available';
}

router.get('/assignments', async (req, res) => {
  const [rows] = await query(
    `SELECT a.id, a.title, a.description, a.due_at, a.duration_minutes, a.created_at,
            COUNT(q.id)::int AS question_count,
            sub.id AS submission_id, sub.started_at, sub.submitted_at,
            sub.auto_score, sub.manual_score
     FROM assignments a
     LEFT JOIN questions q ON q.assignment_id = a.id
     LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
     JOIN students s ON s.class_id = a.class_id
     WHERE s.id = ?
     GROUP BY a.id, sub.id
     ORDER BY a.due_at NULLS LAST, a.created_at DESC`,
    [req.user.id, req.user.id]
  );
  // Add total points + status per row
  const ids = rows.map((r) => r.id);
  const totals = {};
  if (ids.length) {
    const ph = ids.map((_, i) => `$${i + 1}`).join(',');
    const r = await pool.query(
      `SELECT assignment_id, SUM(points)::numeric AS total FROM questions WHERE assignment_id IN (${ph}) GROUP BY assignment_id`,
      ids
    );
    for (const row of r.rows) totals[row.assignment_id] = Number(row.total);
  }
  res.json(rows.map((r) => ({
    ...r,
    total_points: totals[r.id] || 0,
    status: computeStatus(r, { started_at: r.started_at, submitted_at: r.submitted_at }),
  })));
});

// Get assignment to take. Returns questions WITHOUT correct_answer.
router.get('/assignments/:id', async (req, res) => {
  // Validate the assignment belongs to student's class
  const [aRows] = await query(
    `SELECT a.* FROM assignments a
     JOIN students s ON s.class_id = a.class_id
     WHERE a.id = ? AND s.id = ?`,
    [req.params.id, req.user.id]
  );
  if (aRows.length === 0) return res.status(404).json({ error: 'Not found' });
  const a = aRows[0];

  const [subRows] = await query(
    'SELECT id, started_at, submitted_at, auto_score, manual_score FROM submissions WHERE assignment_id = ? AND student_id = ?',
    [req.params.id, req.user.id]
  );
  const sub = subRows[0] || null;

  const status = computeStatus(a, sub);
  if (status === 'closed') {
    return res.json({ ...a, status, questions: [], submission: sub });
  }

  // After submission, reveal correct answers + per-question results
  const includeReveal = status === 'submitted';
  const cols = includeReveal
    ? 'id, position, text, type, options, points, correct_answer'
    : 'id, position, text, type, options, points';
  const [qRows] = await query(
    `SELECT ${cols} FROM questions WHERE assignment_id = ? ORDER BY position`,
    [req.params.id]
  );

  let myAnswers = [];
  if (sub) {
    const [ansRows] = await query(
      'SELECT question_id, student_answer, is_correct, points_earned FROM answers WHERE submission_id = ?',
      [sub.id]
    );
    myAnswers = ansRows;
  }

  // Compute total possible
  const totalPoints = qRows.reduce((sum, q) => sum + Number(q.points), 0);

  res.json({
    ...a,
    status,
    questions: qRows,
    submission: sub,
    my_answers: myAnswers,
    total_points: totalPoints,
  });
});

// Start the quiz: records started_at if not already.
router.post('/assignments/:id/start', async (req, res) => {
  const [aRows] = await query(
    `SELECT a.* FROM assignments a JOIN students s ON s.class_id = a.class_id
     WHERE a.id = ? AND s.id = ?`,
    [req.params.id, req.user.id]
  );
  if (aRows.length === 0) return res.status(404).json({ error: 'Not found' });
  const a = aRows[0];

  if (a.due_at && Date.now() > new Date(a.due_at).getTime()) {
    return res.status(400).json({ error: 'Deadline has passed; quiz is closed' });
  }

  // Insert or fetch submission
  const [existing] = await query(
    'SELECT id, started_at, submitted_at FROM submissions WHERE assignment_id = ? AND student_id = ?',
    [req.params.id, req.user.id]
  );
  if (existing[0]?.submitted_at) {
    return res.status(400).json({ error: 'Already submitted' });
  }
  if (existing[0]?.started_at) {
    return res.json({ submission_id: existing[0].id, started_at: existing[0].started_at });
  }
  const [r] = await query(
    `INSERT INTO submissions (assignment_id, student_id, started_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET started_at = CURRENT_TIMESTAMP RETURNING id, started_at`,
    [req.params.id, req.user.id]
  );
  res.json({ submission_id: r[0].id, started_at: r[0].started_at });
});

// Submit answers. Body: { answers: [{question_id, student_answer}] }
router.post('/assignments/:id/submit', async (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers[] required' });

  const [aRows] = await query(
    `SELECT a.* FROM assignments a JOIN students s ON s.class_id = a.class_id
     WHERE a.id = ? AND s.id = ?`,
    [req.params.id, req.user.id]
  );
  if (aRows.length === 0) return res.status(404).json({ error: 'Not found' });
  const a = aRows[0];

  const [subRows] = await query(
    'SELECT id, started_at, submitted_at FROM submissions WHERE assignment_id = ? AND student_id = ?',
    [req.params.id, req.user.id]
  );
  const sub = subRows[0];
  if (!sub) return res.status(400).json({ error: 'You must start the quiz first' });
  if (sub.submitted_at) return res.status(400).json({ error: 'Already submitted' });

  // Time check: enforce both the duration limit AND the overall deadline
  const now = Date.now();
  if (sub.started_at && a.duration_minutes) {
    const elapsedSec = (now - new Date(sub.started_at).getTime()) / 1000;
    if (elapsedSec > a.duration_minutes * 60 + 5) {
      return res.status(400).json({ error: 'Time is up' });
    }
  }
  if (a.due_at && now > new Date(a.due_at).getTime() + 5000) {
    return res.status(400).json({ error: 'Deadline has passed' });
  }

  const [questions] = await query(
    'SELECT id, type, correct_answer, points FROM questions WHERE assignment_id = ?',
    [req.params.id]
  );
  const qById = Object.fromEntries(questions.map((q) => [q.id, q]));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let autoScore = 0;
    for (const ans of answers) {
      const q = qById[ans.question_id];
      if (!q) continue;
      let isCorrect = null;
      let pointsEarned = null;
      if (q.type === 'mcq') {
        isCorrect = String(ans.student_answer).trim() === String(q.correct_answer).trim();
        pointsEarned = isCorrect ? Number(q.points) : 0;
        autoScore += pointsEarned;
      }
      await client.query(
        `INSERT INTO answers (submission_id, question_id, student_answer, is_correct, points_earned)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (submission_id, question_id)
         DO UPDATE SET student_answer = EXCLUDED.student_answer,
                       is_correct = EXCLUDED.is_correct,
                       points_earned = EXCLUDED.points_earned`,
        [sub.id, ans.question_id, ans.student_answer ?? null, isCorrect, pointsEarned]
      );
    }
    await client.query(
      'UPDATE submissions SET submitted_at = CURRENT_TIMESTAMP, auto_score = $1 WHERE id = $2',
      [autoScore, sub.id]
    );

    // Notify the teacher that owns this assignment
    const meta = await client.query(
      `SELECT a.teacher_id, a.title, s.roll_number, s.name
       FROM assignments a, students s
       WHERE a.id = $1 AND s.id = $2`,
      [req.params.id, req.user.id]
    );
    if (meta.rows[0]?.teacher_id) {
      const { teacher_id, title, roll_number, name } = meta.rows[0];
      await client.query(
        `INSERT INTO notifications (recipient_role, recipient_id, title, body, link)
         VALUES ('teacher', $1, $2, $3, $4)`,
        [teacher_id, `Roll ${roll_number} submitted: ${title}`, `${name} (Roll ${roll_number}) submitted the quiz "${title}".`, '/teacher/assignments']
      );
      console.log(`[notify] teacher ${teacher_id} <- "Roll ${roll_number} submitted: ${title}"`);
    } else {
      console.warn(`[notify] no teacher_id resolved for assignment ${req.params.id}, student ${req.user.id}`);
    }

    await client.query('COMMIT');
    res.json({ ok: true, auto_score: autoScore });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

router.get('/notifications', async (req, res) => {
  const [rows] = await query(
    `SELECT id, title, body, link, is_read, created_at FROM notifications
     WHERE recipient_role='student' AND recipient_id = ?
     ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

module.exports = router;
