const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const socketService = require('../services/socketService');
const { notify } = require('../services/notificationService');

const list = asyncHandler(async (req, res) => {
  const data = await Trip.list({
    page: req.query.page, limit: req.query.limit, bus_id: req.query.bus_id,
    route_id: req.query.route_id, driver_id: req.query.driver_id, status: req.query.status,
    date: req.query.date, school_id: req.user.school_id,
  });
  res.status(200).json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw new AppError(404, 'Trip not found', 'NOT_FOUND');
  res.status(200).json({ data: trip });
});

const start = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.body.bus_id);
  if (!bus) throw new AppError(404, 'Bus not found', 'NOT_FOUND');
  const existing = await Trip.activeForBus(bus.id);
  if (existing) throw new AppError(409, 'Bus already has an active trip', 'TRIP_IN_PROGRESS');

  const driverId = req.body.driver_id || bus.driver_id;
  const trip = await Trip.start({ ...req.body, driver_id: driverId });
  await Bus.update(bus.id, { status: 'ON_ROUTE' });

  socketService.emit('trip:started', trip, ['fleet', `bus:${bus.id}`, bus.school_id ? `school:${bus.school_id}` : null].filter(Boolean));
  if (bus.school_id) {
    await notify({
      user_id: null, title: `Trip started — ${bus.bus_number}`, body: `Bus ${bus.bus_number} has started a ${trip.trip_type} trip.`,
      type: 'TRIP', socketIO: require('../services/socketService').getIO(), to: `school:${bus.school_id}`,
    });
  }

  res.status(201).json({ data: trip });
});

const end = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw new AppError(404, 'Trip not found', 'NOT_FOUND');
  if (trip.status !== 'ACTIVE') throw new AppError(400, 'Trip is not active', 'TRIP_NOT_ACTIVE');

  const ended = await Trip.end(trip.id, req.body);
  await Bus.update(trip.bus_id, { status: 'IDLE' });

  socketService.emit('trip:ended', ended, ['fleet', `bus:${trip.bus_id}`]);
  res.status(200).json({ data: ended });
});

module.exports = { list, getById, start, end };