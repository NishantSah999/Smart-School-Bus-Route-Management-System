# SmartBus — Codebase Audit & Implementation Plan

> Generated before any refactor, per master-prompt requirement (section 48).

---

## 1. Existing Architecture

**Type:** Static frontend prototype. Zero backend, zero database, zero build tooling.

| Layer | Technology | Location |
|---|---|---|
| Markup | HTML5, inline SVG | `pages/` (4 files) |
| Styling | CSS3, CSS variables, flex/grid | `style/` (4 files) |
| Logic | Vanilla ES6 DOM scripting | `script/` (4 files) |
| Fonts | Google Fonts "Inter" | external |
| Avatars | i.pravatar.cc | external |

**Flow:** Each HTML page loads one page-specific CSS and one page-specific JS. No routing library, no state management, no shared JS module — `script.js` and `fleet_Tracking.js` contain **identical** sidebar/collapse code (duplication).

**Data:** All data is hard-coded in HTML (12 buses, 186 students, 26 alerts, etc.). Nothing is persisted or fetched.

---

## 2. Existing Reusable Components

1. **Sidebar** — brand block, `.menu > .nav-item` (9 items), `.profile-card`, `.collapse-btn`. Repeated verbatim in all 4 pages.
2. **Topbar** — `.topbar` with `<h1>`, `.welcome`, `.search-wrap` (with `⌘K`), `.top-actions` (bell + settings icons).
3. **Stat cards** — `.stats-row > .stat-card` with `.stat-top`, `.stat-icon`, `.stat-value`, `.stat-foot`. Consistent in all pages.
4. **Cards** — `.card` + `.card-head`, `.card-body` content blocks.
5. **Donut charts** — raw SVG `<circle>` + `stroke-dasharray` (Fleet status, Routes, Alerts by type).
6. **Progress bars** — `.status-bar-*`, `.dist-fill`, `.trend-bars`.
7. **Tables** — `.table-wrap > table`, `.status-badge`, `.action-btn`, `.pagination`.
8. **Alert cards** — `.alert-card` with `.alert-type`, `.alert-meta-grid`, `.action-resolve`.
9. **Activity feed** — `.activity-item` with `.activity-dot`.
10. **Map** — `.map-box` with SVG roads, `.marker m-*`, `.school-pin`, `.map-popup`.

---

## 3. Files That Need Modification

| File | Change |
|---|---|
| `pages/dashboard.html` | Replace hard-coded KPIs with API-driven data; add login-aware UI; load shared layout |
| `pages/Fleet-Tracking.html` | Replace static map with real-time GPS + WebSocket bus markers |
| `pages/alerts.html` | Replace mock alert cards with real alerts; persist resolve/acknowledge |
| `pages/passenger.html` | Replace static table with API-backed, server-side paginated table |
| `script/script.js`, `script/fleet_Tracking.js`, `script/alerts.js`, `script/passenger.js` | Remove `alert()`; call `api` service; wire real events |
| `style/*.css` | Add responsive breakpoints, skeleton loaders, toasts, modals; preserve tokens |

---

## 4. Files That Need Creation

### Backend (`backend/`)
- `package.json`, `.env`, `.env.example`, `server.js`
- `src/config/` — env, db (pg Pool), socket
- `src/models/` — user, school, driver, bus, route, stop, student, parent, trip, gps, alert, attendance, maintenance, notification, audit_log
- `src/routes/` — auth, dashboard, schools, buses, drivers, routes, stops, students, parents, trips, tracking, alerts, attendance, maintenance, notifications, reports
- `src/controllers/`, `src/services/`, `src/middleware/` (auth, roles, error, validate), `src/validators/`, `src/sockets/`, `src/utils/`
- `migrations/` (SQL), `seeds/seed.js`, `tests/`

### Frontend (`frontend/`)
- `script/api.js` — fetch wrapper with JWT handling
- `script/auth.js` — login/logout/state
- `script/toast.js` — toast/notification UI
- `script/map.js` — map + WebSocket rendering
- `pages/login.html`, `pages/driver.html`, `pages/parent.html` (new)
- `assets/` for images/icons

