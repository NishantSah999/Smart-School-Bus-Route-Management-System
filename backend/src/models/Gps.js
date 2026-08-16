const { query } = require('../config/db');

const Gps = {
  async insert({ bus_id, device_id, latitude, longitude, speed, heading, accuracy, timestamp }) {
    const { rows } = await query(
      `INSERT INTO gps_updates (bus_id, device_id, latitude, longitude, speed, heading, accuracy, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8::timestamptz, now())) RETURNING *`,
      [bus_id, device_id ?? null, latitude, longitude, speed ?? 0, heading ?? 0, accuracy ?? null, timestamp ?? null]
    );
    return rows[0];
  },
  async history(busId, { from, to, limit = 500 } = {}) {
    const conds = ['bus_id = $1'];
    const params = [busId];
    if (from) { params.push(from); conds.push(`timestamp >= $${params.length}`); }
    if (to) { params.push(to); conds.push(`timestamp <= $${params.length}`); }
    const { rows } = await query(
      `SELECT id, bus_id, latitude, longitude, speed, heading, timestamp
       FROM gps_updates WHERE ${conds.join(' AND ')} ORDER BY timestamp DESC LIMIT $${params.length + 1}`,
      [...params, limit]
    );
    return rows.reverse();
  },
  async latest(busId) {
    const { rows } = await query(
      'SELECT * FROM gps_updates WHERE bus_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [busId]
    );
    return rows[0];
  },
};

module.exports = Gps;