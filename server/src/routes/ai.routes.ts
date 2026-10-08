import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { taskAssistant } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/http';
import { aiPromptSchema } from '../validators';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  skip: () => env.nodeEnv === 'test',
  message: { success: false, message: 'Too many AI requests, slow down', errors: [] },
});

const router = Router();
router.post('/task-assistant', authenticate, aiLimiter, validate(aiPromptSchema), h(taskAssistant));
export default router;
