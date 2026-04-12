const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

const SUBJECTS = {
  lower: [
    { name: 'Maths', max: 100 },
    { name: 'Physical Activity', max: 100 },
    { name: 'Telugu', max: 100 },
    { name: 'English', max: 100 },
    { name: 'Drawing', max: 100 }
  ],
  upper: [
    { name: 'Maths', max: 100 },
    { name: 'Physics', max: 50 },
    { name: 'Biology', max: 50 },
    { name: 'Hindi', max: 100 },
    { name: 'Telugu', max: 100 },
    { name: 'English', max: 100 },
    { name: 'Social', max: 100 }
  ]
};

function getSubjects(classNum) {
  return classNum <= 5 ? SUBJECTS.lower : SUBJECTS.upper;
}

function getSubjectNames(classNum) {
  return getSubjects(classNum).map(s => s.name);
}

function getMaxMarks(classNum, subject) {
  const sub = getSubjects(classNum).find(s => s.name === subject);
  return sub ? sub.max : 100;
}

// Get subjects for a class
router.get('/subjects', (req, res) => {
  const classNum = parseInt(req.query.class);
  if (!classNum || classNum < 1 || classNum > 10) {
    return res.status(400).json({ error: 'Valid class (1-10) is required' });
  }
  res.json({ subjects: getSubjects(classNum).map(s => ({ name: s.name, max: s.max })) });
});

// Get all students for a class (public)
router.get('/students', async (req, res) => {
  try {
    const classNum = parseInt(req.query.class);
    if (!classNum || classNum < 1 || classNum > 10) {
      return res.status(400).json({ error: 'Valid class (1-10) is required' });
    }

    const [students] = await pool.query(
      'SELECT id, name, roll_number, class, section, created_at FROM students WHERE class = ? ORDER BY section, CAST(roll_number AS UNSIGNED), roll_number',
      [classNum]
    );

    if (students.length === 0) {
      return res.json({ students: [], subjects: getSubjects(classNum) });
    }

    const studentIds = students.map(s => s.id);
    const [allMarks] = await pool.query(
      'SELECT student_id, subject, marks FROM marks WHERE student_id IN (?)',
      [studentIds]
    );

    const marksMap = {};
    for (const m of allMarks) {
      if (!marksMap[m.student_id]) marksMap[m.student_id] = [];
      marksMap[m.student_id].push({ subject: m.subject, marks: Number(m.marks) });
    }

    const subjects = getSubjects(classNum);
    const subjectNames = subjects.map(s => s.name);
    const divisor = classNum > 5 ? subjects.length - 1 : subjects.length;
    const result = students.map(student => {
      const studentMarks = marksMap[student.id] || [];
      const total = studentMarks.reduce((sum, m) => sum + m.marks, 0);
      const average = studentMarks.length > 0 ? Math.round((total / divisor) * 100) / 100 : 0;
      return { ...student, marks: studentMarks, average };
    });

    res.json({ students: result, subjects: subjects.map(s => ({ name: s.name, max: s.max })) });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Create student (auth required)
router.post('/students', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, roll_number, section, marks } = req.body;
    const teacherClass = req.teacher.class;
    const teacherSection = req.teacher.section;

    if (!name || !roll_number || !section || !marks) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (section !== teacherSection) {
      return res.status(403).json({ error: 'You can only add students to your own section' });
    }

    const subjects = getSubjects(teacherClass);
    if (marks.length !== subjects.length) {
      return res.status(400).json({ error: `Expected ${subjects.length} subjects` });
    }

    for (const m of marks) {
      const maxMark = getMaxMarks(teacherClass, m.subject);
      if (m.marks < 0 || m.marks > maxMark) {
        return res.status(400).json({ error: `${m.subject} marks must be between 0 and ${maxMark}` });
      }
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO students (name, roll_number, class, section) VALUES (?, ?, ?, ?)',
      [name, roll_number, teacherClass, section]
    );

    const studentId = result.insertId;
    const markValues = marks.map(m => [studentId, m.subject, m.marks]);
    await conn.query(
      'INSERT INTO marks (student_id, subject, marks) VALUES ?',
      [markValues]
    );

    await conn.commit();

    res.status(201).json({ message: 'Student added successfully', studentId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A student with this roll number already exists in this class and section' });
    }
    console.error('Error creating student:', err);
    res.status(500).json({ error: 'Failed to add student' });
  } finally {
    conn.release();
  }
});

// Update student (auth required)
router.put('/students/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const studentId = parseInt(req.params.id);
    const { name, roll_number, section, marks } = req.body;

    const [existing] = await conn.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = existing[0];
    if (student.class !== req.teacher.class || student.section !== req.teacher.section) {
      return res.status(403).json({ error: 'You can only edit students in your own section' });
    }

    if (section && section !== req.teacher.section) {
      return res.status(403).json({ error: 'You can only assign students to your own section' });
    }

    const subjects = getSubjects(student.class);
    if (marks && marks.length !== subjects.length) {
      return res.status(400).json({ error: `Expected ${subjects.length} subjects` });
    }

    if (marks) {
      for (const m of marks) {
        const maxMark = getMaxMarks(student.class, m.subject);
        if (m.marks < 0 || m.marks > maxMark) {
          return res.status(400).json({ error: `${m.subject} marks must be between 0 and ${maxMark}` });
        }
      }
    }

    await conn.beginTransaction();

    await conn.query(
      'UPDATE students SET name = ?, roll_number = ? WHERE id = ?',
      [name || student.name, roll_number || student.roll_number, studentId]
    );

    if (marks) {
      await conn.query('DELETE FROM marks WHERE student_id = ?', [studentId]);
      const markValues = marks.map(m => [studentId, m.subject, m.marks]);
      await conn.query('INSERT INTO marks (student_id, subject, marks) VALUES ?', [markValues]);
    }

    await conn.commit();

    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A student with this roll number already exists in this class and section' });
    }
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Failed to update student' });
  } finally {
    conn.release();
  }
});

// Delete student (auth required)
router.delete('/students/:id', auth, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);

    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = existing[0];
    if (student.class !== req.teacher.class || student.section !== req.teacher.section) {
      return res.status(403).json({ error: 'You can only delete students in your own section' });
    }

    await pool.query('DELETE FROM students WHERE id = ?', [studentId]);

    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

module.exports = router;
