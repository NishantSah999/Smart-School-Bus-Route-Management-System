const router = require('express').Router();
const c = require('../controllers/notificationController');
const { authRequired, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { z } = require('zod');

router.use(authRequired);

router.get('/', c.mine);
router.post('/:id/read', validate(z.object({ id: z.string().regex(/^\d+$/).transform(Number) }), 'params'), c.markRead);
router.post('/read-all', c.markAllRead);
router.post('/send', authorize('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER'), validate(z.object({
  user_id: z.number().int().positive().optional(),
  school_id: z.number().int().positive().optional(),
  title: z.string().min(1).max(190),
  body: z.string().max(2000).optional(),
  type: z.string().max(30).optional(),
})), c.send);

module.exports = router;