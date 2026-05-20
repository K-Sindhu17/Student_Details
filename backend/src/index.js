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
      // Self-heal: older DB snapshots predate the auth feature and are missing
      // must_change_password on students/teachers. The login route SELECTs it,
      // so without these the entire login flow 500s. Idempotent — safe to re-run.
      try {
        await pool.query(`
          ALTER TABLE students ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;
          ALTER TABLE teachers ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;
          ALTER TABLE admins   ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
        `);
      } catch (e) {
        console.error('must_change_password migration failed:', e.message);
      }
      // TIMESTAMP WITHOUT TIME ZONE drops the offset on write and re-applies the
      // server's offset on read, producing a wall-clock shift (5h30m in IST).
      // TIMESTAMPTZ keeps everything in UTC end-to-end. The existing rows were
      // written as UTC (the Z-suffixed ISO from the frontend), so AT TIME ZONE
      // 'UTC' just declares that fact — no data is shifted.
      try {
        await pool.query(`
          ALTER TABLE assignments   ALTER COLUMN due_at       TYPE TIMESTAMPTZ USING due_at       AT TIME ZONE 'UTC';
          ALTER TABLE assignments   ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
          ALTER TABLE submissions   ALTER COLUMN started_at   TYPE TIMESTAMPTZ USING started_at   AT TIME ZONE 'UTC';
          ALTER TABLE submissions   ALTER COLUMN submitted_at TYPE TIMESTAMPTZ USING submitted_at AT TIME ZONE 'UTC';
          ALTER TABLE marks         ALTER COLUMN recorded_at  TYPE TIMESTAMPTZ USING recorded_at  AT TIME ZONE 'UTC';
          ALTER TABLE notifications ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
          ALTER TABLE attendance    ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
          ALTER TABLE students      ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
          ALTER TABLE teachers      ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
          ALTER TABLE admins        ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
        `);
      } catch (e) {
        // Only the first run actually converts; subsequent runs no-op (already TIMESTAMPTZ).
        if (!String(e.message).includes('already')) {
          console.error('timestamptz migration warn:', e.message);
        }
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
