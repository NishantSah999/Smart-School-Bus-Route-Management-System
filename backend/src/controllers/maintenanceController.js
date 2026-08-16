const Maintenance = require('../models/Maintenance');
const Bus = require('../models/Bus');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../services/notificationService');
const socketService = require('../services/socketService');

const list = asyncHandler(async (req, res) => {
  const data = await Maintenance.list({ page: req.query.page, limit: req.query.limit, bus_id: req.query.bus_id, status: req.query.status });
  res.status(200).json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const record = await Maintenance.findById(req.params.id);
  if (!record) throw new AppError(404, 'Maintenance record not found', 'NOT_FOUND');
  res.status(200).json({ data: record });
});

const create = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.body.bus_id);
  if (!bus) throw new AppError(404, 'Bus not found', 'NOT_FOUND');
  const record = await Maintenance.create(req.body, req.user.id);
  await Bus.update(bus.id, { status: 'MAINTENANCE' });
  await AuditLog.record({ user_id: req.user.id, action: 'CREATE', entity: 'maintenance', entity_id: record.id, ip: req.ip, metadata: { bus_id: bus.id } });
  res.status(201).json({ data: record });
});

const update = asyncHandler(async (req, res) => {
  const record = await Maintenance.update(req.params.id, req.body);
  if (!record) throw new AppError(404, 'Maintenance record not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'UPDATE', entity: 'maintenance', entity_id: record.id, ip: req.ip });
  res.status(200).json({ data: record });
});

const dueSoon = asyncHandler(async (req, res) => {
  const records = await Maintenance.dueSoon();
  res.status(200).json({ data: records });
});

module.exports = { list, getById, create, update, dueSoon };