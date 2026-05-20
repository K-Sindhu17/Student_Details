const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const SCHOOL_DOMAIN = process.env.SCHOOL_DOMAIN || 'zphsparmalla.in';
const SCHOOL_CODE = process.env.SCHOOL_CODE || 'A61';

// SQL fragment that turns `c.grade` into a friendly text label (Nursery / LKG / UKG / N).
const GRADE_LABEL_SQL = `CASE c.grade WHEN -2 THEN 'Nursery' WHEN -1 THEN 'LKG' WHEN 0 THEN 'UKG' ELSE c.grade::text END`;
// Default section value — sections are not exposed to the user; every class is created under 'A'.
const DEFAULT_SECTION = 'A';

// Strip non-digits and pad to 3 digits.
function normalizeNumericId(raw) {
  const digits = String(raw).trim().toLowerCase().replace(/^t/, '').replace(/\D/g, '');
  return digits.padStart(3, '0');
}

// Validate teacher ID input: digits or t<digits>, 1-3 digits.
function validateTeacherIdInput(raw) {
  return /^t?\d{1,3}$/i.test(String(raw).trim());
}

// Validate roll number input: 1-4 digits only.
function validateRollNumberInput(raw) {
  return /^\d{1,4}$/.test(String(raw).trim());
}

// Parse a class text like "3", "10", "Nursery", "LKG", "UKG" → { grade, section }.
// Sections are not exposed to admins — every class lives under the default section.
function parseClassText(raw) {
  if (!raw) throw new Error('Class is required (e.g. 3 or Nursery)');
  const gradeText = String(raw).trim();
  const gLower = gradeText.toLowerCase();
  let grade;
  if (gLower === 'nursery' || gLower === 'n')      grade = -2;
  else if (gLower === 'lkg')                       grade = -1;
  else if (gLower === 'ukg')                       grade = 0;
  else if (/^\d+$/.test(gLower) && Number(gLower) >= 1 && Number(gLower) <= 10) grade = Number(gLower);
  else throw new Error(`Invalid class "${gradeText}". Use Nursery, LKG, UKG, or 1-10.`);
  return { grade, section: DEFAULT_SECTION };
}

// Look up a class by grade+section, or create it. Returns class id.
async function resolveOrCreateClass(raw) {
  const { grade, section } = parseClassText(raw);
  const [exist] = await query('SELECT id FROM classes WHERE grade = ? AND section = ?', [grade, section]);
  if (exist[0]) return exist[0].id;
  const [ins] = await query(
    'INSERT INTO classes (grade, section) VALUES (?, ?) RETURNING id',
    [grade, section]
  );
  return ins[0].id;
}

// Student email: {year}{schoolcode}st{roll3}@domain  e.g. 2026A61st001@zphsparmalla.in
function studentEmail(rollRaw, joinYear) {
  const roll3 = normalizeNumericId(rollRaw);
  return `${joinYear}${SCHOOL_CODE}st${roll3}@${SCHOOL_DOMAIN}`;
}

// Teacher email: {year}{schoolcode}tech{empId3}@domain  e.g. 2026A61tech001@zphsparmalla.in
function teacherEmail(teacherIdRaw, joinYear) {
  const id3 = normalizeNumericId(teacherIdRaw);
  return `${joinYear}${SCHOOL_CODE}tech${id3}@${SCHOOL_DOMAIN}`;
}

// ---- Classes ----
router.get('/classes', async (req, res) => {
  const [rows] = await query('SELECT * FROM classes ORDER BY grade, section');
  res.json(rows);
});

router.post('/classes', async (req, res) => {
  const { grade } = req.body;
  // grade is allowed to be 0 (UKG) or negative (Nursery -2, LKG -1) — only null/undefined is invalid.
  if (grade == null) return res.status(400).json({ error: 'grade required' });
  try {
    const [rows] = await query(
      'INSERT INTO classes (grade, section) VALUES (?, ?) RETURNING id',
      [Number(grade), DEFAULT_SECTION]
    );
    res.status(201).json({ id: rows[0].id, grade: Number(grade) });
  } catch (e) {
    res.status(400).json({ error: e.code === '23505' ? 'Class exists' : 'Failed' });
  }
});

