const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'student_user',
  password: process.env.DB_PASSWORD || 'studentpass',
  database: process.env.DB_NAME || 'student_db',
  max: 10,
});

// Mysql2-style wrapper: converts ? placeholders to $1,$2,...
// and returns [rows] so route code stays compact.
function pgify(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function query(sql, params = []) {
  const result = await pool.query(pgify(sql), params);
  return [result.rows];
}

async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    console.error('DB connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, query, testConnection };
