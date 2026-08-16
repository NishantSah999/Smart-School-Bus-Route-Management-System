const { query } = require('../config/db');

const AuditLog = {
  async record({ user_id, action, entity, entity_id, ip, metadata }) {
    await query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, ip, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [user_id ?? null, action, entity ?? null, entity_id ?? null, ip ?? null, metadata ?? null]
    );
  },
  async list({ page = 1, limit = 50, action, entity } = {}) {
    const conds = [];
    const params = [];
    if (action) { params.push(action); conds.push(`action = $${params.length}`); }
    if (entity) { params.push(entity); conds.push(`entity = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const rowsRes = await query(
      `SELECT l.*, u.name AS user_name FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id
       ${where} ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const totalRes = await query(`SELECT count(*)::int AS total FROM audit_logs l ${where}`, params);
    return {
      data: rowsRes.rows,
      pagination: { page, limit, total: totalRes.rows[0].total, totalPages: Math.max(1, Math.ceil(totalRes.rows[0].total / limit)) },
    };
  },
};

module.exports = AuditLog;