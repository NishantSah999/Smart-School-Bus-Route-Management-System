const Stop = require('../models/Stop');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const getById = asyncHandler(async (req, res) => {
  const stop = await Stop.findById(req.params.id);
  if (!stop) throw new AppError(404, 'Stop not found', 'NOT_FOUND');
  res.status(200).json({ data: stop });
});

const update = asyncHandler(async (req, res) => {
  const stop = await Stop.update(req.params.id, req.body);
  if (!stop) throw new AppError(404, 'Stop not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'UPDATE', entity: 'stop', entity_id: stop.id, ip: req.ip });
  res.status(200).json({ data: stop });
});

const remove = asyncHandler(async (req, res) => {
  const stop = await Stop.findById(req.params.id);
  if (!stop) throw new AppError(404, 'Stop not found', 'NOT_FOUND');
  await Stop.remove(req.params.id);
  await AuditLog.record({ user_id: req.user.id, action: 'DELETE', entity: 'stop', entity_id: req.params.id, ip: req.ip });
  res.status(204).send();
});

module.exports = { getById, update, remove };