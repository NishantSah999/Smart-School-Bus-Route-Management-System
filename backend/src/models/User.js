const { query } = require('../config/db');

const User = {
  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },
  async findById(id) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  },
  async create({ name, email, phone, passwordHash, role, school_id }) {
    const { rows } = await query(
      `INSERT INTO users (name, email, phone, password_hash, role, school_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role, status, school_id, created_at`,
      [name, email, phone, passwordHash, role, school_id || null]
    );
    return rows[0];
  },
  async updateLastLogin(id) {
    await query('UPDATE users SET last_login = now(), updated_at = now() WHERE id = $1', [id]);
  },
  async setStatus(id, status) {
    await query('UPDATE users SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
  },
  async setPassword(id, passwordHash) {
    await query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [id, passwordHash]);
  },
  async saveRefreshToken(userId, tokenHash, expiresAt) {
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [userId, tokenHash, expiresAt]
    );
  },
  async revokeRefreshToken(tokenHash) {
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  },
  async revokeAllRefreshTokens(userId) {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  },
  async findRefreshToken(tokenHash) {
    const { rows } = await query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > now()',
      [tokenHash]
    );
    return rows[0];
  },
};

module.exports = User;