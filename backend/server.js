require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ─────────────────────────────────────────────
app.use('/api', require('./routes/auth'));
app.use('/api/students',    require('./routes/students'));
app.use('/api/instructors', require('./routes/instructors'));
app.use('/api/lessons',     require('./routes/lessons'));
app.use('/api/exams',       require('./routes/exams'));

// ── Stats endpoint (admin dashboard) ──────────────────────
const pool = require('./config/db');
const { authenticate, authorize } = require('./middleware/auth');

app.get('/api/stats', authenticate, authorize('admin'), async (_req, res) => {
  const [students, instructors, lessons, exams] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM students WHERE status='active'"),
    pool.query('SELECT COUNT(*) FROM instructors'),
    pool.query("SELECT COUNT(*) FROM lessons WHERE status='scheduled' AND scheduled_date > NOW()"),
    pool.query("SELECT COUNT(*) FROM exams WHERE passed=true"),
  ]);
  res.json({
    active_students:      parseInt(students.rows[0].count),
    total_instructors:    parseInt(instructors.rows[0].count),
    upcoming_lessons:     parseInt(lessons.rows[0].count),
    passed_exams:         parseInt(exams.rows[0].count),
  });
});

// My lessons (student) ─────────────────────────────────────
app.get('/api/my-lessons', authenticate, authorize('student'), async (req, res) => {
  const { rows: st } = await pool.query(
    'SELECT id FROM students WHERE user_id=$1', [req.user.id]
  );
  if (!st.length) return res.json([]);
  const { rows } = await pool.query(
    `SELECT l.id, l.title, l.lesson_type, l.scheduled_date, l.location, l.status,
            lr.status AS reg_status
     FROM lesson_registrations lr
     JOIN lessons l ON l.id = lr.lesson_id
     WHERE lr.student_id=$1
     ORDER BY l.scheduled_date DESC`,
    [st[0].id]
  );
  res.json(rows);
});

// ── SPA fallback ───────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚗  Автошкола API запущен на http://localhost:${PORT}`);
  console.log(`📋  Admin login: admin@autoshkola.ru / Admin1234!\n`);
});
