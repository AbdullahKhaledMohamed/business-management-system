import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/auth.validator.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', loginRateLimiter, validate(loginSchema), login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

export default router;
