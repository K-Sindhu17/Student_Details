-- Postgres schema for ZPHS Parmalla school management

CREATE TABLE IF NOT EXISTS classes (
    id          SERIAL PRIMARY KEY,
    grade       INT NOT NULL,
    section     CHAR(1) NOT NULL,
    UNIQUE (grade, section)
);

CREATE TABLE IF NOT EXISTS admins (
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(100) NOT NULL,
    email                 VARCHAR(150) UNIQUE NOT NULL,
    password              VARCHAR(255) NOT NULL,
    must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(100) NOT NULL,
    teacher_id            VARCHAR(20) UNIQUE NOT NULL,
    email                 VARCHAR(150) UNIQUE NOT NULL,
    password              VARCHAR(255) NOT NULL,
    must_change_password  BOOLEAN NOT NULL DEFAULT TRUE,
    phone                 VARCHAR(20),
    class_id              INT REFERENCES classes(id) ON DELETE SET NULL,
    subject               VARCHAR(100),
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(100) NOT NULL,
    roll_number           VARCHAR(20) NOT NULL,
    email                 VARCHAR(150) UNIQUE NOT NULL,
    password              VARCHAR(255) NOT NULL,
    must_change_password  BOOLEAN NOT NULL DEFAULT TRUE,
    class_id              INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    dob                   DATE,
    address               TEXT,
    phone                 VARCHAR(20),
    father_name           VARCHAR(100),
    father_phone          VARCHAR(20),
    father_email          VARCHAR(150),
    mother_name           VARCHAR(100),
    mother_phone          VARCHAR(20),
    mother_email          VARCHAR(150),
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (roll_number, class_id)
);

CREATE TABLE IF NOT EXISTS attendance (
    id          SERIAL PRIMARY KEY,
    student_id  INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    status      VARCHAR(10) NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late')),
    marked_by   INT REFERENCES teachers(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, date)
);

CREATE TABLE IF NOT EXISTS assignments (
    id                SERIAL PRIMARY KEY,
    class_id          INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id        INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title             VARCHAR(200) NOT NULL,
    description       TEXT,
    due_at            TIMESTAMPTZ,      -- deadline: students must submit before this; NULL = no deadline
    duration_minutes  INT,              -- time limit once student starts; NULL = no limit
    created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
    id              SERIAL PRIMARY KEY,
    assignment_id   INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    position        INT NOT NULL,
    text            TEXT NOT NULL,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('mcq', 'short_answer')),
    options         JSONB,             -- ["A", "B", "C", "D"] for MCQ
    correct_answer  TEXT,              -- the correct option text for MCQ; NULL for short_answer
    model_answer    TEXT,              -- optional reference answer for short_answer; shown to teacher when grading
    points          NUMERIC(5,2) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS submissions (
    id            SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id    INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    started_at    TIMESTAMPTZ,         -- when student clicked "Start"
    submitted_at  TIMESTAMPTZ,
    auto_score    NUMERIC(6,2),        -- sum of MCQ points earned
    manual_score  NUMERIC(6,2),        -- sum of text-question points the teacher gave
    feedback      TEXT,
    UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS answers (
    id              SERIAL PRIMARY KEY,
    submission_id   INT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_id     INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    student_answer  TEXT,
    is_correct      BOOLEAN,           -- set for MCQ at submit; NULL for text until graded
    points_earned   NUMERIC(5,2),
    UNIQUE (submission_id, question_id)
);

CREATE TABLE IF NOT EXISTS marks (
    id           SERIAL PRIMARY KEY,
    student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject      VARCHAR(100) NOT NULL,
    exam_type    VARCHAR(50) NOT NULL DEFAULT 'term',
    marks        NUMERIC(5,2) NOT NULL,
    max_marks    NUMERIC(5,2) NOT NULL DEFAULT 100,
    recorded_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, subject, exam_type)
);

CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    recipient_role  VARCHAR(10) NOT NULL CHECK (recipient_role IN ('student','teacher','admin')),
    recipient_id    INT NOT NULL,
    title           VARCHAR(200) NOT NULL,
    body            TEXT,
    link            VARCHAR(255),
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_students_class       ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date      ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_assignments_class    ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_questions_assignment ON questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_answers_submission   ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recip  ON notifications(recipient_role, recipient_id, is_read);
