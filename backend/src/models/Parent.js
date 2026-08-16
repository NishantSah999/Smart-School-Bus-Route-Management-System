const { query } = require('../config/db');
const { buildPagination, paginationMeta } = require('../utils/paginate');

const Parent = {
  async list({ page = 1, limit = 25, search = '' } = {}) {
    const where = search ? 'WHERE p.name ILIKE $1 OR p.phone ILIKE $1' : '';
    const params = search ? [`%${search}%`] : [];
    const countRes = await query(`SELECT count(*)::int AS total FROM parents p ${where}`, params);
    const { offset } = buildPagination({ page, limit });
    const rowsRes = await query(
      `SELECT p.*, u.email AS user_email, u.role AS user_role
       FROM parents p LEFT JOIN users u ON u.id = p.user_id
       ${where} ORDER BY p.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return { data: rowsRes.rows, pagination: paginationMeta(page, limit, countRes.rows[0].total) };
  },
  async findById(id) {
    const { rows } = await query(
      `SELECT p.*, u.email AS user_email FROM parents p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
      [id]
    );
    return rows[0];
  },
  async findByUserId(userId) {
    const { rows } = await query('SELECT * FROM parents WHERE user_id = $1', [userId]);
    return rows[0];
  },
  async create(fields) {
    const { rows } = await query(
      `INSERT INTO parents (user_id, name, phone, email, relationship, emergency_contact, notification_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [fields.user_id ?? null, fields.name, fields.phone, fields.email, fields.relationship ?? null, fields.emergency_contact ?? null, fields.notification_enabled ?? true]
    );
    return rows[0];
  },
  async update(id, fields) {
    const sets = [];
    const params = [id];
    const cols = ['user_id', 'name', 'phone', 'email', 'relationship', 'emergency_contact', 'notification_enabled'];
    cols.forEach((c) => {
      if (fields[c] !== undefined) {
        params.push(fields[c]);
        sets.push(`${c} = $${params.length}`);
      }
    });
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = now()');
    const { rows } = await query(`UPDATE parents SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  },
};

module.exports = Parent;