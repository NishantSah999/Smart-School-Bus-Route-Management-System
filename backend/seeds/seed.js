// SmartBus database seed — reproduces the prototype's numbers:
// 1 school, 12 buses, 10 drivers, 4 routes, 20+ stops, 186 students, trips, alerts, maintenance.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const SCHOOL = { name: 'Sagarmatha School', code: 'SGS', address: 'Main Street, Janakpur, Dhanusha', phone: '041-520000', email: 'info@sagarmatha.edu.np', latitude: 26.729, longitude: 85.922 };

const ROUTES = [
  { name: 'Route A', route_code: 'RTA', start_location: 'Godar', end_location: 'School', estimated_duration: 25, distance: 8.4, speed_limit: 40 },
  { name: 'Route B', route_code: 'RTB', start_location: 'Janakpur Highway', end_location: 'School', estimated_duration: 20, distance: 6.1, speed_limit: 60 },
  { name: 'Route C', route_code: 'RTC', start_location: 'Main Street', end_location: 'School', estimated_duration: 15, distance: 4.5, speed_limit: 40 },
  { name: 'Route D', route_code: 'RTD', start_location: 'City Center', end_location: 'School', estimated_duration: 30, distance: 10.2, speed_limit: 50 },
];

const DRIVER_NAMES = [
  'Ram Kumar', 'Sita Thapa', 'Mohan Thapa', 'Rajesh Singh', 'Gita Shah',
  'Hari Prasad', 'Kiran Rai', 'Suman Mahato', 'Nirmala Devi', 'Bikash Yadav',
];

const BUS_STOPS = {
  RTA: ['Godar Stop', 'Bishnupur Chowk', 'Railway Gate', 'Shanti Tole', 'Dhanusha Road'],
  RTB: ['Highway Stop', 'Golchha Chowk', 'Lal Bangla', 'Central Stop', 'Green Park Stop'],
  RTC: ['Main Street Stop', 'Market Stop', 'School Road Stop', 'Central Stop', 'Old Bridge'],
  RTD: ['City Center Stop', 'Bhagwati Chowk', 'Bazar Road', 'Hospital Stop', 'Deokhuri'],
};

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Vivaan', 'Isha', 'Kabir', 'Meera', 'Arjun', 'Sneha', 'Aditya', 'Priya', 'Rahul', 'Anjali', 'Vikram', 'Kavya', 'Nikhil', 'Pooja', 'Ritika', 'Sahil'];
const LAST = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Shah', 'Thapa', 'Mahato', 'Yadav', 'Rai', 'Prasad', 'Devi', 'Sah', 'Mandal', 'Jha', 'Mishra', 'Karki', 'Gurung', 'Lama', 'Chaudhary'];
const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
const GENDERS = ['Male', 'Female'];
const REL = ['Father', 'Mother', 'Guardian'];

