# Project Report — Smart School Bus Route Management System (SmartBus)

## 1. Project Overview

**SmartBus** is a school transport management dashboard designed to help administrators monitor and manage a fleet of school buses in real time. It provides fleet tracking, driver-safety alerting (e.g., drowsiness detection), passenger management, and route/status analytics.

**Core vision** (from README): a smart bus safety system where a phone camera detects driver drowsiness — if the driver's eyes remain closed, the app triggers a warning sound, and if there's no response, it activates SOS with GPS location.

| Item | Detail |
|---|---|
| Project name | SmartBus — School Transport System |
| Domain | School fleet / transport management |
| Platform | Web (browser-based dashboard) |
| Stack | HTML5, CSS3, Vanilla JavaScript (no frameworks, no build tools) |
| Data layer | None — all data is static/hard-coded (simulated) |
| Current pages | 4 (Dashboard, Fleet Tracking, Alerts, Passengers) |

## 2. Technology Stack

- **HTML5** — semantic page structure, inline SVG icons
- **CSS3** — custom properties (CSS variables), flexbox/grid layouts, responsive design
- **Vanilla JavaScript (ES6)** — DOM manipulation, event handling (no libraries/frameworks)
- **Google Fonts** — *Inter* typeface for UI consistency
- **No backend, database, or build system** — all metrics and records are static mock data

## 3. Repository Structure

```
.
├── README.md                     # Project description
├── pages/                        # HTML pages (one per screen)
│   ├── dashboard.html            # Overview KPIs, live map, arrivals, alerts
│   ├── Fleet-Tracking.html       # Real-time bus map, bus details, fleet status
│   ├── alerts.html               # Alert list, filters, resolve flow, charts
│   └── passenger.html            # Passenger stats, distributions, passenger table
├── script/                       # Page-specific JavaScript
│   ├── script.js                 # Sidebar nav, collapse, quick actions (dashboard)
│   ├── fleet_Tracking.js         # Sidebar nav + collapse behavior
│   ├── alerts.js                 # Filter tabs, resolve, pagination, search
│   └── passenger.js              # Edit buttons, pagination, search
└── style/                        # Page-specific stylesheets
    ├── admin.css                 # Dashboard styling
    ├── fleet_Tracking.css        # Fleet tracking styling
    ├── alerts.css                # Alerts styling
    └── passenger.css             # Passenger styling
```

## 4. Module / Page Description

### 4.1 Dashboard (`pages/dashboard.html`)
The landing screen, providing a high-level operational overview:
- **Stat cards:** Total Buses (12), Active Buses (9), Total Passengers (186), Active Trips (8), Safety Alerts (3)
- **Live Fleet Tracking** — a stylized SVG map with bus markers, a school pin, zoom controls, and a status legend
- **Recent Alerts** — recent events such as *Driver Drowsiness Detected* (Bus 04), *High Speed Alert* (Bus 07)
- **Next Arrivals** — bus arrival ETA list (Bus 04, 07, 02)
- **Fleet Status** — donut chart breakdown of Active / Idle / Maintenance buses
- **Quick Actions** — Add Bus, Add Driver, Add Route, Send Notification
- **Recent Activity** — chronological event log

### 4.2 Fleet Tracking (`pages/Fleet-Tracking.html`)
Deep-dive into individual bus monitoring:
- **Stat cards:** Total Buses, Active Buses, On Route (7), At Stop (2), Maintenance (1)
- **Live Fleet Map** — multiple bus markers with an interactive popup showing speed (42 km/h), ETA, and distance for the selected bus
- **Selected Bus Details** — driver (Ram Kumar), speed, passenger load (27/40), distance, ETA, last update
- **All Buses** — searchable list with per-bus status tags (On Route / At Stop / Idle / Maintenance)
- **Route Overview** — donut chart of buses per route (A, B, C, D)
- **Live Bus Status** — progress-bar breakdown of fleet state
- **Recent Fleet Activity** — trip start/arrival/update event feed

### 4.3 Alerts (`pages/alerts.html`)
Monitoring and resolution center for safety events:
- **Stat cards:** Critical (3), Warning (8), Information (15), Resolved Today (12), Total (26)
- **Filter tabs:** All Alerts / Unresolved / Resolved
- **Alert cards:** type badges (Critical/Warning/Information), status, bus/driver, location, severity, resolve action
- **Sample alerts:** Driver Drowsiness, High Speed, Bus Approaching, Emergency Button, Sudden Braking, Maintenance Due
- **Charts:** Alerts by Type (donut), Alert Trend (weekly bar chart)
- **Recent Alert Activity** and paginated alert list

