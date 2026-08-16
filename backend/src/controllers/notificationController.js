const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

const mine = asyncHandler(async (req, res) => {
  const data = await Notification.listForUser(req.user.id, {
    page: req.query.page, limit: req.query.limit, unreadOnly: req.query.unread === 'true',
  });
  res.status(200).json({ data });
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.markRead(req.user.id, req.params.id);
  res.status(200).json({ data: { ok: true } });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.markAllRead(req.user.id);
  res.status(200).json({ data: { ok: true } });
});

// Admin can push a notification to a user or a school.
const send = asyncHandler(async (req, res) => {
  const { user_id, school_id, title, body, type } = req.body;
  const { query } = require('../config/db');
  if (school_id) {
    const { rows } = await query('SELECT id FROM users WHERE school_id = $1', [school_id]);
    for (const u of rows) await Notification.create({ user_id: u.id, title, body, type });
  }
  if (user_id) await Notification.create({ user_id, title, body, type });
  res.status(201).json({ data: { ok: true } });
});

module.exports = { mine, markRead, markAllRead, send };