async function main() {
  console.log('[seed] clearing existing data...');
  const tables = ['attendance', 'gps_updates', 'alerts', 'trips', 'maintenance', 'notifications', 'audit_logs', 'refresh_tokens', 'students', 'stops', 'parents', 'routes', 'buses', 'drivers', 'users', 'schools'];
  for (const t of tables) await pool.query(`TRUNCATE TABLE ${t} RESTART IDENTITY CASCADE`);

  console.log('[seed] school');
  const school = (await pool.query(
    'INSERT INTO schools (name, code, address, phone, email, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [SCHOOL.name, SCHOOL.code, SCHOOL.address, SCHOOL.phone, SCHOOL.email, SCHOOL.latitude, SCHOOL.longitude]
  )).rows[0];

  console.log('[seed] admin users');
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = (await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, school_id, status) VALUES ($1,$2,$3,$4,'SUPER_ADMIN',$5,'ACTIVE') RETURNING *`,
    ['Nishant Sah', 'admin@smartbus.test', '9800000000', adminHash, school.id]
  )).rows[0];
  const mgrHash = await bcrypt.hash('manager123', 10);
  const mgr = (await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, school_id, status) VALUES ($1,$2,$3,$4,'TRANSPORT_MANAGER',$5,'ACTIVE') RETURNING *`,
    ['Transport Manager', 'manager@smartbus.test', '9800000001', mgrHash, school.id]
  )).rows[0];

  console.log('[seed] drivers');
  const drivers = [];
  for (let i = 0; i < DRIVER_NAMES.length; i++) {
    const name = DRIVER_NAMES[i];
    const driverHash = await bcrypt.hash('driver123', 10);
    const u = (await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, school_id, status) VALUES ($1,$2,$3,$4,'DRIVER',$5,'ACTIVE') RETURNING id`,
      [name, `driver${i + 1}@smartbus.test`, `98${String(i + 1).padStart(8, '0')}`, driverHash, school.id]
    )).rows[0];
    const d = (await pool.query(
      `INSERT INTO drivers (user_id, name, phone, license_number, license_expiry, emergency_contact, date_of_birth, experience_years, status, school_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [u.id, name, `98${String(i + 1).padStart(8, '0')}`, `LIC-${String(1000 + i)}`, new Date(2026 + (i % 3), 11, 31).toISOString().slice(0, 10), `97${String(i + 1).padStart(8, '0')}`, new Date(1975 + i, 0, 1).toISOString().slice(0, 10), 3 + (i % 12), 'AVAILABLE', school.id]
    )).rows[0];
    drivers.push(d);
  }

  console.log('[seed] routes + stops');
  const routes = {};
  const allStops = {};
  for (let i = 0; i < ROUTES.length; i++) {
    const r = ROUTES[i];
    const route = (await pool.query(
      `INSERT INTO routes (name, route_code, description, school_id, start_location, end_location, estimated_duration, distance, speed_limit, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE') RETURNING *`,
      [r.name, r.route_code, `${r.name} for Sagarmatha School`, school.id, r.start_location, r.end_location, r.estimated_duration, r.distance, r.speed_limit]
    )).rows[0];
    routes[r.route_code] = route;
    allStops[r.route_code] = [];
    const stops = BUS_STOPS[r.route_code];
    for (let s = 0; s < stops.length; s++) {
      const stop = (await pool.query(
        `INSERT INTO stops (route_id, name, address, latitude, longitude, sequence, estimated_arrival, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE') RETURNING *`,
        [route.id, stops[s], r.start_location, SCHOOL.latitude + (s * 0.005), SCHOOL.longitude - (s * 0.004), s + 1, `07:${String(10 + s * 2).padStart(2, '0')}:00`]
      )).rows[0];
      allStops[r.route_code].push(stop);
    }
  }

  console.log('[seed] buses');
  const buses = [];
  const busStatuses = ['ON_ROUTE', 'ON_ROUTE', 'ON_ROUTE', 'ON_ROUTE', 'ON_ROUTE', 'ON_ROUTE', 'ON_ROUTE', 'AT_STOP', 'AT_STOP', 'IDLE', 'MAINTENANCE', 'ACTIVE'];
  const models = ['Ashok Leyland', 'Tata Starbus', 'Force Traveller', 'Mahindra Tourister', 'SML Isuzu'];
  for (let i = 0; i < 12; i++) {
    const driver = i < drivers.length ? drivers[i] : null;
    const route = ROUTES[i % 4];
    const lat = SCHOOL.latitude + (i % 5) * 0.006;
    const lng = SCHOOL.longitude - (i % 4) * 0.005;
    const speed = busStatuses[i] === 'ON_ROUTE' ? 28 + (i % 20) : 0;
    const bus = (await pool.query(
      `INSERT INTO buses (bus_number, registration_number, model, capacity, device_id, driver_id, school_id, status, fuel_type, last_latitude, last_longitude, last_speed, last_heading, last_update, odometer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now() - ($14 || ' seconds')::interval, $15) RETURNING *`,
      [`Bus ${String(i + 1).padStart(2, '0')}`, `JAN 1 ${String(5500 + i)}`, models[i % models.length], 40, `dev-bus-${i + 1}`, driver ? driver.id : null, school.id, busStatuses[i], i % 2 ? 'Diesel' : 'CNG', lat, lng, speed, (i * 37) % 360, i + 2, 12000 + i * 1500]
    )).rows[0];
    buses.push(bus);
    if (driver) await pool.query('UPDATE drivers SET status = $1 WHERE id = $2', [busStatuses[i] === 'ON_ROUTE' ? 'ON_TRIP' : 'ON_DUTY', driver.id]);
  }

  console.log('[seed] parents');
  const parents = [];
  for (let i = 0; i < 30; i++) {
    const rel = REL[i % 3];
    const p = (await pool.query(
      `INSERT INTO parents (name, phone, email, relationship, emergency_contact, notification_enabled) VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING *`,
      [`${FIRST[i % 20]} ${LAST[(i + 1) % 20]} (${rel})`, `98${String(70000000 + i)}`, `parent${i + 1}@smartbus.test`, rel, `97${String(70000000 + i)}`]
    )).rows[0];
    const parentUser = (await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, school_id, status) VALUES ($1,$2,$3,$4,'PARENT',$5,'ACTIVE') RETURNING id`,
      [`${FIRST[i % 20]} ${LAST[(i + 1) % 20]}`, `parent${i + 1}@smartbus.test`, `98${String(70000000 + i)}`, await bcrypt.hash('parent123', 10), school.id]
    )).rows[0];
    await pool.query('UPDATE parents SET user_id = $1 WHERE id = $2', [parentUser.id, p.id]);
    parents.push({ ...p, user_id: parentUser.id });
  }

  console.log('[seed] students (186)');
  const gradeWeights = [
    [6, 0.25], [7, 0.24], [8, 0.22], [9, 0.17], [10, 0.12],
  ];
  for (let i = 0; i < 186; i++) {
    const firstName = FIRST[i % FIRST.length];
    const lastName = LAST[(i * 7) % LAST.length];
    const route = ROUTES[i % 4];
    const stopsForRoute = allStops[route.route_code];
    const pickup = stopsForRoute[i % stopsForRoute.length];
    const drop = stopsForRoute[stopsForRoute.length - 1];
    const gradePick = (() => {
      let r = (i * 7919) % 100 / 100;
      let acc = 0;
      for (const [g, w] of gradeWeights) { acc += w; if (r <= acc) return `Grade ${g}`; }
      return 'Grade 6';
    })();
    const bus = buses[i % buses.length];
    const parent = parents[i % parents.length];
    await pool.query(
      `INSERT INTO students (student_id, name, date_of_birth, gender, grade, section, school_id, parent_id, route_id, bus_id, pickup_stop_id, drop_stop_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ACTIVE')`,
      [`STU${String(i + 1).padStart(3, '0')}`, `${firstName} ${lastName}`, new Date(2008 + (i % 4), (i % 12), 1 + (i % 27)).toISOString().slice(0, 10), GENDERS[i % 2], gradePick, String.fromCharCode(65 + (i % 3)), school.id, parent.id, route.id, bus.id, pickup.id, drop.id]
    );
  }

  console.log('[seed] trips');
  const tripTypes = ['MORNING', 'AFTERNOON'];
  for (let i = 0; i < 12; i++) {
    const bus = buses[i];
    const route = ROUTES[i % 4];
    const driver = drivers[i % drivers.length];
    const type = tripTypes[i % 2];
    const start = new Date(Date.now() - (i * 45 + 15) * 60000);
    await pool.query(
      `INSERT INTO trips (bus_id, driver_id, route_id, trip_type, status, start_time, end_time, start_latitude, start_longitude, distance, duration, passenger_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [bus.id, driver.id, route.id, type, i < 8 ? 'COMPLETED' : 'ACTIVE', start, i < 8 ? new Date(start.getTime() + route.estimated_duration * 60000) : null, bus.last_latitude, bus.last_longitude, route.distance, route.estimated_duration * 60, 20 + (i % 15)]
    );
  }

  console.log('[seed] alerts');
  const alertDefs = [
    { type: 'DROWSINESS', severity: 'CRITICAL', message: 'Drowsiness detected for more than 5 seconds' },
    { type: 'OVERSPEED', severity: 'WARNING', message: 'Bus exceeded speed limit (78 km/h)' },
    { type: 'GEOFENCE', severity: 'INFO', message: 'Bus is 500m away from school' },
    { type: 'EMERGENCY_BUTTON', severity: 'CRITICAL', message: 'Driver pressed emergency button' },
    { type: 'HARSH_BRAKING', severity: 'WARNING', message: 'Sudden braking event detected' },
    { type: 'MAINTENANCE', severity: 'INFO', message: 'Scheduled maintenance due in 3 days' },
  ];
  for (let i = 0; i < alertDefs.length; i++) {
    const def = alertDefs[i];
    const bus = buses[i % buses.length];
    const driver = drivers[i % drivers.length];
    const route = ROUTES[i % 4];
    const resolved = i >= 3;
    await pool.query(
      `INSERT INTO alerts (type, severity, bus_id, driver_id, route_id, latitude, longitude, message, status, created_at, resolved_at, resolved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now() - ($10 || ' minutes')::interval, $11, $12)`,
      [def.type, def.severity, bus.id, driver.id, route.id, bus.last_latitude, bus.last_longitude, def.message, resolved ? 'RESOLVED' : 'OPEN', i * 12 + 2, resolved ? new Date() : null, resolved ? admin.id : null]
    );
  }

  console.log('[seed] maintenance');
  for (let i = 0; i < 4; i++) {
    const bus = buses[(i + 2) % buses.length];
    const serviceDate = new Date(Date.now() - (i * 40 + 10) * 86400000);
    await pool.query(
      `INSERT INTO maintenance (bus_id, service_date, next_service, odometer, status, oil, tyres, brakes, battery, insurance_due, registration_due, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [bus.id, serviceDate.toISOString().slice(0, 10), i === 0 ? new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10) : new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10), 12000 + i * 3000, i === 0 ? 'DUE_SOON' : 'GOOD', 'Changed', 'Good', 'Good', 'Good', new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10), new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10), 'Routine service', admin.id]
    );
  }

  console.log('[seed] gps seed points');
  for (let i = 0; i < buses.length; i++) {
    await pool.query(
      `INSERT INTO gps_updates (bus_id, device_id, latitude, longitude, speed, heading, timestamp) VALUES ($1,$2,$3,$4,$5,$6, now() - interval '30 seconds')`,
      [buses[i].id, `dev-bus-${i + 1}`, buses[i].last_latitude, buses[i].last_longitude, buses[i].last_speed, buses[i].last_heading]
    );
  }

  console.log(`[seed] done.
  ───────────────────────────────────────────
  Super Admin    admin@smartbus.test   / admin123
  Transport Mgr  manager@smartbus.test / manager123
  Driver         driver1@smartbus.test / driver123
  Parent         parent1@smartbus.test / parent123
  ───────────────────────────────────────────`);
}

main()
  .catch((e) => { console.error('[seed] failed', e); process.exit(1); })
  .finally(() => pool.end());