# Smart-School-Bus-Route-Management-System

A full-stack school bus safety and fleet management platform. The phone's camera detects driver drowsiness — if the driver's eyes remain closed, the app triggers a warning sound, and if there is no acknowledgement it escalates to **SOS with live GPS location** sent to administrators and parents.

The project was upgraded from a static HTML prototype into a production-oriented system with a **Node.js + Express + PostgreSQL** REST API, **JWT** authentication with role-based access, and **Socket.IO** real-time fleet tracking.

## Stack

- **Backend**: Node.js (>= 18), Express, `pg`, Socket.IO, JWT (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `zod`
- **Database**: PostgreSQL (schema in `backend/migrations/`)
- **Frontend**: vanilla HTML/CSS/JS served by the same Express process on port `8080`
- **Tests**: Node built-in test runner (`node --test`) against a live server

## Quick start

```bash
# 1. Database
createdb smartbus

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run migrate      # apply schema migrations
npm run seed         # demo data: 1 school, 12 buses, 10 drivers, 186 students, 4 routes, 12 trips
npm start            # serves API + frontend on http://localhost:8080

# 3. Tests (optional — boots a second instance on :8199)
npm test
```

## Demo accounts

| Role             | Email                     | Password    |
|------------------|---------------------------|-------------|
| Super admin      | `admin@smartbus.test`     | `admin123`  |
| Transport manager| `manager@smartbus.test`   | `manager123`|
| Driver           | `driver1@smartbus.test`   | `driver123` |
| Parent           | `parent1@smartbus.test`   | `parent123` |

## Pages

- `/pages/login.html` — JWT sign-in
- `/pages/dashboard.html` — summary KPIs (buses, students, trips, alerts), live fleet, recent alerts
- `/pages/Fleet-Tracking.html` — live map with per-bus markers, live speed/status, WebSocket updates
- `/pages/driver.html` — assigned bus + trip start/end, boarding/drop-off, **camera drowsiness detection** with Warning → Ack → SOS escalation
- `/pages/parent.html` — each child's bus, route, stops, live speed, and boarding/drop-off notifications
- `/pages/alerts.html` — alert triage: acknowledge, resolve, donut by severity
- `/pages/passenger.html` — student registry with server-side pagination and search
- `/pages/reports.html` — trip/route/fleet/safety analytics with CSV export

## API overview

All endpoints live under `/api/v1` and require `Authorization: Bearer <accessToken>`.

- `auth`: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`
- `dashboard/summary`, `schools`, `buses`, `drivers`, `routes`, `stops`, `students`, `parents`
- `trips`: `POST /trips` (start), `POST /trips/:id/end`, `GET /trips`
- `attendance`: `POST /attendance` (board / drop-off → parent notification), `GET /attendance/today/counts`
- `tracking`: `POST /tracking/location` (GPS ingestion + live broadcast), `GET /tracking/fleet`
- `alerts`: CRUD, `POST /alerts/:id/acknowledge`, `POST /alerts/:id/resolve`, `POST /alerts/safety/drowsiness` (WARNING / SOS escalation)
- `reports`: `trips`, `trips/daily`, `utilization`, `routes`, `driver-safety`, `attendance`, `alerts`, `export?type=trips|alerts` (CSV)
- `notifications`, `maintenance`, `audit-logs`

### Roles (RBAC)

`SUPER_ADMIN`, `SCHOOL_ADMIN`, `TRANSPORT_MANAGER`, `DRIVER`, `TEACHER`, `PARENT`, `STUDENT`.
Drivers are data-scoped server-side: a driver can only read **their own** bus, trips, and students — attempting to query another bus returns only their records.

### Real-time (Socket.IO)

The client connects to `/socket.io/socket.io.js` with `{ auth: { token } }`. Events:

- `bus:location` — live GPS for every bus (fleet page)
- `alert:new`, `alert:acknowledged`, `alert:resolved`, `sos:triggered` — alert triage
- `notification:new`, `student:boarded`, `student:dropped` — parent updates

## Safety workflow (driver dashboard)

1. Driver starts the camera; eye-openness is sampled from the video feed.
2. Eyes closed beyond a threshold → state **DROWSINESS SUSPECTED**.
3. Persisted → state **WARNING** with an audible beep + a safety banner; the backend creates a `DROWSINESS` alert.
4. No acknowledgement within ~15s → **SOS** escalation (`CRITICAL` alert, location broadcast).
5. A manual **SOS** button is always available, plus a cancel (false-alarm) option.

## Scripts (backend/)

- `npm start` — production server
- `npm run dev` — watch mode
- `npm run migrate` — apply `migrations/`
- `npm run seed` — (re)seed demo data (truncates tables)
- `npm test` — integration smoke tests

## Security notes

- Passwords hashed with `bcryptjs`; refresh tokens stored hashed in the DB.
- `helmet`, `cors` (allow-list), `express-rate-limit` on API + auth routes.
- Role checks are enforced **server-side**; the frontend only mirrors them for UX.
- Device/role scoping: driver and parent data access is constrained to their own records.
