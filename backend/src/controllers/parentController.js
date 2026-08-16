const Parent = require('../models/Parent');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await Parent.list({ page: req.query.page, limit: req.query.limit, search: req.query.search });
  res.status(200).json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const parent = await Parent.findById(req.params.id);
  if (!parent) throw new AppError(404, 'Parent not found', 'NOT_FOUND');
  const { query } = require('../config/db');
  const { rows: students } = await query(
    `SELECT s.*, b.bus_number, r.name AS route_name FROM students s
     LEFT JOIN buses b ON b.id = s.bus_id
     LEFT JOIN routes r ON r.id = s.route_id
     WHERE s.parent_id = $1 ORDER BY s.name`,
    [parent.id]
  );
  res.status(200).json({ data: { ...parent, students } });
});

const create = asyncHandler(async (req, res) => {
  const parent = await Parent.create(req.body);
  await AuditLog.record({ user_id: req.user.id, action: 'CREATE', entity: 'parent', entity_id: parent.id, ip: req.ip });
  res.status(201).json({ data: parent });
});

const update = asyncHandler(async (req, res) => {
  const parent = await Parent.update(req.params.id, req.body);
  if (!parent) throw new AppError(404, 'Parent not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'UPDATE', entity: 'parent', entity_id: parent.id, ip: req.ip });
  res.status(200).json({ data: parent });
});

module.exports = { list, getById, create, update };