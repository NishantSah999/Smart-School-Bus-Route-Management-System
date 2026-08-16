// SmartBus integration smoke tests — boots the server on an ephemeral port and
// exercises the core flows (auth, RBAC, driver scoping, trips, attendance, alerts, reports).
// Run with: npm test   (Node >= 18, uses global fetch)
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8199;
const BASE = `http://localhost:${PORT}/api/v1`;
let child = null;
let admin = null;
let driver = null;
let parent = null;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function jfetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const body = await res.json();
  return { status: res.status, body };
}

function auth(token) { return { Authorization: `Bearer ${token}` }; }

before(async () => {
  child = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/health`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('server did not start');
});

after(() => { if (child) child.kill('SIGTERM'); });

test('admin can log in', async () => {
  const r = await jfetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@smartbus.test', password: 'admin123' }),
  });
  assert.strictEqual(r.status, 200);
  admin = r.body.data;
  assert.ok(admin.accessToken);
  assert.strictEqual(admin.user.role, 'SUPER_ADMIN');
});

test('wrong password rejected', async () => {
  const r = await jfetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@smartbus.test', password: 'nope' }),
  });
  assert.ok([401, 422].includes(r.status), `expected 401/422, got ${r.status}`);
});

test('dashboard summary matches seeded prototype numbers', async () => {
  const r = await jfetch(`${BASE}/dashboard/summary`, { headers: auth(admin.accessToken) });
  assert.strictEqual(r.status, 200);
  const s = r.body.data;
  assert.strictEqual(s.buses.total, 12);
  assert.strictEqual(s.students.total, 186);
  assert.ok(s.trips.total_today >= 12);
  assert.ok(s.buses.on_route >= 6);
});

test('RBAC blocks driver from admin-only resource', async () => {
  const login = await jfetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver1@smartbus.test', password: 'driver123' }),
  });
  driver = login.body.data;
  const r = await jfetch(`${BASE}/schools`, { headers: auth(driver.accessToken) });
  assert.strictEqual(r.status, 403);
});

test('driver sees only their own bus (scoped)', async () => {
  const r = await jfetch(`${BASE}/buses`, { headers: auth(driver.accessToken) });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.data.data.length, 1);
  assert.strictEqual(r.body.data.data[0].bus_number, 'Bus 01');
});

test('parent sees own children with route + stops', async () => {
  const login = await jfetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'parent1@smartbus.test', password: 'parent123' }),
  });
  parent = login.body.data;
  const me = await jfetch(`${BASE}/auth/me`, { headers: auth(parent.accessToken) });
  const pid = me.body.data.profile.id;
  const r = await jfetch(`${BASE}/parents/${pid}`, { headers: auth(parent.accessToken) });
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.data.students.length >= 1);
  assert.ok(r.body.data.students[0].route_name);
  assert.ok(r.body.data.students[0].pickup_stop);
});

test('full trip life-cycle: start, board, notify, end', async () => {
  const existing = await jfetch(`${BASE}/trips?status=ACTIVE`, { headers: auth(driver.accessToken) });
  for (const t of existing.body.data.data) {
    await jfetch(`${BASE}/trips/${t.id}/end`, {
      method: 'POST', headers: { ...auth(driver.accessToken), 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
  }
  const start = await jfetch(`${BASE}/trips`, {
    method: 'POST', headers: { ...auth(driver.accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ bus_id: 1, route_id: 1, trip_type: 'SPECIAL' }),
  });
  assert.strictEqual(start.status, 201);
  const tripId = start.body.data.id;

  const board = await jfetch(`${BASE}/attendance`, {
    method: 'POST', headers: { ...auth(driver.accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: 1, trip_id: tripId, status: 'BOARDED', method: 'DRIVER' }),
  });
  assert.ok([200, 201].includes(board.status), `board status ${board.status}`);

  const notif = await jfetch(`${BASE}/notifications?limit=3`, { headers: auth(parent.accessToken) });
  assert.strictEqual(notif.status, 200);
  assert.ok(notif.body.data.data.some((n) => n.title.includes('boarded')));

  const end = await jfetch(`${BASE}/trips/${tripId}/end`, {
    method: 'POST', headers: { ...auth(driver.accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.strictEqual(end.status, 200);
  assert.strictEqual(end.body.data.status, 'COMPLETED');
});

test('duplicate active trip rejected', async () => {
  const existing = await jfetch(`${BASE}/trips?status=ACTIVE`, { headers: auth(driver.accessToken) });
  for (const t of existing.body.data.data) {
    await jfetch(`${BASE}/trips/${t.id}/end`, {
      method: 'POST', headers: { ...auth(driver.accessToken), 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
  }
  await jfetch(`${BASE}/trips`, {
    method: 'POST', headers: { ...auth(driver.accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ bus_id: 1, route_id: 1 }),
  });
  const dup = await jfetch(`${BASE}/trips`, {
    method: 'POST', headers: { ...auth(driver.accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ bus_id: 1, route_id: 1 }),
  });
  assert.strictEqual(dup.status, 409);
});

test('drowsiness escalation creates alert', async () => {
  const r = await jfetch(`${BASE}/alerts/safety/drowsiness`, {
    method: 'POST', headers: { ...auth(driver.accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ bus_id: 1, driver_id: 1, state: 'WARNING' }),
  });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.data.alert.type, 'DROWSINESS');
});

test('alerts ack and resolve', async () => {
  const list = await jfetch(`${BASE}/alerts`, { headers: auth(admin.accessToken) });
  const openAlert = list.body.data.data.find((a) => a.status === 'OPEN');
  assert.ok(openAlert, 'expected an open alert');
  const ack = await jfetch(`${BASE}/alerts/${openAlert.id}/acknowledge`, {
    method: 'POST', headers: { ...auth(admin.accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACKNOWLEDGED' }),
  });
  assert.strictEqual(ack.status, 200);
  const resolve = await jfetch(`${BASE}/alerts/${openAlert.id}/resolve`, {
    method: 'POST', headers: { ...auth(admin.accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'RESOLVED' }),
  });
  assert.strictEqual(resolve.status, 200);
  assert.strictEqual(resolve.body.data.status, 'RESOLVED');
});

test('reports endpoints return data', async () => {
  const trips = await jfetch(`${BASE}/reports/trips`, { headers: auth(admin.accessToken) });
  assert.strictEqual(trips.status, 200);
  assert.ok(trips.body.data.trips >= 12);
  const csv = await fetch(`${BASE}/reports/export?type=trips`, { headers: auth(admin.accessToken) });
  assert.strictEqual(csv.status, 200);
  const text = await csv.text();
  assert.ok(text.startsWith('id,trip_type'));
});

test('GPS ingestion broadcasts and updates fleet', async () => {
  const r = await jfetch(`${BASE}/tracking/location`, {
    method: 'POST', headers: { ...auth(driver.accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ bus_id: 1, device_id: 'dev-bus-1', latitude: 26.74, longitude: 85.93, speed: 35 }),
  });
  assert.strictEqual(r.status, 200);
  const fleet = await jfetch(`${BASE}/tracking/fleet`, { headers: auth(admin.accessToken) });
  const bus = fleet.body.data.find((b) => b.id === 1);
  assert.ok(Math.abs(bus.last_latitude - 26.74) < 0.001);
});