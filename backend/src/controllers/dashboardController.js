const { query } = require('../config/db');
const Trip = require('../models/Trip');
const Alert = require('../models/Alert');
const asyncHandler = require('../utils/asyncHandler');

// Aggregated dashboard KPIs. All values come from the database — nothing is hard-coded.
const dashboardSummary = asyncHandler(async (req, res) => {
  const schoolId = req.query.school_id ? Number(req.query.school_id) : (req.user.role !== 'SUPER_ADMIN' ? req.user.school_id : null);
  const schoolCond = schoolId ? 'WHERE school_id = $1' : '';
  const params = schoolId ? [schoolId] : [];

  const alertsCond = schoolId
    ? `WHERE bus_id IN (SELECT id FROM buses WHERE school_id = ${schoolId})`
    : '';
  const onlineCond = schoolId
    ? 'WHERE last_update > now() - interval \'60 seconds\' AND school_id = $1'
    : 'WHERE last_update > now() - interval \'60 seconds\'';

  const [buses, students, trips, alerts, online] = await Promise.all([
    query(`SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE status='ON_ROUTE')::int AS on_route,
       count(*) FILTER (WHERE status='ACTIVE' OR status='ON_ROUTE' OR status='AT_STOP')::int AS active,
       count(*) FILTER (WHERE status='IDLE')::int AS idle,
       count(*) FILTER (WHERE status='MAINTENANCE')::int AS maintenance,
       count(*) FILTER (WHERE status='OFFLINE')::int AS offline,
       count(*) FILTER (WHERE last_update > now() - interval '60 seconds')::int AS online
     FROM buses ${schoolCond}`, params),
    query(`SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE status='ACTIVE')::int AS active,
       count(*) FILTER (WHERE status='INACTIVE')::int AS inactive
     FROM students ${schoolCond}`, params),
    Trip.todayStats(),
    query(`SELECT
       count(*) FILTER (WHERE status='OPEN')::int AS open,
       count(*) FILTER (WHERE severity='CRITICAL' AND status != 'RESOLVED')::int AS critical,
       count(*) FILTER (WHERE severity='WARNING' AND status != 'RESOLVED')::int AS warnings,
       count(*) FILTER (WHERE severity='INFO' AND status != 'RESOLVED')::int AS info
     FROM alerts ${alertsCond}`),
    query(`SELECT count(*)::int AS c FROM buses ${onlineCond}`, schoolId ? [schoolId] : []),
  ]);

  res.status(200).json({
    data: {
      buses: buses.rows[0],
      students: students.rows[0],
      trips: trips,
      alerts: alerts.rows[0] || { open: 0, critical: 0, warnings: 0, info: 0 },
      online_buses: online.rows[0].c,
    },
  });
});

module.exports = { dashboardSummary };