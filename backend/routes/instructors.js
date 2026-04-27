const router = require('express').Router();
const pool   = require('../config/db');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');

const INSTR_SELECT = `
  SELECT
    i.id, i.license_number, i.experience_years, i.specialization,
    i.rating, i.vehicle_number,
    u.id AS user_id, u.first_name, u.last_name, u.email, u.phone,
    u.created_at
  FROM instructors i
  JOIN users u ON u.id = i.user_id
`;

/* ── GET /api/instructors ───────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
  const { rows } = await pool.query(INSTR_SELECT + ' ORDER BY u.last_name, u.first_name');
  res.json(rows);
});

/* ── GET /api/instructors/:id ───────────────────────────── */
router.get('/:id', authenticate, async (req, res) => {
  const { rows } = await pool.query(INSTR_SELECT + ' WHERE i.id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Инструктор не найден' });
  res.json(rows[0]);
});

/* ── POST /api/instructors ─ create (admin only) ────────── */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { email, password, first_name, last_name, phone,
          license_number, experience_years, specialization, vehicle_number } = req.body;

  if (!email || !password || !first_name || !last_name || !license_number)
    return res.status(400).json({ message: 'email, password, имя, фамилия, номер лицензии обязательны' });

  const client = await pool.connect();
  try {
    const exists = await client.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email уже занят' });

    const hash = await bcrypt.hash(password, 10);
    const { rows: u } = await client.query(
      `INSERT INTO users (email,password_hash,role,first_name,last_name,phone)
       VALUES ($1,$2,'instructor',$3,$4,$5) RETURNING id`,
      [email, hash, first_name, last_name, phone || null]
    );
    const { rows: i } = await client.query(
      `INSERT INTO instructors (user_id,license_number,experience_years,specialization,vehicle_number)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [u[0].id, license_number, experience_years || 0, specialization || null, vehicle_number || null]
    );
    res.status(201).json({ message: 'Инструктор добавлен', instructor_id: i[0].id });
  } finally {
    client.release();
  }
});

/* ── PUT /api/instructors/:id ───────────────────────────── */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { experience_years, specialization, vehicle_number, rating } = req.body;
  await pool.query(
    `UPDATE instructors SET experience_years=$1, specialization=$2, vehicle_number=$3, rating=$4
     WHERE id=$5`,
    [experience_years, specialization, vehicle_number, rating, req.params.id]
  );
  res.json({ message: 'Данные обновлены' });
});

/* ── DELETE /api/instructors/:id ────────────────────────── */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT user_id FROM instructors WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Не найден' });
  await pool.query('DELETE FROM users WHERE id=$1', [rows[0].user_id]);
  res.json({ message: 'Инструктор удалён' });
});

module.exports = router;
