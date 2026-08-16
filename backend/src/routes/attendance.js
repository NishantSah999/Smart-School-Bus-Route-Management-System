const router = require('express').Router();
const c = require('../controllers/attendanceController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { recordAttendanceSchema, idParamSchema } = require('../validators');

router.use(authRequired);

router.post('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER', 'TEACHER'), validate(recordAttendanceSchema), c.record);
router.get('/today/counts', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER'), c.todayCounts);
router.get('/students/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER', 'PARENT'), validate(idParamSchema, 'params'), c.byStudent);
router.get('/trips/:tripId', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER'), c.byTrip);

module.exports = router;