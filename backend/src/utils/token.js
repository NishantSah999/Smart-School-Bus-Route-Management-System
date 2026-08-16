const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jwt: jwtCfg } = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, jwtCfg.secret, { expiresIn: jwtCfg.expiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtCfg.secret);
}

function signRefreshToken(payload) {
  return jwt.sign(payload, jwtCfg.refreshSecret, { expiresIn: jwtCfg.refreshExpiresIn });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, jwtCfg.refreshSecret);
}

// Refresh tokens are stored hashed in the DB so a leak of the table is not enough to forge sessions.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken, hashToken };
