import { Router } from 'express';
import { changePassword, getMe, updateMe } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import { changePasswordSchema, updateProfileSchema } from '../validators';

const router = Router();
router.use(authenticate);
router.get('/me', asyncHandler(getMe));
router.patch('/me', validate(updateProfileSchema), asyncHandler(updateMe));
router.patch('/me/password', validate(changePasswordSchema), asyncHandler(changePassword));
export default router;
