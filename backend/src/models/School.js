const { query } = require('../config/db');
const { buildPagination, paginationMeta } = require('../utils/paginate');

const School = {
  async list({ page = 1, limit = 25, search = '' } = {}) {
    const { offset } = buildPagination({ page, limit });
    const where = search ? 'WHERE name ILIKE $1 OR code ILIKE $1' : '';
    const params = search ? [`%${search}%`] : [];
    const base = where ? 'WHERE name ILIKE $1 OR code ILIKE $1' : '';
    const countRes = await query(`SELECT count(*)::int AS total FROM schools ${base}`, params);
    const rowsRes = await query(
      `SELECT * FROM schools ${where} ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return { data: rowsRes.rows, pagination: paginationMeta(page, limit, countRes.rows[0].total) };
  },
  async findById(id) {
    const { rows } = await query('SELECT * FROM schools WHERE id = $1', [id]);
    return rows[0];
  },
  async create({ name, code, address, phone, email, latitude, longitude }) {
    const { rows } = await query(
      `INSERT INTO schools (name, code, address, phone, email, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, code, address, phone, email, latitude ?? null, longitude ?? null]
    );
    return rows[0];
  },
  async update(id, fields) {
    const sets = [];
    const params = [id];
    const cols = ['name', 'code', 'address', 'phone', 'email', 'latitude', 'longitude', 'status'];
    cols.forEach((c) => {
      if (fields[c] !== undefined) {
        params.push(fields[c]);
        sets.push(`${c} = $${params.length}`);
      }
    });
    if (!sets.length) return this.findById(id);
    sets.push(`updated_at = now()`);
    const { rows } = await query(
      `UPDATE schools SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return rows[0];
  },
};

module.exports = School;