const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500;
    const offset = (page - 1) * limit;

    const [students] = await pool.query(
      'SELECT id, roll_number, name, age, class FROM students ORDER BY id LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM students');
    const total = countResult[0].total;

    res.json({
      students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.get('/count', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT COUNT(*) as count FROM students');
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Error counting students:', error);
    res.status(500).json({ error: 'Failed to count students' });
  }
});

module.exports = router;
