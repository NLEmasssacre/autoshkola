const router = require('express').Router();
const pool   = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const LESSON_SELECT = `
  SELECT
    l.id, l.title, l.description, l.lesson_type,
    l.scheduled_date, l.duration_minutes, l.max_students,
    l.location, l.status,
    i.id AS instructor_id,
    u.first_name AS instructor_first, u.last_name AS instructor_last,
    (SELECT COUNT(*) FROM lesson_registrations lr WHERE lr.lesson_id=l.id AND lr.status != 'cancelled')
      AS registered_count
  FROM lessons l
  LEFT JOIN instructors i ON i.id = l.instructor_id
  LEFT JOIN users u ON u.id = i.user_id
`;

/* ── GET /api/lessons ───────────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
  let query = LESSON_SELECT;
  const params = [];

  // Instructors see only their lessons
  if (req.user.role === 'instructor') {
    const { rows } = await pool.query(
      'SELECT id FROM instructors WHERE user_id=$1', [req.user.id]
    );
    if (rows.length) {
      query += ' WHERE l.instructor_id=$1';
      params.push(rows[0].id);
    }
  }

  query += ' ORDER BY l.scheduled_date DESC';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

/* ── GET /api/lessons/:id ───────────────────────────────── */
router.get('/:id', authenticate, async (req, res) => {
  const { rows } = await pool.query(LESSON_SELECT + ' WHERE l.id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Занятие не найдено' });
  res.json(rows[0]);
});

/* ── POST /api/lessons ─ create (admin only) ────────────── */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const {
    title, description, lesson_type, scheduled_date,
    duration_minutes, max_students, location, instructor_id
  } = req.body;

  if (!title || !lesson_type || !scheduled_date)
    return res.status(400).json({ message: 'title, lesson_type, scheduled_date обязательны' });

  const { rows } = await pool.query(
    `INSERT INTO lessons
       (title,description,lesson_type,scheduled_date,duration_minutes,max_students,location,instructor_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [title, description||null, lesson_type, scheduled_date,
     duration_minutes||60, max_students||10, location||null, instructor_id||null]
  );
  res.status(201).json({ message: 'Занятие создано', lesson_id: rows[0].id });
});

/* ── PUT /api/lessons/:id ───────────────────────────────── */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { title, description, lesson_type, scheduled_date,
          duration_minutes, max_students, location, instructor_id, status } = req.body;
  await pool.query(
    `UPDATE lessons SET title=$1, description=$2, lesson_type=$3, scheduled_date=$4,
       duration_minutes=$5, max_students=$6, location=$7, instructor_id=$8, status=$9
     WHERE id=$10`,
    [title, description, lesson_type, scheduled_date,
     duration_minutes, max_students, location, instructor_id, status, req.params.id]
  );
  res.json({ message: 'Занятие обновлено' });
});

/* ── DELETE /api/lessons/:id ────────────────────────────── */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  await pool.query('DELETE FROM lessons WHERE id=$1', [req.params.id]);
  res.json({ message: 'Занятие удалено' });
});

/* ── POST /api/lessons/:id/register ─ student sign-up ───── */
router.post('/:id/register', authenticate, authorize('student'), async (req, res) => {
  const lesson_id = parseInt(req.params.id);
  const client = await pool.connect();
  try {
    // Get student id
    const { rows: st } = await client.query(
      'SELECT id FROM students WHERE user_id=$1', [req.user.id]
    );
    if (!st.length) return res.status(404).json({ message: 'Профиль ученика не найден' });
    const student_id = st[0].id;

    // Check lesson exists and has slots
    const { rows: les } = await client.query(
      `SELECT l.max_students,
              (SELECT COUNT(*) FROM lesson_registrations lr
               WHERE lr.lesson_id=l.id AND lr.status != 'cancelled') AS cnt
       FROM lessons l WHERE l.id=$1 AND l.status='scheduled'`,
      [lesson_id]
    );
    if (!les.length) return res.status(404).json({ message: 'Занятие не найдено или отменено' });
    if (parseInt(les[0].cnt) >= les[0].max_students)
      return res.status(409).json({ message: 'Нет свободных мест' });

    await client.query(
      `INSERT INTO lesson_registrations (lesson_id, student_id)
       VALUES ($1,$2) ON CONFLICT (lesson_id,student_id) DO NOTHING`,
      [lesson_id, student_id]
    );
    res.status(201).json({ message: 'Записан на занятие' });
  } finally {
    client.release();
  }
});

/* ── GET /api/lessons/:id/students ─ roster ─────────────── */
router.get('/:id/students', authenticate, authorize('admin','instructor'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT lr.id, lr.status, lr.registered_at,
            s.id AS student_id,
            u.first_name, u.last_name, u.email, u.phone
     FROM lesson_registrations lr
     JOIN students s ON s.id = lr.student_id
     JOIN users    u ON u.id = s.user_id
     WHERE lr.lesson_id=$1
     ORDER BY u.last_name`,
    [req.params.id]
  );
  res.json(rows);
});

module.exports = router;
