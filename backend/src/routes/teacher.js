const express = require('express');
const { pool, query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('teacher'));

async function getTeacherClass(teacherId) {
  const [rows] = await query('SELECT class_id FROM teachers WHERE id = ?', [teacherId]);
  return rows[0]?.class_id || null;
}

router.get('/me/class', async (req, res) => {
  const [rows] = await query(
    `SELECT t.class_id, c.grade, c.section, t.subject
     FROM teachers t LEFT JOIN classes c ON c.id = t.class_id
     WHERE t.id = ?`,
    [req.user.id]
  );
  res.json(rows[0] || null);
});

router.get('/students', async (req, res) => {
  const classId = await getTeacherClass(req.user.id);
  if (!classId) return res.json([]);
  const [rows] = await query(
    'SELECT id, name, roll_number, email FROM students WHERE class_id = ? ORDER BY roll_number',
    [classId]
  );
  res.json(rows);
});

// ---- Attendance ----
router.post('/attendance', async (req, res) => {
  const { date, entries } = req.body;
  if (!date || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'date and entries[] required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const e of entries) {
      await client.query(
        `INSERT INTO attendance (student_id, date, status, marked_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
        [e.student_id, date, e.status, req.user.id]
      );
    }

    // Notify each student that attendance was marked for this date
    const dateLabel = new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    for (const e of entries) {
      await client.query(
        `INSERT INTO notifications (recipient_role, recipient_id, title, body, link)
         VALUES ('student', $1, $2, $3, $4)`,
        [e.student_id, `Attendance updated on ${dateLabel}`, `Your attendance for ${dateLabel} was marked: ${e.status}.`, '/student/attendance']
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true, count: entries.length });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

router.get('/attendance', async (req, res) => {
  const classId = await getTeacherClass(req.user.id);
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!classId) return res.json({ date, entries: [] });
  const [rows] = await query(
    `SELECT s.id AS student_id, s.name, s.roll_number, COALESCE(a.status, '') AS status
     FROM students s
     LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
     WHERE s.class_id = ?
     ORDER BY s.roll_number`,
    [date, classId]
  );
  res.json({ date, entries: rows });
});

// ---- Assignments / Quizzes ----
router.get('/assignments', async (req, res) => {
  const [rows] = await query(
    `SELECT a.id, a.title, a.description, a.due_at, a.duration_minutes, a.created_at,
            COUNT(DISTINCT q.id)::int  AS question_count,
            COUNT(DISTINCT s.id)::int  AS submission_count
     FROM assignments a
     LEFT JOIN questions q ON q.assignment_id = a.id
     LEFT JOIN submissions s ON s.assignment_id = a.id AND s.submitted_at IS NOT NULL
     WHERE a.teacher_id = ?
     GROUP BY a.id ORDER BY a.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

router.get('/assignments/:id', async (req, res) => {
  const [aRows] = await query(
    'SELECT * FROM assignments WHERE id = ? AND teacher_id = ?',
    [req.params.id, req.user.id]
  );
  if (aRows.length === 0) return res.status(404).json({ error: 'Not found' });
  const [qRows] = await query(
    'SELECT id, position, text, type, options, correct_answer, model_answer, points FROM questions WHERE assignment_id = ? ORDER BY position',
    [req.params.id]
  );
  res.json({ ...aRows[0], questions: qRows });
});

// Create assignment + questions. Body: { title, description, due_at, duration_minutes, questions: [{text, type, options, correct_answer, points}] }
router.post('/assignments', async (req, res) => {
  const classId = await getTeacherClass(req.user.id);
  if (!classId) return res.status(400).json({ error: 'No class assigned to teacher' });
  const { title, description, due_at, duration_minutes, questions } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'at least one question required' });
  }
  for (const q of questions) {
    if (!q.text || !q.type) return res.status(400).json({ error: 'each question needs text and type' });
    if (q.type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ error: 'MCQ needs at least 2 options' });
      }
      if (!q.correct_answer || !q.options.includes(q.correct_answer)) {
        return res.status(400).json({ error: 'MCQ correct_answer must match one of the options' });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const aResult = await client.query(
      `INSERT INTO assignments (class_id, teacher_id, title, description, due_at, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [classId, req.user.id, title, description || null, due_at || null, duration_minutes || null]
    );
    const assignmentId = aResult.rows[0].id;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await client.query(
        `INSERT INTO questions (assignment_id, position, text, type, options, correct_answer, model_answer, points)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          assignmentId, i, q.text, q.type,
          q.type === 'mcq' ? JSON.stringify(q.options) : null,
          q.type === 'mcq' ? q.correct_answer : null,
          q.type === 'short_answer' ? (q.model_answer || null) : null,
          q.points || 1,
        ]
      );
    }

    // Notify students
    const students = await client.query('SELECT id FROM students WHERE class_id = $1', [classId]);
    const dueText = due_at ? ` (due ${new Date(due_at).toLocaleString()})` : '';
    for (const s of students.rows) {
      await client.query(
        `INSERT INTO notifications (recipient_role, recipient_id, title, body, link)
         VALUES ('student', $1, $2, $3, $4)`,
        [s.id, `New quiz: ${title}`, `A new quiz "${title}" has been posted${dueText}.`, '/student/assignments']
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: assignmentId });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

router.delete('/assignments/:id', async (req, res) => {
  await query('DELETE FROM assignments WHERE id = ? AND teacher_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// Edit. Body: { title, description, scheduled_at, duration_minutes, questions? }
// If `questions` is provided, all existing questions are replaced.
// Question editing is rejected if any submission already exists.
router.put('/assignments/:id', async (req, res) => {
  const [own] = await query(
    'SELECT id FROM assignments WHERE id = ? AND teacher_id = ?',
    [req.params.id, req.user.id]
  );
  if (own.length === 0) return res.status(404).json({ error: 'Not found' });

  const { title, description, due_at, duration_minutes, questions } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  if (questions !== undefined) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'at least one question required' });
    }
    const [subCheck] = await query(
      'SELECT COUNT(*)::int AS c FROM submissions WHERE assignment_id = ?',
      [req.params.id]
    );
    if (subCheck[0].c > 0) {
      return res.status(400).json({ error: 'Cannot edit questions: students have already submitted' });
    }
    for (const q of questions) {
      if (!q.text || !q.type) return res.status(400).json({ error: 'each question needs text and type' });
      if (q.type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({ error: 'MCQ needs at least 2 options' });
        }
        if (!q.correct_answer || !q.options.includes(q.correct_answer)) {
          return res.status(400).json({ error: 'MCQ correct_answer must match one of the options' });
        }
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE assignments SET title=$1, description=$2, due_at=$3, duration_minutes=$4
       WHERE id=$5`,
      [title, description || null, due_at || null, duration_minutes || null, req.params.id]
    );
    if (questions !== undefined) {
      await client.query('DELETE FROM questions WHERE assignment_id = $1', [req.params.id]);
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await client.query(
          `INSERT INTO questions (assignment_id, position, text, type, options, correct_answer, model_answer, points)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            req.params.id, i, q.text, q.type,
            q.type === 'mcq' ? JSON.stringify(q.options) : null,
            q.type === 'mcq' ? q.correct_answer : null,
            q.type === 'short_answer' ? (q.model_answer || null) : null,
            q.points || 1,
          ]
        );
      }
    }

    // Notify students that the quiz was updated
    const aMeta = await client.query('SELECT class_id FROM assignments WHERE id = $1', [req.params.id]);
    const updClassId = aMeta.rows[0]?.class_id;
    if (updClassId) {
      const students = await client.query('SELECT id FROM students WHERE class_id = $1', [updClassId]);
      const dueText = due_at ? ` New due date: ${new Date(due_at).toLocaleString()}.` : '';
      for (const s of students.rows) {
        await client.query(
          `INSERT INTO notifications (recipient_role, recipient_id, title, body, link)
           VALUES ('student', $1, $2, $3, $4)`,
          [s.id, `Quiz updated: ${title}`, `The quiz "${title}" has been updated.${dueText}`, '/student/assignments']
        );
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

router.get('/assignments/:id/submissions', async (req, res) => {
  // Verify ownership
  const [own] = await query(
    'SELECT id FROM assignments WHERE id = ? AND teacher_id = ?',
    [req.params.id, req.user.id]
  );
  if (own.length === 0) return res.status(404).json({ error: 'Not found' });

  const [subs] = await query(
    `SELECT sub.id, sub.started_at, sub.submitted_at, sub.auto_score, sub.manual_score, sub.feedback,
            s.id AS student_id, s.name AS student_name, s.roll_number
     FROM submissions sub
     JOIN students s ON s.id = sub.student_id
     WHERE sub.assignment_id = ?
     ORDER BY s.roll_number`,
    [req.params.id]
  );

  // Fetch all answers + question info for these submissions
  const subIds = subs.map((s) => s.id);
  let answersBySub = {};
  if (subIds.length) {
    const placeholders = subIds.map((_, i) => `$${i + 1}`).join(',');
    const ansResult = await pool.query(
      `SELECT a.*, q.text AS question_text, q.type AS question_type, q.points AS question_points,
              q.correct_answer, q.model_answer, q.position
       FROM answers a JOIN questions q ON q.id = a.question_id
       WHERE a.submission_id IN (${placeholders})
       ORDER BY q.position`,
      subIds
    );
    for (const a of ansResult.rows) {
      (answersBySub[a.submission_id] ||= []).push(a);
    }
  }
  res.json(subs.map((s) => ({ ...s, answers: answersBySub[s.id] || [] })));
});

// Teacher grades a single text answer. Body: { points_earned, feedback? }
router.put('/answers/:id/grade', async (req, res) => {
  const { points_earned } = req.body;
  if (points_earned == null || points_earned < 0) {
    return res.status(400).json({ error: 'points_earned required (>= 0)' });
  }
  // Cap at the question's max points
  const [aRows] = await query(
    `SELECT a.id, q.points AS max_points, q.type
     FROM answers a JOIN questions q ON q.id = a.question_id
     WHERE a.id = ?`,
    [req.params.id]
  );
  if (aRows.length === 0) return res.status(404).json({ error: 'Answer not found' });
  if (aRows[0].type !== 'short_answer') {
    return res.status(400).json({ error: 'Only text answers can be manually graded' });
  }
  if (Number(points_earned) > Number(aRows[0].max_points)) {
    return res.status(400).json({ error: `Max ${aRows[0].max_points} points for this question` });
  }
  await query('UPDATE answers SET points_earned = ? WHERE id = ?', [points_earned, req.params.id]);

  // Recompute manual_score for this submission (sum of points_earned for non-MCQ answers)
  const [subLookup] = await query('SELECT submission_id FROM answers WHERE id = ?', [req.params.id]);
  if (subLookup[0]) {
    const subId = subLookup[0].submission_id;
    await query(
      `UPDATE submissions SET manual_score = (
         SELECT COALESCE(SUM(a.points_earned), 0)
         FROM answers a JOIN questions q ON q.id = a.question_id
         WHERE a.submission_id = ? AND q.type = 'short_answer'
       ) WHERE id = ?`,
      [subId, subId]
    );

    // Notify the student that their answer was graded
    const [info] = await query(
      `SELECT sub.student_id, a.title,
              COALESCE(sub.auto_score, 0) AS auto_score,
              COALESCE(sub.manual_score, 0) AS manual_score
       FROM submissions sub JOIN assignments a ON a.id = sub.assignment_id
       WHERE sub.id = ?`,
      [subId]
    );
    if (info[0]) {
      const total = Number(info[0].auto_score) + Number(info[0].manual_score);
      await query(
        `INSERT INTO notifications (recipient_role, recipient_id, title, body, link)
         VALUES ('student', ?, ?, ?, ?)`,
        [
          info[0].student_id,
          `Marks graded: ${info[0].title}`,
          `Your teacher graded an answer for "${info[0].title}". Your current score: ${total} points.`,
          '/student/assignments',
        ]
      );
    }
  }
  res.json({ ok: true });
});

// ---- Marks (separate from quiz scores) ----
router.post('/marks', async (req, res) => {
  const { student_id, subject, exam_type, marks, max_marks } = req.body;
  if (!student_id || !subject || marks == null) {
    return res.status(400).json({ error: 'student_id, subject, marks required' });
  }
  const examLabel = exam_type || 'term';
  const maxLabel = max_marks || 100;
  await query(
    `INSERT INTO marks (student_id, subject, exam_type, marks, max_marks)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (student_id, subject, exam_type)
     DO UPDATE SET marks = EXCLUDED.marks, max_marks = EXCLUDED.max_marks`,
    [student_id, subject, examLabel, marks, maxLabel]
  );
  await query(
    `INSERT INTO notifications (recipient_role, recipient_id, title, body, link)
     VALUES ('student', ?, ?, ?, ?)`,
    [student_id, `Marks updated: ${subject}`, `Your ${examLabel} marks for ${subject}: ${marks}/${maxLabel}.`, '/student/marks']
  );
  res.json({ ok: true });
});

router.get('/marks', async (req, res) => {
  const classId = await getTeacherClass(req.user.id);
  const [rows] = await query(
    `SELECT m.*, s.name AS student_name, s.roll_number
     FROM marks m JOIN students s ON s.id = m.student_id
     WHERE s.class_id = ?
     ORDER BY s.roll_number, m.subject`,
    [classId]
  );
  res.json(rows);
});

module.exports = router;
