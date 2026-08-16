const Alert = require('../models/Alert');
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const socketService = require('../services/socketService');
const { notify } = require('../services/notificationService');

// Broadcast an alert to admins + the affected bus room.
async function broadcastAlert(alert, bus) {
  const rooms = ['fleet', bus?.school_id ? `school:${bus.school_id}` : null, alert.bus_id ? `bus:${alert.bus_id}` : null].filter(Boolean);
  socketService.emit('alert:new', alert, rooms);
  const title = `Alert: ${alert.type.replace(/_/g, ' ')}`;
  if (bus?.school_id) {
    await notify({
      user_id: null, title, body: alert.message || `${bus.bus_number}: ${alert.type}`,
      type: alert.severity, socketIO: socketService.getIO(), to: `school:${bus.school_id}`,
    });
  }
}

const list = asyncHandler(async (req, res) => {
  const data = await Alert.list({
    page: req.query.page, limit: req.query.limit, status: req.query.status,
    type: req.query.type, severity: req.query.severity, bus_id: req.query.bus_id,
    school_id: req.query.school_id || req.user.school_id, date: req.query.date,
  });
  res.status(200).json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new AppError(404, 'Alert not found', 'NOT_FOUND');
  res.status(200).json({ data: alert });
});

const create = asyncHandler(async (req, res) => {
  const alert = await Alert.create(req.body);
  const bus = req.body.bus_id ? await Bus.findById(req.body.bus_id) : null;
  await broadcastAlert(alert, bus);
  res.status(201).json({ data: alert });
});

const acknowledge = asyncHandler(async (req, res) => {
  const alert = await Alert.setStatus(req.params.id, 'ACKNOWLEDGED');
  if (!alert) throw new AppError(404, 'Alert not found', 'NOT_FOUND');
  socketService.emit('alert:acknowledged', alert, ['fleet']);
  res.status(200).json({ data: alert });
});

const resolve = asyncHandler(async (req, res) => {
  const alert = await Alert.setStatus(req.params.id, 'RESOLVED', req.user.id);
  if (!alert) throw new AppError(404, 'Alert not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'RESOLVE_ALERT', entity: 'alert', entity_id: alert.id, ip: req.ip });
  socketService.emit('alert:resolved', alert, ['fleet']);
  res.status(200).json({ data: alert });
});

// Drowsiness escalation endpoint used by the safety system.
const reportDrowsiness = asyncHandler(async (req, res) => {
  const { bus_id, driver_id, latitude, longitude, state } = req.body;
  const bus = bus_id ? await Bus.findById(bus_id) : null;
  const driver = driver_id ? await Driver.findById(driver_id) : null;
  const escalation = state === 'SOS';

  const alert = await Alert.create({
    type: 'DROWSINESS',
    severity: escalation ? 'CRITICAL' : 'WARNING',
    bus_id, driver_id,
    latitude, longitude,
    message: escalation
      ? `Driver drowsiness ESCALATED TO SOS — no acknowledgement. Bus ${bus?.bus_number || ''} driver ${driver?.name || ''}.`
      : `Driver drowsiness suspected on ${bus?.bus_number || 'bus'}. Awaiting driver acknowledgement.`,
  });
  await broadcastAlert(alert, bus);

  if (escalation) {
    socketService.emit('sos:triggered', { alert, bus, driver }, ['fleet', bus?.school_id ? `school:${bus.school_id}` : null].filter(Boolean));
  }

  res.status(201).json({ data: { alert, escalated: escalation } });
});

module.exports = { list, getById, create, acknowledge, resolve, reportDrowsiness };