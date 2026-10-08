import { Router } from 'express';
import * as c from '../controllers/project.controller';
import { authenticate, requireWorkspace } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/http';
import { projectSchema, updateProjectSchema } from '../validators';

const router = Router();
router.use(authenticate, requireWorkspace);
router.post('/', validate(projectSchema), h(c.createProject));
router.get('/', h(c.listProjects));
router.get('/:id', h(c.getProject));
router.patch('/:id', validate(updateProjectSchema), h(c.updateProject));
router.delete('/:id', h(c.deleteProject));
export default router;
