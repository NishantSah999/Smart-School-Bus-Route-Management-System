const router = require('express').Router();
const c = require('../controllers/tripController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { startTripSchema, endTripSchema, idParamSchema } = require('../validators');

router.use(authRequired);

router.get('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER', 'PARENT'), c.list);
router.get('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER', 'PARENT'), validate(idParamSchema, 'params'), c.getById);
router.post('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER'), validate(startTripSchema), c.start);
router.post('/:id/end', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER'), validate(idParamSchema, 'params'), validate(endTripSchema), c.end);

module.exports = router;