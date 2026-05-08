const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false //
});

pool.connect()
  .then(() => console.log('Conexión exitosa con Supabase'))
  .catch(err => console.error('Error al conectar con la DB:', err));

module.exports = pool;