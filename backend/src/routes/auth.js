const router = require('express').Router();
const c = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { loginSchema, refreshSchema } = require('../validators');
const { authRequired } = require('../middleware/auth');

router.post('/login', validate(loginSchema), c.login);
router.post('/logout', c.logout);
router.post('/refresh', validate(refreshSchema), c.refresh);
router.get('/me', authRequired, c.me);
router.post('/change-password', authRequired, validate(require('../validators').loginSchema.partial().extend({ currentPassword: require('zod').z.string().min(1), newPassword: require('zod').z.string().min(6) })), c.changePassword);

module.exports = router;