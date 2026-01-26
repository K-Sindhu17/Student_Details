require('dotenv').config();
const { faker } = require('@faker-js/faker');
const { pool, testConnection } = require('./config/db');

const TOTAL_STUDENTS = 10000;
const BATCH_SIZE = 1000;

const classes = [
  '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
  '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade',
  '11th Grade', '12th Grade'
];

const generateStudent = (index) => {
  const rollNumber = `STU${String(index + 1).padStart(5, '0')}`;
  const name = faker.person.fullName();
  const age = faker.number.int({ min: 5, max: 18 });
  const studentClass = classes[Math.floor(Math.random() * classes.length)];

  return [rollNumber, name, age, studentClass];
};

const seedDatabase = async () => {
  console.log('Starting database seeding...');

  let retries = 10;
  while (retries > 0) {
    const connected = await testConnection();
    if (connected) break;

    console.log(`Waiting for database... (${retries} attempts left)`);
    retries--;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  if (retries === 0) {
    console.error('Could not connect to database');
    process.exit(1);
  }

  try {
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM students');
    if (existing[0].count > 0) {
      console.log(`Database already has ${existing[0].count} students. Skipping seed.`);
      process.exit(0);
    }

    console.log(`Generating ${TOTAL_STUDENTS} students...`);

    for (let batch = 0; batch < TOTAL_STUDENTS / BATCH_SIZE; batch++) {
      const students = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const studentIndex = batch * BATCH_SIZE + i;
        students.push(generateStudent(studentIndex));
      }

      const placeholders = students.map(() => '(?, ?, ?, ?)').join(', ');
      const flatValues = students.flat();

      await pool.query(
        `INSERT INTO students (roll_number, name, age, class) VALUES ${placeholders}`,
        flatValues
      );

      console.log(`Inserted batch ${batch + 1}/${TOTAL_STUDENTS / BATCH_SIZE} (${(batch + 1) * BATCH_SIZE} students)`);
    }

    console.log(`Successfully seeded ${TOTAL_STUDENTS} students!`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
