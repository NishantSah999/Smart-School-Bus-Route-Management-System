const router = require('express').Router();
const c = require('../controllers/busController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createBusSchema, updateBusSchema, idParamSchema } = require('../validators');
const { z } = require('zod');

router.use(authRequired);

router.get('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER'), c.list);
router.get('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER', 'PARENT'), validate(idParamSchema, 'params'), c.getById);
router.get('/:id/history', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), c.locationHistory);
router.post('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(createBusSchema), c.create);
router.put('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(updateBusSchema), c.update);
router.post('/:id/assign-driver', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(z.object({ driver_id: z.number().int().positive() })), c.assignDriver);
router.post('/:id/deactivate', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN'), validate(idParamSchema, 'params'), c.deactivate);

module.exports = router;