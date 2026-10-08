import { Router } from 'express';
import * as c from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler as h } from '../utils/http';

const router = Router();
router.use(authenticate);
router.get('/', h(c.list));
router.patch('/read-all', h(c.markAllRead));
router.patch('/:id/read', h(c.markRead));
export default router;
