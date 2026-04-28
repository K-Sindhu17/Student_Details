const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const [rows] = await query(
    `SELECT id, title, body, link, is_read, created_at FROM notifications
     WHERE recipient_role = ? AND recipient_id = ?
     ORDER BY created_at DESC LIMIT 30`,
    [req.user.role, req.user.id]
  );
  res.json(rows);
});

router.get('/unread-count', async (req, res) => {
  const [rows] = await query(
    `SELECT COUNT(*)::int AS count FROM notifications
     WHERE recipient_role = ? AND recipient_id = ? AND is_read = FALSE`,
    [req.user.role, req.user.id]
  );
  res.json({ count: rows[0].count });
});

router.put('/:id/read', async (req, res) => {
  // Verify ownership
  const [rows] = await query(
    'SELECT id FROM notifications WHERE id = ? AND recipient_role = ? AND recipient_id = ?',
    [req.params.id, req.user.role, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  await query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

router.post('/mark-all-read', async (req, res) => {
  await query(
    'UPDATE notifications SET is_read = TRUE WHERE recipient_role = ? AND recipient_id = ?',
    [req.user.role, req.user.id]
  );
  res.json({ ok: true });
});

module.exports = router;