---

## 5. Database Schema

PostgreSQL relational schema. Tables: `users`, `schools`, `drivers`, `buses`, `routes`, `stops`, `students`, `parents`, `trips`, `gps_updates`, `alerts`, `attendance`, `maintenance`, `notifications`, `audit_logs`.

Key design decisions:
- `users` holds credentials (`email`, `password_hash`) + `role`; `drivers`, `parents`, `students` reference `users` where applicable.
- `buses` carries `device_id`, `last_latitude/longitude/speed`, `status`.
- `gps_updates` is append-only, high-volume, indexed on `(bus_id, timestamp)`.
- Roles: `SUPER_ADMIN, SCHOOL_ADMIN, TRANSPORT_MANAGER, DRIVER, TEACHER, PARENT, STUDENT`.
- Enums: bus status, trip type, alert type/severity/status, maintenance status.

Full SQL in `backend/migrations/001_init.sql`.

---

## 6. API Architecture

- Base path: `/api/v1`
- REST + JSON, JWT Bearer auth (except login/refresh)
- Versioned, centralized error handler returning RFC-7807-ish `{ error: { code, message } }`
- Server-side pagination `?page=&limit=&search=&filter=` returning `{ data, pagination }`
- Controllers thin; logic in services; validation in validators (zod or manual)

Endpoint list mirrors master prompt §27, plus `dashboard/summary`.

---

## 7. Authentication Architecture

- **Argon2** password hashing (`bcrypt`-style, via Node `argon2` or `bcryptjs`).
- **JWT** access token (short-lived, e.g. 15m) + refresh token (stored httpOnly cookie or DB table, rotated).
- **Middleware:** `authRequired` (verify JWT) → `authorize(roles)` (RBAC on backend).
- **Device auth** for GPS endpoints: separate device token per `buses.device_id`.
- **Rate limiting** on auth endpoints.
- Password reset via email token.

---

## 8. Real-Time Architecture

- **Socket.IO** on the Express server.
- Client authenticates socket with JWT (middleware).
- Events: `bus:location`, `bus:status`, `trip:started`, `trip:ended`, `student:boarded`, `student:dropped`, `alert:new`, `alert:resolved`, `sos:triggered`, `driver:drowsiness`, `notification:new`.
- GPS writes go to DB (`gps_updates`) → latest location upserted on `buses` → broadcast to rooms (`school:{id}`, `bus:{id}`) so dashboards update without page refresh.

---

## 9. Migration Strategy

- Plain SQL migration files in `backend/migrations/`, applied in order by a runner script (`npm run migrate`).
- `001_init.sql` — full schema + enums + indexes.
- `002_seed.sql` / `backend/seeds/seed.js` — seed 1 school, 12 buses, 10 drivers, 4 routes, 20+ stops, 186 students, trips, alerts, maintenance, matching existing dashboard numbers.
- No ORM dependency required; `pg` pool + thin model files. (Option to add Knex/Prisma later.)

---

## 10. Implementation Plan (Phases)

1. **Backend foundation** — project, env, db pool, migrations, error/validation utils. *(in progress)*
2. **Authentication** — login/logout/refresh, roles, middleware.
3. **Core CRUD** — schools, buses, drivers, routes, stops, students, parents.
4. **Connect Dashboard** — real summary endpoint; existing pages consume API.
5. **Fleet Tracking** — GPS API, Socket.IO broadcast, live map.
6. **Trips** — start/end, history, progress.
7. **Attendance** — board/deboard, parent notifications.
8. **Alerts** — real CRUD, ack/resolve, real-time.
9. **Safety system** — camera + drowsiness UI, warning/SOS escalation.
10. **Notifications** — in-app (web + email stubs).
11. **Maintenance** — records + reminders.
12. **Reports** — analytics, CSV export, filters.
13. **Hardening** — security headers, rate limit, logging, tests, README.

---

## 11. Verification Strategy

After each phase: run server, `curl` APIs, check console, check DB rows, test responsive layout. No `alert()`, no fake data once an endpoint exists.
