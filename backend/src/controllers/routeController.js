const Route = require('../models/Route');
const Stop = require('../models/Stop');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await Route.list({
    page: req.query.page, limit: req.query.limit, search: req.query.search,
    school_id: req.query.school_id || req.user.school_id,
  });
  res.status(200).json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const route = await Route.listWithStops(req.params.id);
  if (!route) throw new AppError(404, 'Route not found', 'NOT_FOUND');
  res.status(200).json({ data: route });
});

const create = asyncHandler(async (req, res) => {
  const route = await Route.create({ ...req.body, school_id: req.body.school_id || req.user.school_id });
  await AuditLog.record({ user_id: req.user.id, action: 'CREATE', entity: 'route', entity_id: route.id, ip: req.ip, metadata: { code: route.route_code } });
  res.status(201).json({ data: route });
});

const update = asyncHandler(async (req, res) => {
  const route = await Route.update(req.params.id, req.body);
  if (!route) throw new AppError(404, 'Route not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'UPDATE', entity: 'route', entity_id: route.id, ip: req.ip });
  res.status(200).json({ data: route });
});

// --- stops within a route ---
const listStops = asyncHandler(async (req, res) => {
  const stops = await Stop.listByRoute(req.params.id);
  res.status(200).json({ data: stops });
});

const addStop = asyncHandler(async (req, res) => {
  const route = await Route.findById(req.params.id);
  if (!route) throw new AppError(404, 'Route not found', 'NOT_FOUND');
  const stop = await Stop.create({ ...req.body, route_id: route.id });
  await AuditLog.record({ user_id: req.user.id, action: 'CREATE', entity: 'stop', entity_id: stop.id, ip: req.ip });
  res.status(201).json({ data: stop });
});

const reorderStops = asyncHandler(async (req, res) => {
  const route = await Route.findById(req.params.id);
  if (!route) throw new AppError(404, 'Route not found', 'NOT_FOUND');
  const stops = await Stop.reorder(route.id, req.body.ids);
  res.status(200).json({ data: stops });
});

module.exports = { list, getById, create, update, listStops, addStop, reorderStops };