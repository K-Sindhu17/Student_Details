require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('./config/db');

const SCHOOL_DOMAIN = process.env.SCHOOL_DOMAIN || 'zphsparmalla.in';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function seed() {
  const isProd = process.env.NODE_ENV === 'production';
  const minLen = isProd ? 8 : 1;
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < minLen) {
    console.error(`ERROR: ADMIN_PASSWORD env var is required (min ${minLen} chars in ${isProd ? 'production' : 'dev'}).`);
    console.error('Set it in backend/.env or your environment, then re-run seed.');
    console.error('Example:  ADMIN_PASSWORD="a-strong-password-here" npm run seed');
    process.exit(1);
  }

  console.log('Seeding...');

  // Classes: Nursery (-2), LKG (-1), UKG (0), Class 1..10 (1..10), all section 'A' by default.
  const defaultGrades = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const g of defaultGrades) {
    await query(
      'INSERT INTO classes (grade, section) VALUES (?, ?) ON CONFLICT (grade, section) DO NOTHING',
      [g, 'A']
    );
  }
  // Admin — must_change_password=true forces a reset on first login,
  // so even the seeded password is a one-time bootstrap credential.
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await query(
    `INSERT INTO admins (name, email, password, must_change_password)
     VALUES (?, ?, ?, TRUE) ON CONFLICT (email) DO NOTHING`,
    ['Default Admin', 'admin@' + SCHOOL_DOMAIN, adminHash]
  );

  console.log('Seed complete. School domain:', SCHOOL_DOMAIN);
  console.log('  Admin    : admin@' + SCHOOL_DOMAIN);
  console.log('  Password : (from ADMIN_PASSWORD env var) — must change on first login');
  console.log('  (Teachers and students are created by the admin from the dashboard.)');
  await pool.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
