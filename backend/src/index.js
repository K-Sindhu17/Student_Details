require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { testConnection, pool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/notifications', require('./routes/notifications'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

(async () => {
  let retries = 10;
  while (retries > 0) {
    if (await testConnection()) {
      try {
        await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255)');
      } catch (e) {
        console.error('notifications.link migration failed:', e.message);
      }
      // Backfill: create teacher notifications for any submitted quiz that doesn't already have one.
      try {
        const r = await pool.query(`
          INSERT INTO notifications (recipient_role, recipient_id, title, body, link)
          SELECT 'teacher', a.teacher_id,
                 'Roll ' || s.roll_number || ' submitted: ' || a.title,
                 s.name || ' (Roll ' || s.roll_number || ') submitted the quiz "' || a.title || '".',
                 '/teacher/assignments'
          FROM submissions sub
          JOIN assignments a ON a.id = sub.assignment_id
          JOIN students    s ON s.id = sub.student_id
          WHERE sub.submitted_at IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.recipient_role = 'teacher'
                AND n.recipient_id   = a.teacher_id
                AND n.title          = 'Roll ' || s.roll_number || ' submitted: ' || a.title
            )
        `);
        if (r.rowCount > 0) console.log(`Backfilled ${r.rowCount} teacher submit notifications`);
      } catch (e) {
        console.error('submit-notification backfill failed:', e.message);
      }
      app.listen(PORT, () => console.log(`API listening on ${PORT}`));
      return;
    }
    console.log(`DB not ready, retrying... (${retries} left)`);
    retries--;
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.error('Could not connect to database. Exiting.');
  process.exit(1);
})();
