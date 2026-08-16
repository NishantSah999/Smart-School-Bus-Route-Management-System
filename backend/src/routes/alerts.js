const router = require('express').Router();
const c = require('../controllers/alertController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createAlertSchema, setAlertStatusSchema, idParamSchema } = require('../validators');
const { z } = require('zod');

router.use(authRequired);

router.get('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER'), c.list);
router.get('/:id', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER'), validate(idParamSchema, 'params'), c.getById);
router.post('/', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER'), validate(createAlertSchema), c.create);
router.post('/:id/acknowledge', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(setAlertStatusSchema), c.acknowledge);
router.post('/:id/resolve', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(idParamSchema, 'params'), validate(setAlertStatusSchema), c.resolve);
router.post('/safety/drowsiness', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER'), validate(z.object({
  bus_id: z.number().int().positive().optional(),
  driver_id: z.number().int().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  state: z.enum(['DETECTED', 'WARNING', 'SOS']),
})), c.reportDrowsiness);

module.exports = router;