const { query } = require('../config/db');
const { buildPagination, paginationMeta } = require('../utils/paginate');

const Bus = {
  async list({ page = 1, limit = 25, search = '', status, school_id, driver_id } = {}) {
    const conds = [];
    const params = [];
    if (search) { params.push(`%${search}%`); conds.push(`(b.bus_number ILIKE $${params.length} OR b.registration_number ILIKE $${params.length})`); }
    if (status) { params.push(status); conds.push(`b.status = $${params.length}`); }
    if (school_id) { params.push(school_id); conds.push(`b.school_id = $${params.length}`); }
    if (driver_id) { params.push(driver_id); conds.push(`b.driver_id = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const countRes = await query(`SELECT count(*)::int AS total FROM buses b ${where}`, params);
    const { offset } = buildPagination({ page, limit });
    const rowsRes = await query(
      `SELECT b.*, d.name AS driver_name, r.id AS route_id, r.name AS route_name,
        (SELECT count(*)::int FROM students s WHERE s.bus_id = b.id) AS passenger_count
       FROM buses b
       LEFT JOIN drivers d ON d.id = b.driver_id
       LEFT JOIN routes r ON r.id = (SELECT route_id FROM trips t WHERE t.bus_id = b.id AND t.status='ACTIVE' LIMIT 1)
       ${where} ORDER BY b.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return { data: rowsRes.rows, pagination: paginationMeta(page, limit, countRes.rows[0].total) };
  },
  async findById(id) {
    const { rows } = await query(
      `SELECT b.*, d.name AS driver_name, r.id AS route_id, r.name AS route_name
       FROM buses b
       LEFT JOIN drivers d ON d.id = b.driver_id
       LEFT JOIN routes r ON r.id = (SELECT route_id FROM trips t WHERE t.bus_id = b.id AND t.status='ACTIVE' LIMIT 1)
       WHERE b.id = $1`,
      [id]
    );
    return rows[0];
  },
  async create(fields) {
    const cols = ['bus_number', 'registration_number', 'model', 'capacity', 'device_id', 'driver_id', 'school_id', 'status', 'fuel_type'];
    const params = cols.map((c) => fields[c] ?? null);
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const { rows } = await query(
      `INSERT INTO buses (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      params
    );
    return rows[0];
  },
  async update(id, fields) {
    const sets = [];
    const params = [id];
    const cols = ['bus_number', 'registration_number', 'model', 'capacity', 'device_id', 'driver_id', 'school_id', 'status', 'fuel_type', 'odometer'];
    cols.forEach((c) => {
      if (fields[c] !== undefined) {
        params.push(fields[c]);
        sets.push(`${c} = $${params.length}`);
      }
    });
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = now()');
    const { rows } = await query(`UPDATE buses SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  },
  async updateLocation(busId, { latitude, longitude, speed, heading, device_id, timestamp }) {
    const ts = timestamp ? new Date(timestamp) : new Date();
    const { rows } = await query(
      `UPDATE buses SET last_latitude = $2, last_longitude = $3, last_speed = $4, last_heading = $5,
         last_update = $6, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [busId, latitude, longitude, speed ?? 0, heading ?? 0, ts]
    );
    return rows[0];
  },
};

module.exports = Bus;