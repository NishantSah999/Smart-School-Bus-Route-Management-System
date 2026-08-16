const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Parent = require('../models/Parent');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  signAccessToken, signRefreshToken, verifyRefreshToken, hashToken,
} = require('../utils/token');
const { jwt: jwtCfg } = require('../config/env');

function publicUser(u) {
  const { password_hash, ...safe } = u;
  return safe;
}

function issueTokens(user) {
  const access = signAccessToken({ sub: user.id, role: user.role });
  const refresh = signRefreshToken({ sub: user.id });
  return { access, refresh };
}

async function loginWith({ user, password, ip }) {
  if (!user) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (user.status !== 'ACTIVE') throw new AppError(403, 'Account is not active', 'ACCOUNT_DISABLED');
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

  const { access, refresh } = issueTokens(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await User.saveRefreshToken(user.id, hashToken(refresh), expiresAt);
  await User.updateLastLogin(user.id);
  await AuditLog.record({ user_id: user.id, action: 'LOGIN', entity: 'user', entity_id: user.id, ip });

  let profile = null;
  if (user.role === 'DRIVER') profile = await Driver.findByUserId(user.id);
  if (user.role === 'PARENT') profile = await Parent.findByUserId(user.id);

  return { accessToken: access, refreshToken: refresh, user: { ...publicUser(user), profile } };
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findByEmail(email);
  const data = await loginWith({ user, password, ip: req.ip });
  res.status(200).json({ data });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await User.revokeRefreshToken(hashToken(refreshToken));
  if (req.user) await AuditLog.record({ user_id: req.user.id, action: 'LOGOUT', entity: 'user', entity_id: req.user.id, ip: req.ip });
  res.status(204).send();
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH');
  }
  const stored = await User.findRefreshToken(hashToken(refreshToken));
  if (!stored) throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH');

  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'ACTIVE') throw new AppError(403, 'Account is not active', 'ACCOUNT_DISABLED');

  await User.revokeRefreshToken(hashToken(refreshToken));
  const { access, refresh: newRefresh } = issueTokens(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await User.saveRefreshToken(user.id, hashToken(newRefresh), expiresAt);

  res.status(200).json({ data: { accessToken: access, refreshToken: newRefresh } });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  let profile = null;
  if (user.role === 'DRIVER') profile = await Driver.findByUserId(user.id);
  if (user.role === 'PARENT') profile = await Parent.findByUserId(user.id);
  res.status(200).json({ data: { ...publicUser(user), profile } });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) throw new AppError(400, 'Current password is incorrect', 'BAD_CURRENT_PASSWORD');
  if (newPassword.length < 6) throw new AppError(422, 'New password must be at least 6 characters', 'VALIDATION_ERROR');
  const hash = await bcrypt.hash(newPassword, 10);
  await User.setPassword(user.id, hash);
  await User.revokeAllRefreshTokens(user.id);
  await AuditLog.record({ user_id: user.id, action: 'CHANGE_PASSWORD', entity: 'user', entity_id: user.id, ip: req.ip });
  res.status(200).json({ data: { message: 'Password updated' } });
});

module.exports = { login, logout, refresh, me, changePassword, publicUser, issueTokens, loginWith };