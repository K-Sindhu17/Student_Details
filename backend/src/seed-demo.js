// Demo data seeder — for local testing only.
//
// Creates 2 teachers and 10 students across Class 3 and Class 5,
// with predictable credentials so you can log in as each role without
// going through the admin UI every time you wipe the DB.
//
// SAFETY:
//   - Refuses to run if NODE_ENV === 'production'
//   - Refuses to run if any teachers or students already exist
//     (so you can't accidentally pollute a real school's data)
//
// Run with:   npm run seed:demo
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('./config/db');

const SCHOOL_DOMAIN = process.env.SCHOOL_DOMAIN || 'zphsparmalla.in';
const SCHOOL_CODE   = process.env.SCHOOL_CODE   || 'A61';
const JOIN_YEAR     = new Date().getFullYear();

// Same email pattern the admin routes use. Always lowercase — the login
// route lowercases the typed identifier and Postgres equality is case-sensitive.
const studentEmail = (roll3) => `${JOIN_YEAR}${SCHOOL_CODE}st${roll3}@${SCHOOL_DOMAIN}`.toLowerCase();
const teacherEmail = (id3)   => `${JOIN_YEAR}${SCHOOL_CODE}tech${id3}@${SCHOOL_DOMAIN}`.toLowerCase();

const TEACHERS = [
  { teacher_id: 't001', name: 'Asha Reddy', subject: 'Math',    grade: 3, phone: '+91 9000000001' },
  { teacher_id: 't002', name: 'Ravi Kumar', subject: 'Science', grade: 5, phone: '+91 9000000002' },
];

const STUDENTS = [
  // Class 3 — Asha's class
  { roll: '001', name: 'Aarav Sharma', grade: 3, father: 'Vikram Sharma', mother: 'Priya Sharma' },
  { roll: '002', name: 'Diya Patel',   grade: 3, father: 'Nikhil Patel',  mother: 'Anita Patel'  },
  { roll: '003', name: 'Rohan Singh',  grade: 3, father: 'Suresh Singh',  mother: 'Rekha Singh'  },
  { roll: '004', name: 'Meera Iyer',   grade: 3, father: 'Raj Iyer',      mother: 'Lakshmi Iyer' },
  { roll: '005', name: 'Kabir Khan',   grade: 3, father: 'Imran Khan',    mother: 'Zara Khan'    },
  // Class 5 — Ravi's class
  { roll: '006', name: 'Saanvi Gupta', grade: 5, father: 'Manoj Gupta',   mother: 'Neha Gupta'   },
  { roll: '007', name: 'Arjun Mehta',  grade: 5, father: 'Sanjay Mehta',  mother: 'Pooja Mehta'  },
  { roll: '008', name: 'Ishaan Rao',   grade: 5, father: 'Kiran Rao',     mother: 'Deepa Rao'    },
  { roll: '009', name: 'Anaya Joshi',  grade: 5, father: 'Rahul Joshi',   mother: 'Smita Joshi'  },
  { roll: '010', name: 'Vihaan Das',   grade: 5, father: 'Amit Das',      mother: 'Riya Das'     },
];

async function classIdFor(grade) {
  const [rows] = await query(
    'SELECT id FROM classes WHERE grade = ? AND section = ?',
    [grade, 'A']
  );
  if (rows[0]) return rows[0].id;
  const [ins] = await query(
    'INSERT INTO classes (grade, section) VALUES (?, ?) RETURNING id',
    [grade, 'A']
  );
  return ins[0].id;
}

async function seedDemo() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: seed:demo refuses to run with NODE_ENV=production.');
    console.error('Demo data is for local testing only.');
    process.exit(1);
  }

  const [teacherCount] = await query('SELECT COUNT(*)::int AS c FROM teachers');
  const [studentCount] = await query('SELECT COUNT(*)::int AS c FROM students');
  if (teacherCount[0].c > 0 || studentCount[0].c > 0) {
    console.error('ERROR: teachers or students already exist in the database.');
    console.error(`  teachers: ${teacherCount[0].c}   students: ${studentCount[0].c}`);
    console.error('Refusing to seed demo data on top of real records.');
    console.error('If this is a dev DB you want to reset, drop the tables first.');
    process.exit(1);
  }

  console.log('Seeding demo data...\n');

  const teacherIdByGrade = {};
  for (const t of TEACHERS) {
    const classId = await classIdFor(t.grade);
    const email   = teacherEmail(t.teacher_id.replace(/^t/, ''));
    const hash    = await bcrypt.hash(t.teacher_id, 10);
    const [ins] = await query(
      `INSERT INTO teachers (name, teacher_id, email, password, phone, class_id, subject, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE) RETURNING id`,
      [t.name, t.teacher_id, email, hash, t.phone, classId, t.subject]
    );
    teacherIdByGrade[t.grade] = ins[0].id;
    console.log(`  teacher · ${t.teacher_id.padEnd(5)} · ${t.name.padEnd(14)} · Class ${t.grade} · ${t.subject}`);
  }

  console.log('');
  for (const s of STUDENTS) {
    const classId = await classIdFor(s.grade);
    const email   = studentEmail(s.roll);
    const hash    = await bcrypt.hash(s.roll, 10);
    await query(
      `INSERT INTO students
         (name, roll_number, email, password, class_id,
          father_name, mother_name, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [s.name, s.roll, email, hash, classId, s.father, s.mother]
    );
    console.log(`  student · ${s.roll} · ${s.name.padEnd(14)} · Class ${s.grade}`);
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log('DEMO DATA SEEDED');
  console.log('─────────────────────────────────────────────────────');
  console.log(`School domain: ${SCHOOL_DOMAIN}`);
  console.log(`Admin        : admin@${SCHOOL_DOMAIN} / <your ADMIN_PASSWORD>`);
  console.log('');
  console.log('Teachers (password = teacher ID):');
  for (const t of TEACHERS) {
    console.log(`  ${teacherEmail(t.teacher_id.replace(/^t/, ''))}`);
    console.log(`    password: ${t.teacher_id}   (${t.name} · Class ${t.grade} · ${t.subject})`);
  }
  console.log('');
  console.log('Students (password = roll number, zero-padded to 3 digits):');
  for (const s of STUDENTS) {
    console.log(`  ${studentEmail(s.roll)}`);
    console.log(`    password: ${s.roll}   (${s.name} · Class ${s.grade})`);
  }
  console.log('─────────────────────────────────────────────────────');
  console.log('These demo accounts skip the forced-password-change step.');
  console.log('Do NOT run this seeder against a production database.');

  await pool.end();
  process.exit(0);
}

seedDemo().catch((e) => {
  console.error(e);
  process.exit(1);
});
