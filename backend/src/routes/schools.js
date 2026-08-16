const router = require('express').Router();
const c = require('../controllers/schoolController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createSchoolSchema, updateSchoolSchema, idParamSchema } = require('../validators');

router.use(authRequired);

router.get('/', authorize('SUPER_ADMIN'), c.list);
router.get('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), c.getById);
router.post('/', authorize('SUPER_ADMIN'), validate(createSchoolSchema), c.create);
router.put('/:id', authorize('SUPER_ADMIN'), validate(idParamSchema, 'params'), validate(updateSchoolSchema), c.update);

module.exports = router;