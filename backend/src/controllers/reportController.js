const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// SQL helpers for filterable aggregates. All report numbers come from the database.

function filters(req) {
  const conds = [];
  const params = [];
  const add = (sql, v) => { if (v !== undefined && v !== '') { params.push(v); conds.push(sql.replace('?', `$${params.length}`)); } };
  add('bus_id = ?', req.query.bus_id);
  add('driver_id = ?', req.query.driver_id);
  add('route_id = ?', req.query.route_id);
  const s = req.query.start || req.query.from;
  const e = req.query.end || req.query.to;
  add('start_time >= ?', s ? new Date(s).toISOString() : undefined);
  add('start_time <= ?', e ? new Date(e).toISOString() : undefined);
  return { conds, params, where: conds.length ? `WHERE ${conds.join(' AND ')}` : '' };
}

const trips = asyncHandler(async (req, res) => {
  const { where, params } = filters(req);
  const { rows } = await query(
    `SELECT count(*)::int AS trips, count(*) FILTER (WHERE status='COMPLETED')::int AS completed,
            count(*) FILTER (WHERE status='CANCELLED')::int AS cancelled,
            coalesce(sum(distance),0) AS total_distance,
            coalesce(avg(duration),0)::int AS avg_duration_sec,
            coalesce(sum(passenger_count),0)::int AS passengers_transported
     FROM trips t ${where}`,
    params
  );
  res.status(200).json({ data: rows[0] });
});

const dailyTrips = asyncHandler(async (req, res) => {
  const { where, params } = filters(req);
  const { rows } = await query(
    `SELECT to_char(start_time, 'YYYY-MM-DD') AS day, count(*)::int AS trips
     FROM trips t ${where} GROUP BY day ORDER BY day DESC LIMIT 30`,
    params
  );
  res.status(200).json({ data: rows });
});

const utilization = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT status, count(*)::int AS c FROM buses GROUP BY status`
  );
  res.status(200).json({ data: rows });
});

const driverSafety = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT
       count(*) FILTER (WHERE type='DROWSINESS')::int AS drowsiness,
       count(*) FILTER (WHERE type='OVERSPEED')::int AS overspeed,
       count(*) FILTER (WHERE type='HARSH_BRAKING')::int AS harsh_braking,
       count(*) FILTER (WHERE type='SOS' OR type='EMERGENCY_BUTTON')::int AS sos
     FROM alerts`
  );
  res.status(200).json({ data: rows[0] });
});

const routePerformance = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.name, r.route_code,
       count(t.id)::int AS trips,
       coalesce(avg(t.duration),0)::int AS avg_duration_sec,
       coalesce(avg(t.distance),0) AS avg_distance,
       coalesce(sum(t.passenger_count),0)::int AS passengers
     FROM routes r
     LEFT JOIN trips t ON t.route_id = r.id AND t.status='COMPLETED'
     GROUP BY r.id ORDER BY r.id`
  );
  res.status(200).json({ data: rows });
});

const attendanceReport = asyncHandler(async (req, res) => {
  const schoolCond = req.user.school_id ? `WHERE school_id = $1` : '';
  const params = req.user.school_id ? [req.user.school_id] : [];
  const { rows } = await query(
    `SELECT status, count(*)::int AS c
     FROM students ${schoolCond} GROUP BY status`,
    params
  );
  const total = rows.reduce((a, r) => a + r.c, 0);
  res.status(200).json({ data: { total, by_status: rows } });
});

const alertsReport = asyncHandler(async (req, res) => {
  const schoolCond = req.user.school_id ? 'WHERE bus_id IN (SELECT id FROM buses WHERE school_id = $1)' : '';
  const params = req.user.school_id ? [req.user.school_id] : [];
  const { rows } = await query(
    `SELECT type, severity, count(*)::int AS c FROM alerts ${schoolCond} GROUP BY type, severity ORDER BY c DESC`,
    params
  );
  res.status(200).json({ data: rows });
});

// CSV export for a given report type.
const exportCsv = asyncHandler(async (req, res) => {
  const { type } = req.query;
  let rows = [];
  let header = '';
  const map = (r) => r;

  if (type === 'trips') {
    const { where, params } = filters(req);
    const { rows: r } = await query(
      `SELECT t.id, t.trip_type, t.status, t.start_time, t.end_time, t.distance, t.duration, t.passenger_count,
         b.bus_number, d.name AS driver_name, rte.name AS route_name
       FROM trips t
       LEFT JOIN buses b ON b.id = t.bus_id
       LEFT JOIN drivers d ON d.id = t.driver_id
       LEFT JOIN routes rte ON rte.id = t.route_id
       ${where} ORDER BY t.start_time DESC LIMIT 5000`,
      params
    );
    rows = r;
    header = 'id,trip_type,status,start_time,end_time,distance,duration,passenger_count,bus_number,driver_name,route_name';
  } else if (type === 'alerts') {
    const { rows: r } = await query(
      `SELECT a.id, a.type, a.severity, a.status, a.message, a.created_at, a.resolved_at, b.bus_number
       FROM alerts a LEFT JOIN buses b ON b.id = a.bus_id ORDER BY a.created_at DESC LIMIT 5000`
    );
    rows = r;
    header = 'id,type,severity,status,message,created_at,resolved_at,bus_number';
  } else {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Unsupported CSV report type' } });
  }

  const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [header, ...rows.map((r) => Object.values(r).map(esc).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="smartbus-${type}.csv"`);
  res.status(200).send(csv);
});

module.exports = { trips, dailyTrips, utilization, driverSafety, routePerformance, attendanceReport, alertsReport, exportCsv };