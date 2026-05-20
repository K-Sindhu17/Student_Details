const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { signToken, setAuthCookie, clearAuthCookie, requireAuth } = require('../middleware/auth');

const router = express.Router();

const TABLES = {
  admin: 'admins',
  teacher: 'teachers',
  student: 'students',
};

// All roles look up by email.
function lookupFor(role, identifier) {
  const v = String(identifier).trim().toLowerCase();
  return { column: 'email', value: v };
}

router.post('/login', async (req, res) => {
  const { identifier, password, role } = req.body || {};
  if (!identifier || !password || !role) {
    return res.status(400).json({ error: 'identifier, password, role required' });
  }
  const table = TABLES[role];
  if (!table) return res.status(400).json({ error: 'Invalid role' });

  const { column, value } = lookupFor(role, identifier);

  try {
    const [rows] = await query(
      `SELECT id, name, email, password, must_change_password
       FROM ${table} WHERE ${column} = ? LIMIT 1`,
      [value]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Email or password is incorrect' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Email or password is incorrect' });

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

// Self-service forgot-password: user enters their roll/teacher_id; if it exists,
// every admin gets a notification to reset their password from the admin pages.
// Always returns ok to avoid leaking whether an ID exists.
router.post('/request-password-reset', async (req, res) => {
  const { role, identifier } = req.body || {};
  if (!identifier || !role || (role !== 'student' && role !== 'teacher')) {
    return res.status(400).json({ error: 'role (student|teacher) and identifier required' });
  }

  const v = String(identifier).trim().toLowerCase();
  let user = null;
  let label = '';
  let link = '';
  if (role === 'student') {
    const [rows] = await query(
      'SELECT id, name, roll_number FROM students WHERE email = ? LIMIT 1',
      [v]
    );
    if (rows.length) {
      user = rows[0];
      label = `Roll ${user.roll_number} (${user.name})`;
      link = '/admin/students';
    }
  } else {
    const [rows] = await query(
      'SELECT id, name, teacher_id FROM teachers WHERE email = ? LIMIT 1',
      [v]
    );
    if (rows.length) {
      user = rows[0];
      label = `${user.teacher_id} (${user.name})`;
      link = '/admin/teachers';
    }
  }

  if (user) {
    const [admins] = await query('SELECT id FROM admins');
    for (const a of admins) {
      await query(
        `INSERT INTO notifications (recipient_role, recipient_id, title, body, link)
         VALUES ('admin', ?, ?, ?, ?)`,
        [
          a.id,
          `Password reset requested: ${label}`,
          `${role === 'student' ? 'Student' : 'Teacher'} ${label} requested a password reset. Open the ${role === 'student' ? 'Students' : 'Teachers'} page and click "Reset password".`,
          link,
        ]
      );
    }
  }

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
