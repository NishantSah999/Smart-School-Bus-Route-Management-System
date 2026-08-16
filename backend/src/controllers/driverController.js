const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await Driver.list({
    page: req.query.page, limit: req.query.limit, search: req.query.search,
    status: req.query.status, school_id: req.query.school_id || req.user.school_id,
  });
  res.status(200).json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) throw new AppError(404, 'Driver not found', 'NOT_FOUND');
  const [tripHistory, safetyHistory] = await Promise.all([
    Trip.list({ driver_id: driver.id, limit: 10 }).then((r) => r.data),
    Alert.list({ driver_id: driver.id, limit: 20 }).then((r) => r.data),
  ]);
  const licenseDays = Math.round((new Date(driver.license_expiry) - Date.now()) / 86400000);
  res.status(200).json({
    data: { ...driver, license_days_left: licenseDays, license_expiring: licenseDays <= 60, trip_history: tripHistory, safety_history: safetyHistory },
  });
});

const create = asyncHandler(async (req, res) => {
  const driver = await Driver.create({ ...req.body, school_id: req.body.school_id || req.user.school_id });
  await AuditLog.record({ user_id: req.user.id, action: 'CREATE', entity: 'driver', entity_id: driver.id, ip: req.ip, metadata: { name: driver.name } });
  res.status(201).json({ data: driver });
});

const update = asyncHandler(async (req, res) => {
  const driver = await Driver.update(req.params.id, req.body);
  if (!driver) throw new AppError(404, 'Driver not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'UPDATE', entity: 'driver', entity_id: driver.id, ip: req.ip });
  res.status(200).json({ data: driver });
});

const remove = asyncHandler(async (req, res) => {
  const driver = await Driver.update(req.params.id, { status: 'SUSPENDED' });
  if (!driver) throw new AppError(404, 'Driver not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'DEACTIVATE', entity: 'driver', entity_id: driver.id, ip: req.ip });
  res.status(200).json({ data: driver });
});

module.exports = { list, getById, create, update, remove };