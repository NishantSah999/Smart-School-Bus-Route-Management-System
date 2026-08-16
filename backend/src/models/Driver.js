const { query } = require('../config/db');
const { buildPagination, paginationMeta } = require('../utils/paginate');

const Driver = {
  async list({ page = 1, limit = 25, search = '', status, school_id } = {}) {
    const conds = [];
    const params = [];
    if (search) { params.push(`%${search}%`); conds.push(`(d.name ILIKE $${params.length} OR d.license_number ILIKE $${params.length})`); }
    if (status) { params.push(status); conds.push(`d.status = $${params.length}`); }
    if (school_id) { params.push(school_id); conds.push(`d.school_id = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const base = params.slice();
    const countRes = await query(`SELECT count(*)::int AS total FROM drivers d ${where}`, params);
    const { offset } = buildPagination({ page, limit });
    const rowsRes = await query(
      `SELECT d.*, b.bus_number, u.email AS user_email
       FROM drivers d
       LEFT JOIN buses b ON b.driver_id = d.id
       LEFT JOIN users u ON u.id = d.user_id
       ${where} ORDER BY d.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return { data: rowsRes.rows, pagination: paginationMeta(page, limit, countRes.rows[0].total) };
  },
  async findById(id) {
    const { rows } = await query(
      `SELECT d.*, b.bus_number FROM drivers d LEFT JOIN buses b ON b.driver_id = d.id WHERE d.id = $1`,
      [id]
    );
    return rows[0];
  },
  async findByUserId(userId) {
    const { rows } = await query('SELECT * FROM drivers WHERE user_id = $1', [userId]);
    return rows[0];
  },
  async create(fields) {
    const cols = ['user_id', 'name', 'phone', 'license_number', 'license_expiry', 'emergency_contact', 'date_of_birth', 'experience_years', 'status', 'school_id'];
    const params = cols.map((c) => fields[c] ?? null);
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const { rows } = await query(
      `INSERT INTO drivers (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      params
    );
    return rows[0];
  },
  async update(id, fields) {
    const sets = [];
    const params = [id];
    const cols = ['user_id', 'name', 'phone', 'license_number', 'license_expiry', 'emergency_contact', 'date_of_birth', 'experience_years', 'status', 'school_id'];
    cols.forEach((c) => {
      if (fields[c] !== undefined) {
        params.push(fields[c]);
        sets.push(`${c} = $${params.length}`);
      }
    });
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = now()');
    const { rows } = await query(`UPDATE drivers SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  },
  async licenseExpiringSoon() {
    const { rows } = await query(
      `SELECT * FROM drivers WHERE license_expiry <= now() + interval '60 days' AND status != 'SUSPENDED'`
    );
    return rows;
  },
};

module.exports = Driver;