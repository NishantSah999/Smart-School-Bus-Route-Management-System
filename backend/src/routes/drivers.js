const router = require('express').Router();
const c = require('../controllers/driverController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createDriverSchema, updateDriverSchema, idParamSchema } = require('../validators');

router.use(authRequired);

router.get('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), c.list);
router.get('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), c.getById);
router.post('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(createDriverSchema), c.create);
router.put('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(updateDriverSchema), c.update);
router.delete('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN'), validate(idParamSchema, 'params'), c.remove);

module.exports = router;