const { query } = require('../config/db');
const { buildPagination, paginationMeta } = require('../utils/paginate');

const Student = {
  async list({ page = 1, limit = 25, search = '', grade, route_id, bus_id, status, school_id } = {}) {
    const conds = [];
    const params = [];
    if (search) { params.push(`%${search}%`); conds.push(`(s.name ILIKE $${params.length} OR s.student_id ILIKE $${params.length})`); }
    if (grade) { params.push(grade); conds.push(`s.grade = $${params.length}`); }
    if (route_id) { params.push(route_id); conds.push(`s.route_id = $${params.length}`); }
    if (bus_id) { params.push(bus_id); conds.push(`s.bus_id = $${params.length}`); }
    if (status) { params.push(status); conds.push(`s.status = $${params.length}`); }
    if (school_id) { params.push(school_id); conds.push(`s.school_id = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const countRes = await query(`SELECT count(*)::int AS total FROM students s ${where}`, params);
    const { offset } = buildPagination({ page, limit });
    const rowsRes = await query(
      `SELECT s.*, b.bus_number, r.name AS route_name,
         p.name AS parent_name, p.phone AS parent_phone, p.emergency_contact,
         pst.name AS pickup_stop, dst.name AS drop_stop
       FROM students s
       LEFT JOIN buses b ON b.id = s.bus_id
       LEFT JOIN routes r ON r.id = s.route_id
       LEFT JOIN parents p ON p.id = s.parent_id
       LEFT JOIN stops pst ON pst.id = s.pickup_stop_id
       LEFT JOIN stops dst ON dst.id = s.drop_stop_id
       ${where} ORDER BY s.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return { data: rowsRes.rows, pagination: paginationMeta(page, limit, countRes.rows[0].total) };
  },
  async findById(id) {
    const { rows } = await query(
      `SELECT s.*, b.bus_number, r.name AS route_name,
         p.name AS parent_name, p.phone AS parent_phone, p.emergency_contact, p.user_id AS parent_user_id,
         pst.name AS pickup_stop, pst.latitude AS pickup_lat, pst.longitude AS pickup_lng,
         dst.name AS drop_stop, dst.latitude AS drop_lat, dst.longitude AS drop_lng
       FROM students s
       LEFT JOIN buses b ON b.id = s.bus_id
       LEFT JOIN routes r ON r.id = s.route_id
       LEFT JOIN parents p ON p.id = s.parent_id
       LEFT JOIN stops pst ON pst.id = s.pickup_stop_id
       LEFT JOIN stops dst ON dst.id = s.drop_stop_id
       WHERE s.id = $1`,
      [id]
    );
    return rows[0];
  },
  async create(fields) {
    const { rows } = await query(
      `INSERT INTO students (student_id, name, date_of_birth, gender, grade, section, school_id, parent_id, route_id, bus_id, pickup_stop_id, drop_stop_id, photo, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [fields.student_id, fields.name, fields.date_of_birth ?? null, fields.gender ?? null, fields.grade ?? null, fields.section ?? null, fields.school_id ?? null, fields.parent_id ?? null, fields.route_id ?? null, fields.bus_id ?? null, fields.pickup_stop_id ?? null, fields.drop_stop_id ?? null, fields.photo ?? null, fields.status ?? 'ACTIVE']
    );
    return rows[0];
  },
  async update(id, fields) {
    const sets = [];
    const params = [id];
    const cols = ['student_id', 'name', 'date_of_birth', 'gender', 'grade', 'section', 'school_id', 'parent_id', 'route_id', 'bus_id', 'pickup_stop_id', 'drop_stop_id', 'photo', 'status'];
    cols.forEach((c) => {
      if (fields[c] !== undefined) {
        params.push(fields[c]);
        sets.push(`${c} = $${params.length}`);
      }
    });
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = now()');
    const { rows } = await query(`UPDATE students SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  },
  async countByBus(busId) {
    const { rows } = await query('SELECT count(*)::int AS c FROM students WHERE bus_id = $1', [busId]);
    return rows[0].c;
  },
};

module.exports = Student;