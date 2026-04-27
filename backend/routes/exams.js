const router = require('express').Router();
const pool   = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

/* ── GET /api/exams ─────────────────────────────────────── */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT e.*,
            u.first_name, u.last_name, u.email
     FROM exams e
     JOIN students s ON s.id = e.student_id
     JOIN users    u ON u.id = s.user_id
     ORDER BY e.exam_date DESC`
  );
  res.json(rows);
});

/* ── GET /api/exams/my ─ student's own exams ────────────── */
router.get('/my', authenticate, authorize('student'), async (req, res) => {
  const { rows: st } = await pool.query(
    'SELECT id FROM students WHERE user_id=$1', [req.user.id]
  );
  if (!st.length) return res.json([]);
  const { rows } = await pool.query(
    'SELECT * FROM exams WHERE student_id=$1 ORDER BY exam_date DESC',
    [st[0].id]
  );
  res.json(rows);
});

/* ── POST /api/exams ─ create (admin only) ──────────────── */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { student_id, exam_type, exam_date, score, passed,
          attempt_number, examiner, notes } = req.body;

  if (!student_id || !exam_type || !exam_date)
    return res.status(400).json({ message: 'student_id, exam_type, exam_date обязательны' });

  const { rows } = await pool.query(
    `INSERT INTO exams
       (student_id,exam_type,exam_date,score,passed,attempt_number,examiner,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [student_id, exam_type, exam_date, score??null, passed??null,
     attempt_number||1, examiner||null, notes||null]
  );
  res.status(201).json({ message: 'Экзамен добавлен', exam_id: rows[0].id });
});

/* ── PUT /api/exams/:id ─────────────────────────────────── */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { score, passed, notes } = req.body;
  await pool.query(
    'UPDATE exams SET score=$1, passed=$2, notes=$3 WHERE id=$4',
    [score, passed, notes, req.params.id]
  );
  res.json({ message: 'Результат экзамена обновлён' });
});

/* ── DELETE /api/exams/:id ──────────────────────────────── */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  await pool.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
  res.json({ message: 'Экзамен удалён' });
});

module.exports = router;
