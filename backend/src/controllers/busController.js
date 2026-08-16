const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const Gps = require('../models/Gps');
const Maintenance = require('../models/Maintenance');
const Student = require('../models/Student');
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await Bus.list({
    page: req.query.page, limit: req.query.limit, search: req.query.search,
    status: req.query.status, school_id: req.query.school_id || req.user.school_id, driver_id: req.query.driver_id,
  });
  res.status(200).json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);
  if (!bus) throw new AppError(404, 'Bus not found', 'NOT_FOUND');
  const [passengerCount, activeTrip, tripHistory, maintenance, recentAlerts] = await Promise.all([
    Student.countByBus(bus.id),
    Trip.activeForBus(bus.id),
    Trip.list({ bus_id: bus.id, limit: 10 }).then((r) => r.data),
    Maintenance.list({ bus_id: bus.id, limit: 10 }).then((r) => r.data),
    Alert.list({ bus_id: bus.id, limit: 10 }).then((r) => r.data),
  ]);
  res.status(200).json({
    data: {
      ...bus,
      passenger_count: passengerCount,
      active_trip: activeTrip,
      trip_history: tripHistory,
      maintenance: maintenance,
      recent_alerts: recentAlerts,
    },
  });
});

const create = asyncHandler(async (req, res) => {
  if (req.body.driver_id) {
    const driver = await Driver.findById(req.body.driver_id);
    if (!driver) throw new AppError(400, 'Assigned driver does not exist', 'VALIDATION_ERROR');
  }
  const bus = await Bus.create({ ...req.body, school_id: req.body.school_id || req.user.school_id });
  await AuditLog.record({ user_id: req.user.id, action: 'CREATE', entity: 'bus', entity_id: bus.id, ip: req.ip, metadata: { bus_number: bus.bus_number } });
  res.status(201).json({ data: bus });
});

const update = asyncHandler(async (req, res) => {
  const bus = await Bus.update(req.params.id, req.body);
  if (!bus) throw new AppError(404, 'Bus not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'UPDATE', entity: 'bus', entity_id: bus.id, ip: req.ip });
  res.status(200).json({ data: bus });
});

// Assign a driver to a bus, clearing any previous assignment.
const assignDriver = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);
  if (!bus) throw new AppError(404, 'Bus not found', 'NOT_FOUND');
  const driver = await Driver.findById(req.body.driver_id);
  if (!driver) throw new AppError(400, 'Driver not found', 'NOT_FOUND');
  const updated = await Bus.update(bus.id, { driver_id: driver.id, status: bus.status });
  await AuditLog.record({ user_id: req.user.id, action: 'ASSIGN_DRIVER', entity: 'bus', entity_id: bus.id, ip: req.ip, metadata: { driver_id: driver.id } });
  res.status(200).json({ data: updated });
});

const deactivate = asyncHandler(async (req, res) => {
  const bus = await Bus.update(req.params.id, { status: 'OFFLINE' });
  if (!bus) throw new AppError(404, 'Bus not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'DEACTIVATE', entity: 'bus', entity_id: bus.id, ip: req.ip });
  res.status(200).json({ data: bus });
});

const locationHistory = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);
  if (!bus) throw new AppError(404, 'Bus not found', 'NOT_FOUND');
  const history = await Gps.history(bus.id, { from: req.query.from, to: req.query.to, limit: req.query.limit || 500 });
  res.status(200).json({ data: history });
});

module.exports = { list, getById, create, update, assignDriver, deactivate, locationHistory };