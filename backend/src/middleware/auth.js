const { verifyAccessToken } = require('../utils/token');
const AppError = require('../utils/AppError');
const { query } = require('../config/db');

// Authenticate requests via `Authorization: Bearer <jwt>`.
async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));

  try {
    const payload = verifyAccessToken(token);
    const { rows } = await query(
      'SELECT id, name, email, role, status, profile_image, school_id FROM users WHERE id = $1',
      [payload.sub]
    );
    if (rows.length === 0) return next(new AppError(401, 'User no longer exists', 'UNAUTHENTICATED'));
    if (rows[0].status !== 'ACTIVE') return next(new AppError(403, 'Account is not active', 'ACCOUNT_DISABLED'));
    req.user = { ...rows[0] };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new AppError(401, 'Session expired', 'TOKEN_EXPIRED'));
    if (err.name === 'JsonWebTokenError') return next(new AppError(401, 'Invalid token', 'INVALID_TOKEN'));
    return next(new AppError(401, 'Authentication failed', 'UNAUTHENTICATED'));
  }
}

// Role-based access control. Enforced server-side, never rely on the frontend alone.
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
    if (req.user.role === 'SUPER_ADMIN') return next();
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { authRequired, authorize };
