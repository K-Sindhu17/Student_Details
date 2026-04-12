const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
};

router.post('/register', async (req, res) => {
  try {
    const { name, teacher_id, password, class: teacherClass, section } = req.body;

    if (!name || !teacher_id || !password || !teacherClass || !section) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (teacherClass < 1 || teacherClass > 10) {
      return res.status(400).json({ error: 'Class must be between 1 and 10' });
    }

    if (!['A', 'B'].includes(section)) {
      return res.status(400).json({ error: 'Section must be A, B, C, or D' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM teachers WHERE class = ? AND section = ?',
      [teacherClass, section]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A teacher is already registered for this class and section' });
    }

    const [idCheck] = await pool.query(
      'SELECT id FROM teachers WHERE teacher_id = ?',
      [teacher_id]
    );
    if (idCheck.length > 0) {
      return res.status(409).json({ error: 'This Teacher ID is already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO teachers (name, teacher_id, password, class, section) VALUES (?, ?, ?, ?, ?)',
      [name, teacher_id, hashedPassword, teacherClass, section]
    );

    const token = jwt.sign(
      { id: result.insertId, name, teacher_id, class: teacherClass, section },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({
      message: 'Registration successful',
      teacher: { id: result.insertId, name, teacher_id, class: teacherClass, section }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { teacher_id, password } = req.body;

    if (!teacher_id || !password) {
      return res.status(400).json({ error: 'Teacher ID and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM teachers WHERE teacher_id = ?', [teacher_id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Teacher ID or password' });
    }

    const teacher = rows[0];
    const validPassword = await bcrypt.compare(password, teacher.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid Teacher ID or password' });
    }

    const token = jwt.sign(
      { id: teacher.id, name: teacher.name, teacher_id: teacher.teacher_id, class: teacher.class, section: teacher.section },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({
      teacher: { id: teacher.id, name: teacher.name, teacher_id: teacher.teacher_id, class: teacher.class, section: teacher.section }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.json({ teacher: null });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      teacher: { id: decoded.id, name: decoded.name, teacher_id: decoded.teacher_id, class: decoded.class, section: decoded.section }
    });
  } catch (err) {
    res.clearCookie('token', { path: '/' });
    res.json({ teacher: null });
  }
});

module.exports = router;
