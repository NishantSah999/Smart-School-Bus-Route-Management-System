const { query } = require('../config/db');

const Stop = {
  async listByRoute(routeId) {
    const { rows } = await query('SELECT * FROM stops WHERE route_id = $1 ORDER BY sequence ASC', [routeId]);
    return rows;
  },
  async findById(id) {
    const { rows } = await query('SELECT * FROM stops WHERE id = $1', [id]);
    return rows[0];
  },
  async create(fields) {
    const { rows } = await query(
      `INSERT INTO stops (route_id, name, address, latitude, longitude, sequence, estimated_arrival, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [fields.route_id, fields.name, fields.address, fields.latitude, fields.longitude, fields.sequence ?? 0, fields.estimated_arrival ?? null, fields.status ?? 'ACTIVE']
    );
    return rows[0];
  },
  async update(id, fields) {
    const sets = [];
    const params = [id];
    const cols = ['route_id', 'name', 'address', 'latitude', 'longitude', 'sequence', 'estimated_arrival', 'status'];
    cols.forEach((c) => {
      if (fields[c] !== undefined) {
        params.push(fields[c]);
        sets.push(`${c} = $${params.length}`);
      }
    });
    if (!sets.length) return this.findById(id);
    const { rows } = await query(`UPDATE stops SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  },
  async reorder(routeId, ids) {
    const client = await query('BEGIN').catch(() => null);
    // Reorder inside a transaction using the shared pool is unsafe; run sequentially instead.
    for (let i = 0; i < ids.length; i++) {
      await query('UPDATE stops SET sequence = $1 WHERE id = $2 AND route_id = $3', [i + 1, ids[i], routeId]);
    }
    return this.listByRoute(routeId);
  },
  async remove(id) {
    await query('DELETE FROM stops WHERE id = $1', [id]);
  },
};

module.exports = Stop;