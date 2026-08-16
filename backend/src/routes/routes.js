const router = require('express').Router();
const c = require('../controllers/routeController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createRouteSchema, updateRouteSchema, createStopSchema, reorderStopsSchema, idParamSchema } = require('../validators');

router.use(authRequired);

router.get('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER', 'PARENT'), c.list);
router.get('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER', 'PARENT'), validate(idParamSchema, 'params'), c.getById);
router.post('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(createRouteSchema), c.create);
router.put('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(updateRouteSchema), c.update);

router.get('/:id/stops', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER', 'PARENT'), validate(idParamSchema, 'params'), c.listStops);
router.post('/:id/stops', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(createStopSchema), c.addStop);
router.put('/:id/stops/reorder', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(reorderStopsSchema), c.reorderStops);

module.exports = router;