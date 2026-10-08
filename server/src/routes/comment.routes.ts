import { Router } from 'express';
import * as c from '../controllers/comment.controller';
import { authenticate, requireWorkspace } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/http';
import { commentSchema } from '../validators';

const router = Router();
router.use(authenticate, requireWorkspace);
router.patch('/:id', validate(commentSchema), h(c.editComment));
router.delete('/:id', h(c.deleteComment));
export default router;
