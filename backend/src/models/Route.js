const { query } = require('../config/db');
const { buildPagination, paginationMeta } = require('../utils/paginate');

const Route = {
  async list({ page = 1, limit = 25, search = '', school_id } = {}) {
    const conds = [];
    const params = [];
    if (search) { params.push(`%${search}%`); conds.push(`(r.name ILIKE $${params.length} OR r.route_code ILIKE $${params.length})`); }
    if (school_id) { params.push(school_id); conds.push(`r.school_id = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const countRes = await query(`SELECT count(*)::int AS total FROM routes r ${where}`, params);
    const { offset } = buildPagination({ page, limit });
    const rowsRes = await query(
      `SELECT r.*,
         (SELECT count(*)::int FROM buses b WHERE b.id IN (SELECT DISTINCT bus_id FROM trips t WHERE t.route_id = r.id)) AS buses_count,
         (SELECT count(*)::int FROM stops s WHERE s.route_id = r.id) AS stops_count
       FROM routes r ${where} ORDER BY r.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return { data: rowsRes.rows, pagination: paginationMeta(page, limit, countRes.rows[0].total) };
  },
  async findById(id) {
    const { rows } = await query('SELECT * FROM routes WHERE id = $1', [id]);
    return rows[0];
  },
  async listWithStops(id) {
    const route = await this.findById(id);
    if (!route) return null;
    const stops = (await query(
      'SELECT * FROM stops WHERE route_id = $1 ORDER BY sequence ASC',
      [id]
    )).rows;
    return { ...route, stops };
  },
  async create(fields) {
    const cols = ['name', 'route_code', 'description', 'school_id', 'start_location', 'end_location', 'estimated_duration', 'distance', 'status', 'speed_limit'];
    const params = cols.map((c) => fields[c] ?? null);
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const { rows } = await query(
      `INSERT INTO routes (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      params
    );
    return rows[0];
  },
  async update(id, fields) {
    const sets = [];
    const params = [id];
    const cols = ['name', 'route_code', 'description', 'school_id', 'start_location', 'end_location', 'estimated_duration', 'distance', 'status', 'speed_limit'];
    cols.forEach((c) => {
      if (fields[c] !== undefined) {
        params.push(fields[c]);
        sets.push(`${c} = $${params.length}`);
      }
    });
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = now()');
    const { rows } = await query(`UPDATE routes SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  },
};

module.exports = Route;