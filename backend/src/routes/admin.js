const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const SCHOOL_DOMAIN = process.env.SCHOOL_DOMAIN || 'zphsparmalla.in';

// ---- Classes ----
router.get('/classes', async (req, res) => {
  const [rows] = await query('SELECT * FROM classes ORDER BY grade, section');
  res.json(rows);
});

router.post('/classes', async (req, res) => {
  const { grade, section } = req.body;
  if (!grade || !section) return res.status(400).json({ error: 'grade and section required' });
  try {
    const [rows] = await query(
      'INSERT INTO classes (grade, section) VALUES (?, ?) RETURNING id',
      [grade, section]
    );
    res.status(201).json({ id: rows[0].id, grade, section });
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
            (c.grade || '-' || c.section) AS class_label
     FROM teachers t LEFT JOIN classes c ON c.id = t.class_id
     ORDER BY t.id DESC`
  );
  res.json(rows);
});

// Admin enters: name, teacher_id, [phone, class_id, subject]
// Backend derives email + sets default password = teacher_id, must_change = true
router.post('/teachers', async (req, res) => {
  const { name, teacher_id, phone, class_id, subject } = req.body;
  if (!name || !teacher_id) return res.status(400).json({ error: 'name and teacher_id required' });
  const tid = String(teacher_id).trim().toLowerCase();
  const email = `${tid}@${SCHOOL_DOMAIN}`;
  const hash = await bcrypt.hash(tid, 10);
  try {
    const [rows] = await query(
      `INSERT INTO teachers (name, teacher_id, email, password, phone, class_id, subject)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [name, tid, email, hash, phone || null, class_id || null, subject || null]
    );
    res.status(201).json({ id: rows[0].id, email, default_password: tid });
  } catch (e) {
    res.status(400).json({ error: e.code === '23505' ? 'Teacher ID or email already exists' : e.message });
  }
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
            (c.grade || '-' || c.section) AS class_label
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
    name, roll_number, class_id, dob, address, phone,
    father_name, father_phone, father_email,
    mother_name, mother_phone, mother_email,
  } = req.body;
  if (!name || !roll_number || !class_id) {
    return res.status(400).json({ error: 'name, roll_number, class_id required' });
  }
  const [countRows] = await query('SELECT COUNT(*)::int AS c FROM students');
  if (countRows[0].c >= 4000) {
    return res.status(400).json({ error: 'Student limit (4000) reached' });
  }

  const roll = String(roll_number).trim().toLowerCase();
  const email = `${roll}@${SCHOOL_DOMAIN}`;
  const hash = await bcrypt.hash(roll, 10);

  try {
    const [rows] = await query(
      `INSERT INTO students
        (name, roll_number, email, password, class_id, dob, address, phone,
         father_name, father_phone, father_email,
         mother_name, mother_phone, mother_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [name, roll, email, hash, class_id, dob || null, address || null, phone || null,
       father_name || null, father_phone || null, father_email ? father_email.toLowerCase() : null,
       mother_name || null, mother_phone || null, mother_email ? mother_email.toLowerCase() : null]
    );
    res.status(201).json({ id: rows[0].id, email, default_password: roll });
  } catch (e) {
    res.status(400).json({ error: e.code === '23505' ? 'Roll number or email already exists' : e.message });
  }
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
