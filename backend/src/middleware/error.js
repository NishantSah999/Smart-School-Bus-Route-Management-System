const AppError = require('../utils/AppError');

// Centralized error handler. Never leaks internals to the client.
function errorHandler(err, req, res, _next) {
  let { statusCode = 500, message = 'Something went wrong', code = 'INTERNAL' } = err;

  if (err.name === 'ZodError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  }
  if (err.code === '23505') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A record with the same unique value already exists';
  }
  if (err.code === '23503') {
    statusCode = 400;
    code = 'FOREIGN_KEY';
    message = 'Referenced record does not exist';
  }

  if (statusCode >= 500) console.error('[error]', err);

  res.status(statusCode).json({
    error: { code, message },
  });
}

function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` } });
}

module.exports = { errorHandler, notFound };
