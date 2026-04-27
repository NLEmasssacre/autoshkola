-- ============================================================
--  АВТОШКОЛА — Database Schema
-- ============================================================

-- Drop tables in reverse dependency order (for re-runs)
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS lesson_registrations CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS instructors CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
--  USERS
-- ============================================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)        NOT NULL,
    role          VARCHAR(20)         NOT NULL CHECK (role IN ('admin','instructor','student')),
    first_name    VARCHAR(100)        NOT NULL,
    last_name     VARCHAR(100)        NOT NULL,
    phone         VARCHAR(20),
    avatar_url    VARCHAR(500),
    is_active     BOOLEAN             DEFAULT TRUE,
    created_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  STUDENTS
-- ============================================================
CREATE TABLE students (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth    DATE,
    license_category VARCHAR(10)  DEFAULT 'B',
    enrollment_date  DATE         DEFAULT CURRENT_DATE,
    status           VARCHAR(20)  DEFAULT 'active'
                         CHECK (status IN ('active','suspended','graduated')),
    theory_hours     INTEGER      DEFAULT 0,
    practice_hours   INTEGER      DEFAULT 0,
    notes            TEXT,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  INSTRUCTORS
-- ============================================================
CREATE TABLE instructors (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number    VARCHAR(50) UNIQUE NOT NULL,
    experience_years  INTEGER     DEFAULT 0,
    specialization    VARCHAR(100),
    rating            DECIMAL(3,2) DEFAULT 5.00 CHECK (rating BETWEEN 0 AND 5),
    vehicle_number    VARCHAR(20),
    created_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  LESSONS
-- ============================================================
CREATE TABLE lessons (
    id               SERIAL PRIMARY KEY,
    instructor_id    INTEGER REFERENCES instructors(id) ON DELETE SET NULL,
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    lesson_type      VARCHAR(20)  NOT NULL CHECK (lesson_type IN ('theory','practice')),
    scheduled_date   TIMESTAMP    NOT NULL,
    duration_minutes INTEGER      DEFAULT 60,
    max_students     INTEGER      DEFAULT 10,
    location         VARCHAR(200),
    status           VARCHAR(20)  DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled','completed','cancelled')),
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  LESSON REGISTRATIONS
-- ============================================================
CREATE TABLE lesson_registrations (
    id            SERIAL PRIMARY KEY,
    lesson_id     INTEGER REFERENCES lessons(id)  ON DELETE CASCADE,
    student_id    INTEGER REFERENCES students(id) ON DELETE CASCADE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status        VARCHAR(20) DEFAULT 'registered'
                      CHECK (status IN ('registered','attended','missed','cancelled')),
    UNIQUE (lesson_id, student_id)
);

-- ============================================================
--  EXAMS
-- ============================================================
CREATE TABLE exams (
    id             SERIAL PRIMARY KEY,
    student_id     INTEGER REFERENCES students(id) ON DELETE CASCADE,
    exam_type      VARCHAR(20) NOT NULL CHECK (exam_type IN ('theory','practice')),
    exam_date      TIMESTAMP   NOT NULL,
    score          INTEGER     CHECK (score BETWEEN 0 AND 100),
    passed         BOOLEAN,
    attempt_number INTEGER     DEFAULT 1,
    examiner       VARCHAR(200),
    notes          TEXT,
    created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  INDEXES
-- ============================================================
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_users_role           ON users(role);
CREATE INDEX idx_students_user_id     ON students(user_id);
CREATE INDEX idx_students_status      ON students(status);
CREATE INDEX idx_instructors_user_id  ON instructors(user_id);
CREATE INDEX idx_lessons_instructor   ON lessons(instructor_id);
CREATE INDEX idx_lessons_date         ON lessons(scheduled_date);
CREATE INDEX idx_lessons_status       ON lessons(status);
CREATE INDEX idx_reg_lesson           ON lesson_registrations(lesson_id);
CREATE INDEX idx_reg_student          ON lesson_registrations(student_id);
CREATE INDEX idx_exams_student        ON exams(student_id);
CREATE INDEX idx_exams_date           ON exams(exam_date);

-- ============================================================
--  SEED: default admin
--  password: Admin1234!  (bcrypt hash)
-- ============================================================
INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
VALUES (
    'admin@autoshkola.ru',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhu2',
    'admin',
    'Главный',
    'Администратор',
    '+7 (999) 000-00-00'
);
