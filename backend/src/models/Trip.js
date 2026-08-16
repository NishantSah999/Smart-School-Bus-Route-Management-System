const { query } = require('../config/db');

const Trip = {
  async list({ page = 1, limit = 25, bus_id, route_id, driver_id, status, date, school_id } = {}) {
    const conds = [];
    const params = [];
    if (bus_id) { params.push(bus_id); conds.push(`t.bus_id = $${params.length}`); }
    if (route_id) { params.push(route_id); conds.push(`t.route_id = $${params.length}`); }
    if (driver_id) { params.push(driver_id); conds.push(`t.driver_id = $${params.length}`); }
    if (status) { params.push(status); conds.push(`t.status = $${params.length}`); }
    if (date) { params.push(date); conds.push(`t.start_time::date = $${params.length}`); }
    if (school_id) { params.push(school_id); conds.push(`b.school_id = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { offset } = require('../utils/paginate').buildPagination({ page, limit });
    const rowsRes = await query(
      `SELECT t.*, b.bus_number, d.name AS driver_name, r.name AS route_name
       FROM trips t
       LEFT JOIN buses b ON b.id = t.bus_id
       LEFT JOIN drivers d ON d.id = t.driver_id
       LEFT JOIN routes r ON r.id = t.route_id
       ${where} ORDER BY t.start_time DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const totalRes = await query(`SELECT count(*)::int AS total FROM trips t LEFT JOIN buses b ON b.id = t.bus_id ${where}`, params);
    return {
      data: rowsRes.rows,
      pagination: { page, limit, total: totalRes.rows[0].total, totalPages: Math.max(1, Math.ceil(totalRes.rows[0].total / limit)) },
    };
  },
  async findById(id) {
    const { rows } = await query(
      `SELECT t.*, b.bus_number, d.name AS driver_name, r.name AS route_name
       FROM trips t
       LEFT JOIN buses b ON b.id = t.bus_id
       LEFT JOIN drivers d ON d.id = t.driver_id
       LEFT JOIN routes r ON r.id = t.route_id
       WHERE t.id = $1`,
      [id]
    );
    return rows[0];
  },
  async activeForBus(busId) {
    const { rows } = await query(
      `SELECT * FROM trips WHERE bus_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
      [busId]
    );
    return rows[0];
  },
  async start(fields) {
    const { rows } = await query(
      `INSERT INTO trips (bus_id, driver_id, route_id, trip_type, status, start_time, start_latitude, start_longitude, passenger_count)
       VALUES ($1,$2,$3,$4,'ACTIVE',now(),$5,$6,$7) RETURNING *`,
      [fields.bus_id, fields.driver_id ?? null, fields.route_id ?? null, fields.trip_type ?? 'MORNING', fields.start_latitude ?? null, fields.start_longitude ?? null, fields.passenger_count ?? 0]
    );
    return rows[0];
  },
  async end(id, { end_latitude, end_longitude, distance, duration }) {
    const { rows } = await query(
      `UPDATE trips SET status='COMPLETED', end_time=now(),
         end_latitude = COALESCE($2, end_latitude), end_longitude = COALESCE($3, end_longitude),
         distance = COALESCE($4, distance), duration = COALESCE($5, duration), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, end_latitude ?? null, end_longitude ?? null, distance ?? null, duration ?? null]
    );
    return rows[0];
  },
  async todayStats() {
    const { rows } = await query(
      `SELECT
         (SELECT count(*)::int FROM trips WHERE start_time::date = CURRENT_DATE) AS total_today,
         (SELECT count(*)::int FROM trips WHERE status = 'ACTIVE') AS active_now,
         (SELECT count(*)::int FROM trips WHERE status = 'ACTIVE' AND end_time IS NULL AND start_time::date = CURRENT_DATE) AS active_today`
    );
    return rows[0];
  },
};

module.exports = Trip;