const School = require('../models/School');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await School.list({ page: req.query.page, limit: req.query.limit, search: req.query.search });
  res.status(200).json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) throw new AppError(404, 'School not found', 'NOT_FOUND');
  res.status(200).json({ data: school });
});

const create = asyncHandler(async (req, res) => {
  const school = await School.create(req.body);
  await AuditLog.record({ user_id: req.user.id, action: 'CREATE', entity: 'school', entity_id: school.id, ip: req.ip });
  res.status(201).json({ data: school });
});

const update = asyncHandler(async (req, res) => {
  const school = await School.update(req.params.id, req.body);
  if (!school) throw new AppError(404, 'School not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'UPDATE', entity: 'school', entity_id: school.id, ip: req.ip });
  res.status(200).json({ data: school });
});

module.exports = { list, getById, create, update };