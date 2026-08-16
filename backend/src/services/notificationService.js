const Notification = require('../models/Notification');

// Creates an in-app notification and pushes it live over Socket.IO.
// SMTP/push are intentionally stub-able; the interface is the contract.
async function notify({ user_id, title, body, type = 'INFO', socketIO, to }) {
  let row = null;
  try {
    row = await Notification.create({ user_id, title, body, type });
  } catch (e) {
    console.error('[notify] db error', e.message);
  }
  if (socketIO && to) socketIO.to(to).emit('notification:new', { ...row, title, body, type });
  return row;
}

// Send an email via SMTP when configured. No-op when SMTP is not configured.
async function sendEmail(_to, _subject, _text) {
  // Placeholder for SMTP integration. Wire with nodemailer when SMTP_* env vars are set.
  return { queued: false };
}

module.exports = { notify, sendEmail };