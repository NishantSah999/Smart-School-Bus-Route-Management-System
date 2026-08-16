const router = require('express').Router();
const { authRequired, authorize } = require('../middleware/auth');

router.use('/auth', require('./auth'));

// Everything below requires authentication.
router.use(authRequired);

router.use('/dashboard', require('./dashboard'));
router.use('/schools', require('./schools'));
router.use('/buses', require('./buses'));
router.use('/drivers', require('./drivers'));
router.use('/routes', require('./routes'));
router.use('/stops', require('./stops'));
router.use('/students', require('./students'));
router.use('/parents', require('./parents'));
router.use('/trips', require('./trips'));
router.use('/tracking', require('./tracking'));
router.use('/alerts', require('./alerts'));
router.use('/attendance', require('./attendance'));
router.use('/maintenance', require('./maintenance'));
router.use('/notifications', require('./notifications'));
router.use('/reports', require('./reports'));

// Audit log access (protected, read-mostly).
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
router.get('/audit-logs', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN'), asyncHandler(async (req, res) => {
  const data = await AuditLog.list({ page: req.query.page, limit: req.query.limit, action: req.query.action, entity: req.query.entity });
  res.status(200).json({ data });
}));

module.exports = router;