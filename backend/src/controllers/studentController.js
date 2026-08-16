const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { scopeDriver } = require('../utils/roleScope');

const list = asyncHandler(async (req, res) => {
  const scope = await scopeDriver(req);
  const data = await Student.list({
    page: req.query.page, limit: req.query.limit, search: req.query.search,
    grade: req.query.grade, route_id: req.query.route_id, bus_id: scope.bus_id || req.query.bus_id,
    status: req.query.status, school_id: req.query.school_id || req.user.school_id,
  });
  res.status(200).json({ data });
});

const getById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const [attendanceToday, attendanceHistory] = await Promise.all([
    Attendance.todayByStudent(student.id),
    Attendance.latestByStudent(student.id, 30),
  ]);
  res.status(200).json({ data: { ...student, attendance_today: attendanceToday, attendance_history: attendanceHistory } });
});

const create = asyncHandler(async (req, res) => {
  const student = await Student.create({ ...req.body, school_id: req.body.school_id || req.user.school_id });
  await AuditLog.record({ user_id: req.user.id, action: 'CREATE', entity: 'student', entity_id: student.id, ip: req.ip, metadata: { student_id: student.student_id } });
  res.status(201).json({ data: student });
});

const update = asyncHandler(async (req, res) => {
  const student = await Student.update(req.params.id, req.body);
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'UPDATE', entity: 'student', entity_id: student.id, ip: req.ip });
  res.status(200).json({ data: student });
});

const remove = asyncHandler(async (req, res) => {
  const student = await Student.update(req.params.id, { status: 'INACTIVE' });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  await AuditLog.record({ user_id: req.user.id, action: 'DEACTIVATE', entity: 'student', entity_id: student.id, ip: req.ip });
  res.status(200).json({ data: student });
});

module.exports = { list, getById, create, update, remove };