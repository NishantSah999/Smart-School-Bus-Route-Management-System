const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/token');
const { pool } = require('../config/db');
const { setIO } = require('../services/socketService');

// Attach Socket.IO to the HTTP server and authenticate sockets with the same JWT.
function attachSockets(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    transports: ['websocket', 'polling'],
  });
  setIO(io);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = verifyAccessToken(token);
      const { rows } = await pool.query(
        'SELECT id, name, email, role, status, school_id FROM users WHERE id = $1',
        [payload.sub]
      );
      if (rows.length === 0 || rows[0].status !== 'ACTIVE') return next(new Error('unauthorized'));
      socket.user = rows[0];
      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const u = socket.user;
    socket.join(`user:${u.id}`);
    if (u.school_id) socket.join(`school:${u.school_id}`);
    // Admins & managers subscribe to all fleet events.
    if (['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'].includes(u.role)) {
      socket.join('fleet');
    }
    socket.on('bus:subscribe', (busId) => socket.join(`bus:${busId}`));
    socket.on('bus:unsubscribe', (busId) => socket.leave(`bus:${busId}`));
    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = { attachSockets };