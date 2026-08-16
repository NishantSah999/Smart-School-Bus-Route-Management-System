const { query } = require('../config/db');
const { buildPagination, paginationMeta } = require('../utils/paginate');

const Maintenance = {
  async list({ page = 1, limit = 25, bus_id, status } = {}) {
    const conds = [];
    const params = [];
    if (bus_id) { params.push(bus_id); conds.push(`m.bus_id = $${params.length}`); }
    if (status) { params.push(status); conds.push(`m.status = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { offset } = buildPagination({ page, limit });
    const rowsRes = await query(
      `SELECT m.*, b.bus_number FROM maintenance m LEFT JOIN buses b ON b.id = m.bus_id
       ${where} ORDER BY m.service_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const totalRes = await query(`SELECT count(*)::int AS total FROM maintenance m ${where}`, params);
    return { data: rowsRes.rows, pagination: paginationMeta(page, limit, totalRes.rows[0].total) };
  },
  async findById(id) {
    const { rows } = await query(
      `SELECT m.*, b.bus_number FROM maintenance m LEFT JOIN buses b ON b.id = m.bus_id WHERE m.id = $1`,
      [id]
    );
    return rows[0];
  },
  async create(fields, createdBy) {
    const { rows } = await query(
      `INSERT INTO maintenance (bus_id, service_date, next_service, odometer, status, oil, tyres, brakes, battery, insurance_due, registration_due, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [fields.bus_id, fields.service_date, fields.next_service ?? null, fields.odometer ?? null, fields.status ?? 'GOOD', fields.oil ?? null, fields.tyres ?? null, fields.brakes ?? null, fields.battery ?? null, fields.insurance_due ?? null, fields.registration_due ?? null, fields.remarks ?? null, createdBy ?? null]
    );
    return rows[0];
  },
  async update(id, fields) {
    const sets = [];
    const params = [id];
    const cols = ['bus_id', 'service_date', 'next_service', 'odometer', 'status', 'oil', 'tyres', 'brakes', 'battery', 'insurance_due', 'registration_due', 'remarks'];
    cols.forEach((c) => {
      if (fields[c] !== undefined) {
        params.push(fields[c]);
        sets.push(`${c} = $${params.length}`);
      }
    });
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = now()');
    const { rows } = await query(`UPDATE maintenance SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  },
  async dueSoon() {
    const { rows } = await query(
      `SELECT m.*, b.bus_number FROM maintenance m JOIN buses b ON b.id = m.bus_id
       WHERE m.next_service IS NOT NULL AND m.next_service <= now()::date + interval '30 days'`
    );
    return rows;
  },
};

module.exports = Maintenance;