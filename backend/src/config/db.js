const { Pool } = require('pg');
const { databaseUrl } = require('./env');

const pool = new Pool({ connectionString: databaseUrl });

pool.on('error', (err) => {
  console.error('[db] unexpected pool error', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
