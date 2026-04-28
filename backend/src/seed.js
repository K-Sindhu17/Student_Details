require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('./config/db');

const SCHOOL_DOMAIN = process.env.SCHOOL_DOMAIN || 'zphsparmalla.in';

async function seed() {
  console.log('Seeding...');

  // Classes
  for (const [g, s] of [[10, 'A'], [10, 'B'], [9, 'A']]) {
    await query(
      'INSERT INTO classes (grade, section) VALUES (?, ?) ON CONFLICT (grade, section) DO NOTHING',
      [g, s]
    );
  }
  const [classRows] = await query('SELECT id, grade, section FROM classes');
  const class10A = classRows.find((c) => c.grade === 10 && c.section === 'A');

  // Admin
  const adminHash = await bcrypt.hash('admin123', 10);
  await query(
    `INSERT INTO admins (name, email, password, must_change_password)
     VALUES (?, ?, ?, FALSE) ON CONFLICT (email) DO NOTHING`,
    ['Default Admin', 'admin@' + SCHOOL_DOMAIN, adminHash]
  );

  // Teacher (login: t001 / t001)
  const tid = 't001';
  await query(
    `INSERT INTO teachers (name, teacher_id, email, password, must_change_password, phone, class_id, subject)
     VALUES (?, ?, ?, ?, FALSE, ?, ?, ?) ON CONFLICT (teacher_id) DO NOTHING`,
    ['Sita Sharma', tid, `${tid}@${SCHOOL_DOMAIN}`, await bcrypt.hash(tid, 10),
     '9999000001', class10A?.id || null, 'Math']
  );

  // Student (login: 101 / 101)
  const roll = '101';
  await query(
    `INSERT INTO students
       (name, roll_number, email, password, must_change_password, class_id, dob, address, phone,
        father_name, father_phone, father_email,
        mother_name, mother_phone, mother_email)
     VALUES (?, ?, ?, ?, FALSE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING`,
    ['Aarav Kumar', roll, `${roll}@${SCHOOL_DOMAIN}`, await bcrypt.hash(roll, 10),
     class10A?.id || null, '2010-05-12', '12 MG Road, Hyderabad', '9999000003',
     'Ravi Kumar', '9999000002', 'ravi.kumar123@gmail.com',
     'Sita Kumar', '9999000004', 'sita.kumar456@gmail.com']
  );

  console.log('Seed complete. School domain:', SCHOOL_DOMAIN);
  console.log('  Admin    : admin@' + SCHOOL_DOMAIN + '  / admin123');
  console.log('  Teacher  : teacher id "t001"      / t001');
  console.log('  Student  : roll number "101"      / 101');
  await pool.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
