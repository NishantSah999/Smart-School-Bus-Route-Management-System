const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Bus = require('../models/Bus');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const socketService = require('../services/socketService');
const { notify } = require('../services/notificationService');

const record = asyncHandler(async (req, res) => {
  const { student_id, trip_id, bus_id, stop_id, status, latitude, longitude, method } = req.body;
  const student = await Student.findById(student_id);
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');

  const row = await Attendance.record({
    student_id, trip_id, bus_id: bus_id || student.bus_id, stop_id: stop_id || student.pickup_stop_id,
    status, latitude, longitude, method,
  });

  // Parent notification.
  if (student.parent_user_id) {
    const bus = bus_id ? await Bus.findById(bus_id) : null;
    const action = status === 'BOARDED' ? 'has boarded' : status === 'DROPPED_OFF' ? 'was dropped off' : `status: ${status}`;
    await notify({
      user_id: student.parent_user_id,
      title: `${student.name} ${action}`,
      body: `${student.name} ${action} ${bus ? `bus ${bus.bus_number}` : ''} at ${new Date().toLocaleTimeString()}.`,
      type: 'ATTENDANCE',
      socketIO: socketService.getIO(),
      to: `user:${student.parent_user_id}`,
    });
  }

  socketService.emit(status === 'BOARDED' ? 'student:boarded' : status === 'DROPPED_OFF' ? 'student:dropped' : 'attendance:recorded', row, ['fleet']);
  res.status(201).json({ data: row });
});

const byStudent = asyncHandler(async (req, res) => {
  const history = await Attendance.latestByStudent(req.params.id, req.query.limit || 30);
  res.status(200).json({ data: history });
});

const byTrip = asyncHandler(async (req, res) => {
  const { query } = require('../config/db');
  const { rows } = await query(
    `SELECT a.*, s.name AS student_name, s.student_id AS student_code FROM attendance a
     JOIN students s ON s.id = a.student_id
     WHERE a.trip_id = $1 ORDER BY a.timestamp ASC`,
    [req.params.tripId]
  );
  res.status(200).json({ data: rows });
});

const todayCounts = asyncHandler(async (req, res) => {
  const rows = await Attendance.todayCounts({ school_id: req.user.school_id });
  const counts = { BOARDED: 0, NOT_BOARDED: 0, ABSENT: 0, DROPPED_OFF: 0, UNKNOWN: 0 };
  rows.forEach((r) => { counts[r.status] = r.c; });
  res.status(200).json({ data: counts });
});

module.exports = { record, byStudent, byTrip, todayCounts };