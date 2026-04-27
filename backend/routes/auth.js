const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../config/db');

/* ── POST /api/register ─────────────────────────────────── */
router.post('/register', async (req, res) => {
  const { email, password, role, first_name, last_name, phone } = req.body;

  if (!email || !password || !role || !first_name || !last_name)
    return res.status(400).json({ message: 'Заполните все обязательные поля' });

  if (!['admin','instructor','student'].includes(role))
    return res.status(400).json({ message: 'Недопустимая роль' });

  const client = await pool.connect();
  try {
    const exists = await client.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email уже зарегистрирован' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await client.query(
      `INSERT INTO users (email,password_hash,role,first_name,last_name,phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,email,role,first_name,last_name`,
      [email, hash, role, first_name, last_name, phone || null]
    );
    const user = rows[0];

    // Create role-specific record
    if (role === 'student') {
      await client.query(
        'INSERT INTO students (user_id) VALUES ($1)',
        [user.id]
      );
    } else if (role === 'instructor') {
      const licenseNumber = `LIC-${Date.now()}`;
      await client.query(
        'INSERT INTO instructors (user_id, license_number) VALUES ($1,$2)',
        [user.id, licenseNumber]
      );
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({ token, user });
  } finally {
    client.release();
  }
});

/* ── POST /api/login ────────────────────────────────────── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Введите email и пароль' });

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email=$1 AND is_active=true', [email]
  );
  if (!rows.length) return res.status(401).json({ message: 'Неверный email или пароль' });

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Неверный email или пароль' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name }
  });
});

/* ── GET /api/me ────────────────────────────────────────── */
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id,email,role,first_name,last_name,phone,created_at FROM users WHERE id=$1',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Пользователь не найден' });
  res.json(rows[0]);
});

module.exports = router;