### 4.4 Passengers (`pages/passenger.html`)
Student roster and transport distribution management:
- **Stat cards:** Total (186), On Board (156), Absent Today (30), New This Month (12), Emergency Contacts (186)
- **Passenger Distribution** by grade (Grade 6–10) with percentage bars
- **Gender Distribution** (Male 98 / Female 88)
- **Passengers by Route** (Route A–D counts)
- **All Passengers** table — ID, name, grade, route, bus, stop, status (On Board/Absent), emergency contact, edit action; paginated (5 of 186 shown)

## 5. Shared UI Components

Every page reuses the same layout pattern:

- **Sidebar** — brand/logo, navigation menu (Dashboard, Fleet Tracking, Driver Dashboard, Passengers, Alerts, Reports, Routes, Maintenance, Settings), profile card, and a collapse toggle
- **Topbar** — page title, global search field (`⌘K` hint), notification bell with badge, settings icon
- **Cards** — consistent white rounded containers with headers
- **Icons** — inline SVG icons (Lucide-style strokes) throughout
- **Charts** — donut charts and bar charts built with raw SVG `<circle>`/`<div>` elements (no chart library)

## 6. JavaScript Behavior

| Script | File | Functionality |
|---|---|---|
| `script.js` | Dashboard | Active nav-state toggling, sidebar collapse animation, quick-action button feedback |
| `fleet_Tracking.js` | Fleet Tracking | Same nav + collapse behavior |
| `alerts.js` | Alerts | Filter tab switching (simulated), resolve-alert flow that updates badges/status in the DOM, pagination control, Enter-to-search (simulated) |
| `passenger.js` | Passengers | Edit buttons (simulated), pagination control, Enter-to-search (simulated) |

Note: alert/search interactions are **simulated** — e.g., clicking "Resolve" updates the UI but does not persist; search shows an `alert()` dialog instead of real filtering.

## 7. Design & Styling

- **Design tokens** defined via CSS custom properties in `admin.css` (green `#22c55e`, purple `#8b5cf6`, red `#ef4444`, orange `#f59e0b`, neutral ink/muted grays, `16px` radius, soft shadows)
- **Dark-on-light** theme with a clean white sidebar and light gray content background
- **Responsive layout** using flexbox and a multi-column card grid that collapses into stacked cards
- **Data visualization** drawn entirely with inline SVG and CSS (donut segments via `stroke-dasharray`)

## 8. Current Limitations / Gaps

1. **No backend or database** — all bus/driver/passenger/alert data is hard-coded static HTML; nothing is persisted.
2. **No real-time data** — GPS, speed, and ETA values are static; no WebSocket/API integration.
3. **Driver-drowsiness / SOS core feature not yet implemented** in the frontend — it's referenced in the README vision and alert mock-ups only.
4. **Non-functional navigation** — most sidebar links are placeholders (`href="#"`); only Dashboard → Fleet Tracking is wired.
5. **Simulated interactions** — search, filtering, resolve, and edit actions use `alert()` or local DOM changes without persistence.
6. **No authentication/roles** — a single hard-coded administrator profile (Nishant Sah).

## 9. How to Run

Serve the folder with any static file server, then open a page in the browser:

```bash
# Option A: Python
python3 -m http.server 8080
# open http://localhost:8080/pages/dashboard.html

# Option B: Node
npx serve .
```

## 10. Suggested Next Steps

1. Add a **login/auth** layer with role-based views (Admin, Driver, Student/Parent).
2. Introduce a **backend + database** (e.g., Node.js/Express + MongoDB/PostgreSQL, or Firebase) to make data dynamic.
3. Implement **real-time tracking** (WebSocket, GPS telemetry, polling APIs).
4. Build the **driver-drowsiness detection** module (camera access via `getUserMedia`, eye-state analysis, warning audio, and GPS-based SOS flow).
5. Wire the remaining pages (Driver Dashboard, Reports, Routes, Maintenance, Settings).
6. Replace `alert()`-based mock interactions with proper search/filter/resolve logic and toasts.
