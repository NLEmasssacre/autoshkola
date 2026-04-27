const { Pool } = require('pg');
require('dotenv').config();

// Railway provides DATABASE_URL; local dev uses individual vars
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'driving_school',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

pool.on('connect', () => console.log('✅ PostgreSQL connected'));
pool.on('error',   (err) => { console.error('❌ PostgreSQL error:', err); process.exit(-1); });

module.exports = pool;
