const { query } = require('../config/db');
const { buildPagination, paginationMeta } = require('../utils/paginate');

const Alert = {
  async list({ page = 1, limit = 25, status, type, severity, bus_id, school_id, date } = {}) {
    const conds = [];
    const params = [];
    if (status) { params.push(status); conds.push(`a.status = $${params.length}`); }
    if (type) { params.push(type); conds.push(`a.type = $${params.length}`); }
    if (severity) { params.push(severity); conds.push(`a.severity = $${params.length}`); }
    if (bus_id) { params.push(bus_id); conds.push(`a.bus_id = $${params.length}`); }
    if (school_id) { params.push(school_id); conds.push(`b.school_id = $${params.length}`); }
    if (date) { params.push(date); conds.push(`a.created_at::date = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { offset } = buildPagination({ page, limit });
    const rowsRes = await query(
      `SELECT a.*, b.bus_number, d.name AS driver_name, r.name AS route_name, u.name AS resolved_by_name
       FROM alerts a
       LEFT JOIN buses b ON b.id = a.bus_id
       LEFT JOIN drivers d ON d.id = a.driver_id
       LEFT JOIN routes r ON r.id = a.route_id
       LEFT JOIN users u ON u.id = a.resolved_by
       ${where} ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const totalRes = await query(
      `SELECT count(*)::int AS total FROM alerts a LEFT JOIN buses b ON b.id = a.bus_id ${where}`,
      params
    );
    return { data: rowsRes.rows, pagination: paginationMeta(page, limit, totalRes.rows[0].total) };
  },
  async findById(id) {
    const { rows } = await query(
      `SELECT a.*, b.bus_number, d.name AS driver_name FROM alerts a
       LEFT JOIN buses b ON b.id = a.bus_id
       LEFT JOIN drivers d ON d.id = a.driver_id
       WHERE a.id = $1`,
      [id]
    );
    return rows[0];
  },
  async create(fields) {
    const { rows } = await query(
      `INSERT INTO alerts (type, severity, bus_id, driver_id, route_id, latitude, longitude, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [fields.type, fields.severity ?? 'WARNING', fields.bus_id ?? null, fields.driver_id ?? null, fields.route_id ?? null, fields.latitude ?? null, fields.longitude ?? null, fields.message ?? null]
    );
    return rows[0];
  },
  async countBy({ status, severity, type } = {}) {
    const conds = [];
    const params = [];
    if (status) { params.push(status); conds.push(`status = $${params.length}`); }
    if (severity) { params.push(severity); conds.push(`severity = $${params.length}`); }
    if (type) { params.push(type); conds.push(`type = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(`SELECT count(*)::int AS c FROM alerts ${where}`, params);
    return rows[0].c;
  },
  async countToday() {
    const { rows } = await query('SELECT count(*)::int AS c FROM alerts WHERE created_at::date = CURRENT_DATE');
    return rows[0].c;
  },
  async setStatus(id, status, resolvedBy) {
    const { rows } = await query(
      `UPDATE alerts SET status = $2, resolved_at = CASE WHEN $2 = 'RESOLVED' THEN now() ELSE resolved_at END,
         resolved_by = CASE WHEN $2 = 'RESOLVED' THEN $3 ELSE resolved_by END
       WHERE id = $1 RETURNING *`,
      [id, status, resolvedBy ?? null]
    );
    return rows[0];
  },
};

module.exports = Alert;