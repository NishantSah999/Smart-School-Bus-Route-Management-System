// Role-based data scoping helpers — DRIVER users only ever see their own bus/trips/students.
const { query } = require('../config/db');

async function driverIdFor(userId) {
  if (!userId) return null;
  const { rows } = await query('SELECT id FROM drivers WHERE user_id = $1', [userId]);
  return rows.length ? rows[0].id : null;
}

async function busIdForDriver(userId) {
  if (!userId) return null;
  const { rows } = await query(
    'SELECT b.id FROM buses b JOIN drivers d ON d.id = b.driver_id WHERE d.user_id = $1 LIMIT 1',
    [userId]
  );
  return rows.length ? rows[0].id : null;
}

// If the requester is a driver, force scope onto their own records.
async function scopeDriver(req, overrides = {}) {
  if (req.user.role !== 'DRIVER') return overrides;
  const [driverId, busId] = await Promise.all([
    driverIdFor(req.user.id),
    busIdForDriver(req.user.id),
  ]);
  return { ...overrides, driver_id: driverId, bus_id: busId };
}

module.exports = { driverIdFor, busIdForDriver, scopeDriver };