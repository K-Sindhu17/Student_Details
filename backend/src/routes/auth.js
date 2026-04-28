const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { signToken, setAuthCookie, clearAuthCookie, requireAuth } = require('../middleware/auth');

const router = express.Router();
const SCHOOL_DOMAIN = process.env.SCHOOL_DOMAIN || 'zphsparmalla.in';

const TABLES = {
  admin: 'admins',
  teacher: 'teachers',
  student: 'students',
};

// Build the email from a role-specific identifier
function emailFor(role, identifier) {
  const id = String(identifier).trim().toLowerCase();
  if (role === 'student' || role === 'teacher') return `${id}@${SCHOOL_DOMAIN}`;
  return id; // admin uses real email
}

router.post('/login', async (req, res) => {
  const { identifier, password, role } = req.body || {};
  if (!identifier || !password || !role) {
    return res.status(400).json({ error: 'identifier, password, role required' });
  }
  const table = TABLES[role];
  if (!table) return res.status(400).json({ error: 'Invalid role' });

  const email = emailFor(role, identifier);

  try {
    const [rows] = await query(
      `SELECT id, name, email, password, must_change_password
       FROM ${table} WHERE email = ? LIMIT 1`,
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, role, email: user.email, name: user.name });
    setAuthCookie(res, token);
    res.json({
      user: {
        id: user.id, name: user.name, email: user.email, role,
        must_change_password: user.must_change_password,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const table = TABLES[req.user.role];
  const [rows] = await query(
    `SELECT id, name, email, must_change_password FROM ${table} WHERE id = ? LIMIT 1`,
    [req.user.id]
  );
  if (rows.length === 0) return res.status(401).json({ error: 'User not found' });
  res.json({
    user: {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      role: req.user.role,
      must_change_password: rows[0].must_change_password,
    },
  });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const table = TABLES[req.user.role];
  const [rows] = await query(`SELECT password FROM ${table} WHERE id = ? LIMIT 1`, [req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(current_password, rows[0].password);
  if (!ok) return res.status(401).json({ error: 'Current password is wrong' });

  const hash = await bcrypt.hash(new_password, 10);
  await query(
    `UPDATE ${table} SET password = ?, must_change_password = FALSE WHERE id = ?`,
    [hash, req.user.id]
  );
  res.json({ ok: true });
});

module.exports = router;
