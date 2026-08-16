const { query } = require('../config/db');

const Attendance = {
  async record({ student_id, trip_id, bus_id, stop_id, status, latitude, longitude, method, timestamp }) {
    const { rows } = await query(
      `INSERT INTO attendance (student_id, trip_id, bus_id, stop_id, status, latitude, longitude, method, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9::timestamptz, now()))
       ON CONFLICT DO NOTHING RETURNING *`,
      [student_id, trip_id ?? null, bus_id ?? null, stop_id ?? null, status, latitude ?? null, longitude ?? null, method ?? 'MANUAL', timestamp ?? null]
    );
    return rows[0];
  },
  async latestByStudent(studentId, limit = 30) {
    const { rows } = await query(
      `SELECT a.*, b.bus_number, s.name AS stop_name
       FROM attendance a
       LEFT JOIN buses b ON b.id = a.bus_id
       LEFT JOIN stops s ON s.id = a.stop_id
       WHERE a.student_id = $1 ORDER BY a.timestamp DESC LIMIT $2`,
      [studentId, limit]
    );
    return rows;
  },
  async todayByStudent(studentId) {
    const { rows } = await query(
      `SELECT a.*, t.trip_type FROM attendance a
       LEFT JOIN trips t ON t.id = a.trip_id
       WHERE a.student_id = $1 AND a.timestamp::date = CURRENT_DATE
       ORDER BY a.timestamp ASC`,
      [studentId]
    );
    return rows;
  },
  async todayCountsByBus(busId) {
    const { rows } = await query(
      `SELECT status, count(*)::int AS c FROM attendance
       WHERE bus_id = $1 AND timestamp::date = CURRENT_DATE GROUP BY status`,
      [busId]
    );
    return rows;
  },
  async todayCounts({ school_id } = {}) {
    const conds = [];
    const params = [];
    if (school_id) { params.push(school_id); conds.push(`s.school_id = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT a.status, count(*)::int AS c
       FROM attendance a JOIN students s ON s.id = a.student_id
       WHERE a.timestamp::date = CURRENT_DATE ${where ? 'AND ' + where.slice(6) : ''}
       GROUP BY a.status`,
      params
    );
    return rows;
  },
};

module.exports = Attendance;