router.delete('/classes/:id', async (req, res) => {
  await query('DELETE FROM classes WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ---- Teachers ----
router.get('/teachers', async (req, res) => {
  const [rows] = await query(
    `SELECT t.id, t.name, t.teacher_id, t.email, t.phone, t.subject, t.class_id,
            ${GRADE_LABEL_SQL} AS class_label
     FROM teachers t LEFT JOIN classes c ON c.id = t.class_id
     ORDER BY t.id DESC`
  );
  res.json(rows);
});

// Admin enters: name, teacher_id, [phone, class_id, subject]
// Backend derives email + sets default password = teacher_id, must_change = true
router.post('/teachers', async (req, res) => {
  const { name, teacher_id, phone, class: classText, subject } = req.body;
  if (!name || !teacher_id) return res.status(400).json({ error: 'name and teacher_id required' });
  if (!validateTeacherIdInput(teacher_id)) {
    return res.status(400).json({ error: 'Invalid teacher ID format. Use digits only (e.g. 1, 12, 100) or with a "t" prefix (e.g. t001).' });
  }
  let classId = null;
  if (classText) {
    try { classId = await resolveOrCreateClass(classText); }
    catch (e) { return res.status(400).json({ error: e.message }); }
  }
  const id3 = normalizeNumericId(teacher_id);
  const tid = `t${id3}`; // canonical teacher_id, e.g. t001
  const joinYear = new Date().getFullYear();
  const email = teacherEmail(teacher_id, joinYear);
  const hash = await bcrypt.hash(tid, 10);
  try {
    const [rows] = await query(
      `INSERT INTO teachers (name, teacher_id, email, password, phone, class_id, subject)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [name, tid, email, hash, phone || null, classId, subject || null]
    );
    res.status(201).json({ id: rows[0].id, teacher_id: tid, email, default_password: tid });
  } catch (e) {
    res.status(400).json({ error: e.code === '23505' ? 'Teacher ID or email already exists' : e.message });
  }
});

// Reset a teacher's password back to their teacher_id (forces a change on next login)
router.post('/teachers/:id/reset-password', async (req, res) => {
  const [rows] = await query('SELECT teacher_id FROM teachers WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
  const tid = rows[0].teacher_id;
  const hash = await bcrypt.hash(tid, 10);
  await query(
    'UPDATE teachers SET password = ?, must_change_password = TRUE WHERE id = ?',
    [hash, req.params.id]
  );
  res.json({ ok: true, default_password: tid });
});

router.put('/teachers/:id', async (req, res) => {
  const { name, phone, class_id, subject } = req.body;
  await query(
    'UPDATE teachers SET name=?, phone=?, class_id=?, subject=? WHERE id=?',
    [name, phone, class_id, subject, req.params.id]
  );
  res.json({ ok: true });
});

router.delete('/teachers/:id', async (req, res) => {
  await query('DELETE FROM teachers WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ---- Students ----
router.get('/students', async (req, res) => {
  const [rows] = await query(
    `SELECT s.id, s.name, s.email, s.roll_number, s.class_id,
            s.dob, s.address, s.phone,
            s.father_name, s.father_phone, s.father_email,
            s.mother_name, s.mother_phone, s.mother_email,
            ${GRADE_LABEL_SQL} AS class_label
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     ORDER BY s.id DESC`
  );
  res.json(rows);
});

// Admin enters: name, roll_number, class_id, [dob, address, phone, father_*, mother_*]
// Backend derives email + sets default password = roll_number, must_change = true
router.post('/students', async (req, res) => {
  const {
    name, roll_number, class: classText, dob, address, phone,
    father_name, father_phone, father_email,
    mother_name, mother_phone, mother_email,
  } = req.body;
  if (!name || !roll_number || !classText) {
    return res.status(400).json({ error: 'name, roll_number, and class are required' });
  }
  if (!validateRollNumberInput(roll_number)) {
    return res.status(400).json({ error: 'Invalid roll number format. Use digits only (e.g. 1, 25, 101).' });
  }
  let classId;
  try { classId = await resolveOrCreateClass(classText); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  const [countRows] = await query('SELECT COUNT(*)::int AS c FROM students');
  if (countRows[0].c >= 4000) {
    return res.status(400).json({ error: 'Student limit (4000) reached' });
  }

  const roll = normalizeNumericId(roll_number);
  const joinYear = new Date().getFullYear();
  const email = studentEmail(roll_number, joinYear);
  const hash = await bcrypt.hash(roll, 10);

  try {
    const [rows] = await query(
      `INSERT INTO students
        (name, roll_number, email, password, class_id, dob, address, phone,
         father_name, father_phone, father_email,
         mother_name, mother_phone, mother_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [name, roll, email, hash, classId, dob || null, address || null, phone || null,
       father_name || null, father_phone || null, father_email ? father_email.toLowerCase() : null,
       mother_name || null, mother_phone || null, mother_email ? mother_email.toLowerCase() : null]
    );
    res.status(201).json({ id: rows[0].id, roll_number: roll, email, default_password: roll });
  } catch (e) {
    res.status(400).json({ error: e.code === '23505' ? 'Roll number or email already exists' : e.message });
  }
});

// Reset a student's password back to their roll number (forces a change on next login)
router.post('/students/:id/reset-password', async (req, res) => {
  const [rows] = await query('SELECT roll_number FROM students WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });
  const roll = rows[0].roll_number;
  const hash = await bcrypt.hash(roll, 10);
  await query(
    'UPDATE students SET password = ?, must_change_password = TRUE WHERE id = ?',
    [hash, req.params.id]
  );
  res.json({ ok: true, default_password: roll });
});

router.put('/students/:id', async (req, res) => {
  const {
    name, roll_number, class_id, dob, address, phone,
    father_name, father_phone, father_email,
    mother_name, mother_phone, mother_email,
  } = req.body;
  await query(
    `UPDATE students SET name=?, roll_number=?, class_id=?, dob=?, address=?, phone=?,
            father_name=?, father_phone=?, father_email=?,
            mother_name=?, mother_phone=?, mother_email=? WHERE id=?`,
    [name, roll_number, class_id, dob || null, address || null, phone || null,
     father_name || null, father_phone || null, father_email ? father_email.toLowerCase() : null,
     mother_name || null, mother_phone || null, mother_email ? mother_email.toLowerCase() : null,
     req.params.id]
  );
  res.json({ ok: true });
});

router.delete('/students/:id', async (req, res) => {
  await query('DELETE FROM students WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ---- Reports ----
router.get('/reports/summary', async (req, res) => {
  const [counts] = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM students) AS students,
       (SELECT COUNT(*)::int FROM teachers) AS teachers,
       (SELECT COUNT(*)::int FROM classes)  AS classes`
  );
  const [attendance] = await query(
    `SELECT date,
       SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)::int AS present,
       SUM(CASE WHEN status='absent'  THEN 1 ELSE 0 END)::int AS absent
     FROM attendance
     WHERE date >= CURRENT_DATE - INTERVAL '7 days'
     GROUP BY date ORDER BY date`
  );
  res.json({ counts: counts[0], attendance });
});

module.exports = router;
