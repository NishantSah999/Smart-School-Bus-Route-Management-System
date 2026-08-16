require('dotenv').config();

function int(v, d) { const n = parseInt(v, 10); return Number.isNaN(n) ? d : n; }
function str(v, d) { return v === undefined || v === '' ? d : String(v); }

module.exports = {
  env: str(process.env.NODE_ENV, 'development'),
  port: int(process.env.PORT, 8080),
  databaseUrl: str(process.env.DATABASE_URL, 'postgres://localhost:5432/smartbus'),
  jwt: {
    secret: str(process.env.JWT_SECRET, 'insecure-dev-secret'),
    refreshSecret: str(process.env.JWT_REFRESH_SECRET, 'insecure-dev-refresh-secret'),
    expiresIn: str(process.env.JWT_EXPIRES_IN, '15m'),
    refreshExpiresIn: str(process.env.JWT_REFRESH_EXPIRES_IN, '7d'),
  },
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5500,http://localhost:3000')
    .split(',').map((s) => s.trim()).filter(Boolean),
  smtp: {
    host: str(process.env.SMTP_HOST, ''),
    port: int(process.env.SMTP_PORT, 587),
    user: str(process.env.SMTP_USER, ''),
    pass: str(process.env.SMTP_PASSWORD, ''),
  },
};
