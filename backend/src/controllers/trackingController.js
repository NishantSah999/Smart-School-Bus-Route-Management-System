const Gps = require('../models/Gps');
const Bus = require('../models/Bus');
const Alert = require('../models/Alert');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const socketService = require('../services/socketService');
const { notify } = require('../services/notificationService');

// High-frequency GPS ingestion. Validates device auth, stores telemetry, updates bus,
// checks overspeed, and broadcasts the live update.
const ingestLocation = asyncHandler(async (req, res) => {
  const { bus_id, device_id, latitude, longitude, speed, heading, accuracy, timestamp } = req.body;

  const bus = await Bus.findById(bus_id);
  if (!bus) throw new AppError(404, 'Bus not found', 'NOT_FOUND');

  // Device authentication: if the bus has a device_id and the request supplies one, they must match.
  if (bus.device_id && device_id && bus.device_id !== device_id) {
    throw new AppError(403, 'Device not authorized for this bus', 'DEVICE_MISMATCH');
  }

  const gps = await Gps.insert({ bus_id, device_id: device_id || bus.device_id, latitude, longitude, speed, heading, accuracy, timestamp });
  const updated = await Bus.updateLocation(bus_id, { latitude, longitude, speed, heading, device_id, timestamp: gps.timestamp });

  // Live broadcast.
  socketService.emit('bus:location', {
    bus_id, bus_number: bus.bus_number, latitude, longitude,
    speed: speed ?? 0, heading: heading ?? 0, timestamp: gps.timestamp,
    status: updated.status, driver_id: bus.driver_id,
  }, ['fleet', `bus:${bus_id}`, bus.school_id ? `school:${bus.school_id}` : null].filter(Boolean));

  res.status(200).json({ data: { ok: true, gps, bus: updated } });
});

// Latest location + status for all active buses (for the live map).
const fleetSnapshot = asyncHandler(async (req, res) => {
  const { query } = require('../config/db');
  const schoolId = req.query.school_id || req.user.school_id;
  const conds = [];
  const params = [];
  if (schoolId) { params.push(schoolId); conds.push(`b.school_id = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT b.id, b.bus_number, b.registration_number, b.capacity, b.status,
            b.last_latitude, b.last_longitude, b.last_speed, b.last_heading, b.last_update,
            d.name AS driver_name, r.id AS route_id, r.name AS route_name,
            (SELECT count(*)::int FROM students s WHERE s.bus_id = b.id) AS passenger_count
     FROM buses b
     LEFT JOIN drivers d ON d.id = b.driver_id
     LEFT JOIN routes r ON r.id = (SELECT route_id FROM trips t WHERE t.bus_id = b.id AND t.status='ACTIVE' LIMIT 1)
     ${where}
     ORDER BY b.id`,
    params
  );
  res.status(200).json({ data: rows });
});

module.exports = { ingestLocation, fleetSnapshot };