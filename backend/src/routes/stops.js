const router = require('express').Router();
const c = require('../controllers/stopController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateStopSchema, idParamSchema } = require('../validators');

router.use(authRequired);

router.put('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(updateStopSchema), c.update);
router.delete('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), c.remove);

module.exports = router;