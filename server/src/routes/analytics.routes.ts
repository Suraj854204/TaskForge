import { Router } from 'express';
import * as c from '../controllers/analytics.controller';
import { authenticate, requireWorkspace } from '../middleware/auth';
import { asyncHandler as h } from '../utils/http';

const router = Router();
router.use(authenticate, requireWorkspace);
router.get('/dashboard', h(c.dashboard));
router.get('/productivity', h(c.productivity));
export default router;
