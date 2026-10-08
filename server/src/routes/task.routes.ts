import { Router } from 'express';
import * as t from '../controllers/task.controller';
import * as c from '../controllers/comment.controller';
import { authenticate, requireWorkspace } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/http';
import { commentSchema, taskQuerySchema, taskSchema, updateTaskSchema } from '../validators';

const router = Router();
router.use(authenticate, requireWorkspace);
router.post('/', validate(taskSchema), h(t.create));
router.get('/', validate(taskQuerySchema, 'query'), h(t.list));
router.get('/:id', h(t.getOne));
router.patch('/:id', validate(updateTaskSchema), h(t.update));
router.delete('/:id', h(t.remove));
router.post('/:taskId/comments', validate(commentSchema), h(c.addComment));
router.get('/:taskId/comments', h(c.listComments));
export default router;
