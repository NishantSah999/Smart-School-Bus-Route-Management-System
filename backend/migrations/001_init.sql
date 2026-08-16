-- SmartBus initial schema
-- v1: users, schools, drivers, buses, routes, stops, students, parents,
--     trips, gps_updates, alerts, attendance, maintenance, notifications, audit_logs

BEGIN;

-- ============================= ENUMS =============================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('SUPER_ADMIN','SCHOOL_ADMIN','TRANSPORT_MANAGER','DRIVER','TEACHER','PARENT','STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('ACTIVE','INACTIVE','SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bus_status AS ENUM ('ACTIVE','IDLE','ON_ROUTE','AT_STOP','MAINTENANCE','OFFLINE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE driver_status AS ENUM ('AVAILABLE','ON_DUTY','ON_TRIP','OFF_DUTY','SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trip_type AS ENUM ('MORNING','AFTERNOON','SPECIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM ('SCHEDULED','ACTIVE','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM ('DROWSINESS','SOS','OVERSPEED','HARSH_BRAKING','ACCIDENT','GEOFENCE','BUS_OFFLINE','MAINTENANCE','LATE_ARRIVAL','ROUTE_DEVIATION','EMERGENCY_BUTTON');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('CRITICAL','WARNING','INFO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('OPEN','ACKNOWLEDGED','RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('BOARDED','NOT_BOARDED','ABSENT','DROPPED_OFF','UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_status AS ENUM ('GOOD','DUE_SOON','OVERDUE','IN_SERVICE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================= USERS =============================
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(190) UNIQUE NOT NULL,
  phone           VARCHAR(30),
  password_hash   VARCHAR(255) NOT NULL,
  role            user_role NOT NULL DEFAULT 'PARENT',
  status          user_status NOT NULL DEFAULT 'ACTIVE',
  profile_image   TEXT,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================= SCHOOLS =============================
CREATE TABLE IF NOT EXISTS schools (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(190) NOT NULL,
  code       VARCHAR(30) UNIQUE NOT NULL,
  address    TEXT,
  phone      VARCHAR(30),
  email      VARCHAR(190),
  latitude   DOUBLE PRECISION,
  longitude  DOUBLE PRECISION,
  status     user_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================= DRIVERS =============================
CREATE TABLE IF NOT EXISTS drivers (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name               VARCHAR(120) NOT NULL,
  phone              VARCHAR(30),
  license_number     VARCHAR(60) UNIQUE NOT NULL,
  license_expiry     DATE NOT NULL,
  emergency_contact  VARCHAR(30),
  date_of_birth      DATE,
  experience_years   INTEGER DEFAULT 0,
  status             driver_status NOT NULL DEFAULT 'AVAILABLE',
  school_id          INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================= BUSES =============================
CREATE TABLE IF NOT EXISTS buses (
  id                  SERIAL PRIMARY KEY,
  bus_number          VARCHAR(30) UNIQUE NOT NULL,
  registration_number VARCHAR(60) UNIQUE NOT NULL,
  model               VARCHAR(120),
  capacity            INTEGER NOT NULL DEFAULT 40,
  device_id           VARCHAR(120),
  driver_id           INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  school_id           INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  status              bus_status NOT NULL DEFAULT 'ACTIVE',
  fuel_type           VARCHAR(20),
  last_latitude       DOUBLE PRECISION,
  last_longitude      DOUBLE PRECISION,
  last_speed          DOUBLE PRECISION DEFAULT 0,
  last_heading        DOUBLE PRECISION DEFAULT 0,
  last_update         TIMESTAMPTZ,
  odometer            DOUBLE PRECISION DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================= ROUTES =============================
CREATE TABLE IF NOT EXISTS routes (
  id                 SERIAL PRIMARY KEY,
  name               VARCHAR(120) NOT NULL,
  route_code         VARCHAR(30) UNIQUE NOT NULL,
  description        TEXT,
  school_id          INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  start_location     VARCHAR(190),
  end_location       VARCHAR(190),
  estimated_duration INTEGER,
  distance           DOUBLE PRECISION,
  status             user_status NOT NULL DEFAULT 'ACTIVE',
  speed_limit        DOUBLE PRECISION DEFAULT 60,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================= STOPS =============================
CREATE TABLE IF NOT EXISTS stops (
  id                SERIAL PRIMARY KEY,
  route_id          INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name              VARCHAR(120) NOT NULL,
  address           TEXT,
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  sequence          INTEGER NOT NULL DEFAULT 0,
  estimated_arrival TIME,
  status            user_status NOT NULL DEFAULT 'ACTIVE'
);
CREATE INDEX IF NOT EXISTS idx_stops_route ON stops(route_id);

-- ============================= PARENTS =============================
CREATE TABLE IF NOT EXISTS parents (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name                  VARCHAR(120) NOT NULL,
  phone                 VARCHAR(30),
  email                 VARCHAR(190),
  relationship          VARCHAR(30),
  emergency_contact     VARCHAR(30),
  notification_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================= STUDENTS =============================
CREATE TABLE IF NOT EXISTS students (
  id              SERIAL PRIMARY KEY,
  student_id      VARCHAR(30) UNIQUE NOT NULL,
  name            VARCHAR(120) NOT NULL,
  date_of_birth   DATE,
  gender          VARCHAR(10),
  grade           VARCHAR(20),
  section         VARCHAR(10),
  school_id       INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  parent_id       INTEGER REFERENCES parents(id) ON DELETE SET NULL,
  route_id        INTEGER REFERENCES routes(id) ON DELETE SET NULL,
  bus_id          INTEGER REFERENCES buses(id) ON DELETE SET NULL,
  pickup_stop_id  INTEGER REFERENCES stops(id) ON DELETE SET NULL,
  drop_stop_id    INTEGER REFERENCES stops(id) ON DELETE SET NULL,
  photo           TEXT,
  status          user_status NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================= TRIPS =============================
CREATE TABLE IF NOT EXISTS trips (
  id              SERIAL PRIMARY KEY,
  bus_id          INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  driver_id       INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  route_id        INTEGER REFERENCES routes(id) ON DELETE SET NULL,
  trip_type       trip_type NOT NULL DEFAULT 'MORNING',
  status          trip_status NOT NULL DEFAULT 'SCHEDULED',
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  start_latitude  DOUBLE PRECISION,
  start_longitude DOUBLE PRECISION,
  end_latitude    DOUBLE PRECISION,
  end_longitude   DOUBLE PRECISION,
  distance        DOUBLE PRECISION DEFAULT 0,
  duration        INTEGER,
  passenger_count INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================= GPS =============================
CREATE TABLE IF NOT EXISTS gps_updates (
  id         BIGSERIAL PRIMARY KEY,
  bus_id     INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  device_id  VARCHAR(120),
  latitude   DOUBLE PRECISION NOT NULL,
  longitude  DOUBLE PRECISION NOT NULL,
  speed      DOUBLE PRECISION DEFAULT 0,
  heading    DOUBLE PRECISION DEFAULT 0,
  accuracy   DOUBLE PRECISION,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gps_bus_time ON gps_updates(bus_id, timestamp DESC);

-- ============================= ALERTS =============================
CREATE TABLE IF NOT EXISTS alerts (
  id          SERIAL PRIMARY KEY,
  type        alert_type NOT NULL,
  severity    alert_severity NOT NULL DEFAULT 'WARNING',
  bus_id      INTEGER REFERENCES buses(id) ON DELETE SET NULL,
  driver_id   INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  route_id    INTEGER REFERENCES routes(id) ON DELETE SET NULL,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  message     TEXT,
  status      alert_status NOT NULL DEFAULT 'OPEN',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_bus ON alerts(bus_id);

-- ============================= ATTENDANCE =============================
CREATE TABLE IF NOT EXISTS attendance (
  id           BIGSERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  trip_id      INTEGER REFERENCES trips(id) ON DELETE CASCADE,
  bus_id       INTEGER REFERENCES buses(id) ON DELETE SET NULL,
  stop_id      INTEGER REFERENCES stops(id) ON DELETE SET NULL,
  status       attendance_status NOT NULL DEFAULT 'UNKNOWN',
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  method       VARCHAR(20) DEFAULT 'MANUAL'
);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_trip ON attendance(trip_id);

-- ============================= MAINTENANCE =============================
CREATE TABLE IF NOT EXISTS maintenance (
  id              SERIAL PRIMARY KEY,
  bus_id          INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  service_date    DATE NOT NULL,
  next_service    DATE,
  odometer        DOUBLE PRECISION,
  status          maintenance_status NOT NULL DEFAULT 'GOOD',
  oil             VARCHAR(60),
  tyres           VARCHAR(60),
  brakes          VARCHAR(60),
  battery         VARCHAR(60),
  insurance_due   DATE,
  registration_due DATE,
  remarks         TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_bus ON maintenance(bus_id, service_date DESC);

-- ============================= NOTIFICATIONS =============================
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(190) NOT NULL,
  body        TEXT,
  type        VARCHAR(30) DEFAULT 'INFO',
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- ============================= AUDIT LOGS =============================
CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER,
  action     VARCHAR(120) NOT NULL,
  entity     VARCHAR(60),
  entity_id  INTEGER,
  ip         VARCHAR(60),
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

COMMIT;
