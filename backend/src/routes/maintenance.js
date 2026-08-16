const router = require('express').Router();
const c = require('../controllers/maintenanceController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createMaintenanceSchema, updateMaintenanceSchema, idParamSchema } = require('../validators');

router.use(authRequired);

router.get('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), c.list);
router.get('/due', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), c.dueSoon);
router.get('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), c.getById);
router.post('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(createMaintenanceSchema), c.create);
router.put('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(updateMaintenanceSchema), c.update);

module.exports = router;