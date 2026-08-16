const router = require('express').Router();
const c = require('../controllers/trackingController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { locationSchema } = require('../validators');

// GPS device ingestion — requires authentication (device token works via the same JWT for now).
router.post('/location', authRequired, authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER'), validate(locationSchema), c.ingestLocation);
router.get('/fleet', authRequired, authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER', 'PARENT', 'DRIVER'), c.fleetSnapshot);

module.exports = router;