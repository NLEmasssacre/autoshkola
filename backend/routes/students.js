const router = require('express').Router();
const pool   = require('../config/db');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');

const STUDENT_SELECT = `
  SELECT
    s.id, s.status, s.license_category, s.enrollment_date,
    s.theory_hours, s.practice_hours, s.notes, s.date_of_birth,
    u.id   AS user_id,
    u.first_name, u.last_name, u.email, u.phone,
    u.created_at
  FROM students s
  JOIN users u ON u.id = s.user_id
`;

/* ── GET /api/students ── list ──────────────────────────── */
router.get('/', authenticate, authorize('admin','instructor'), async (req, res) => {
  const { rows } = await pool.query(STUDENT_SELECT + ' ORDER BY u.last_name, u.first_name');
  res.json(rows);
});

/* ── GET /api/students/:id ──────────────────────────────── */
router.get('/:id', authenticate, async (req, res) => {
  const { rows } = await pool.query(STUDENT_SELECT + ' WHERE s.id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Ученик не найден' });

  // Student can only see themselves
  if (req.user.role === 'student') {
    const me = await pool.query('SELECT id FROM students WHERE user_id=$1', [req.user.id]);
    if (!me.rows.length || me.rows[0].id !== parseInt(req.params.id))
      return res.status(403).json({ message: 'Нет доступа' });
  }
  res.json(rows[0]);
});

/* ── POST /api/students ── create (admin only) ──────────── */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { email, password, first_name, last_name, phone,
          date_of_birth, license_category, notes } = req.body;

  if (!email || !password || !first_name || !last_name)
    return res.status(400).json({ message: 'email, password, first_name, last_name обязательны' });

  const client = await pool.connect();
  try {
    const exists = await client.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email уже занят' });

    const hash = await bcrypt.hash(password, 10);
    const { rows: u } = await client.query(
      `INSERT INTO users (email,password_hash,role,first_name,last_name,phone)
       VALUES ($1,$2,'student',$3,$4,$5) RETURNING id`,
      [email, hash, first_name, last_name, phone || null]
    );
    const { rows: s } = await client.query(
      `INSERT INTO students (user_id,date_of_birth,license_category,notes)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [u[0].id, date_of_birth || null, license_category || 'B', notes || null]
    );
    res.status(201).json({ message: 'Ученик добавлен', student_id: s[0].id });
  } finally {
    client.release();
  }
});

/* ── PUT /api/students/:id ──────────────────────────────── */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { status, license_category, theory_hours, practice_hours, notes } = req.body;
  await pool.query(
    `UPDATE students SET
       status=$1, license_category=$2,
       theory_hours=$3, practice_hours=$4, notes=$5
     WHERE id=$6`,
    [status, license_category, theory_hours, practice_hours, notes, req.params.id]
  );
  res.json({ message: 'Данные обновлены' });
});

/* ── DELETE /api/students/:id ───────────────────────────── */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT user_id FROM students WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Не найден' });
  await pool.query('DELETE FROM users WHERE id=$1', [rows[0].user_id]);
  res.json({ message: 'Ученик удалён' });
});

module.exports = router;
