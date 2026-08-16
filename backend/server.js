const express = require('express');
const http = require('http');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { port, corsOrigin, env } = require('./src/config/env');
const { errorHandler, notFound } = require('./src/middleware/error');
const routes = require('./src/routes');
const { attachSockets } = require('./src/sockets');

const app = express();

// ---------- Security & parsing ----------
app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));
app.get('/', (_req, res) => res.redirect('/pages/login.html'));

// Serve the existing frontend from the same origin so no CORS proxy is needed.
const frontendRoot = path.join(__dirname, '..');
app.use(express.static(frontendRoot));

app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
attachSockets(server, corsOrigin);

server.listen(port, () => {
  console.log(`[smartbus] API listening on http://localhost:${port} (env=${env})`);
  console.log(`[smartbus] Socket.IO enabled`);
});

process.on('unhandledRejection', (err) => console.error('[smartbus] unhandledRejection', err));
process.on('uncaughtException', (err) => console.error('[smartbus] uncaughtException', err));

module.exports = app;