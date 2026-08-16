const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { authRequired, authorize } = require('../middleware/auth');

router.get('/summary', authRequired, authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER'), c.dashboardSummary);

module.exports = router;