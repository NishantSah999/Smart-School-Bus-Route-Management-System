const router = require('express').Router();
const c = require('../controllers/reportController');
const { authRequired, authorize } = require('../middleware/auth');

router.use(authRequired);
router.use(authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'));

router.get('/trips', c.trips);
router.get('/trips/daily', c.dailyTrips);
router.get('/utilization', c.utilization);
router.get('/driver-safety', c.driverSafety);
router.get('/routes', c.routePerformance);
router.get('/attendance', c.attendanceReport);
router.get('/alerts', c.alertsReport);
router.get('/export', c.exportCsv);

module.exports = router;