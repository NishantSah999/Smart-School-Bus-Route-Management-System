const { query } = require('../config/db');

const Notification = {
  async create({ user_id, title, body, type }) {
    const { rows } = await query(
      'INSERT INTO notifications (user_id, title, body, type) VALUES ($1,$2,$3,$4) RETURNING *',
      [user_id, title, body, type || 'INFO']
    );
    return rows[0];
  },
  async listForUser(userId, { page = 1, limit = 25, unreadOnly = false } = {}) {
    const offset = (page - 1) * limit;
    const where = unreadOnly ? 'WHERE user_id = $1 AND read = FALSE' : 'WHERE user_id = $1';
    const rowsRes = await query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const totalRes = await query(`SELECT count(*)::int AS total FROM notifications ${where}`, [userId]);
    return {
      data: rowsRes.rows,
      pagination: { page, limit, total: totalRes.rows[0].total, totalPages: Math.max(1, Math.ceil(totalRes.rows[0].total / limit)) },
      unread: (await query('SELECT count(*)::int AS c FROM notifications WHERE user_id = $1 AND read = FALSE', [userId])).rows[0].c,
    };
  },
  async markRead(userId, id) {
    await query('UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
  },
  async markAllRead(userId) {
    await query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [userId]);
  },
};

module.exports = Notification;