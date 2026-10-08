import { Router } from 'express';
import * as c from '../controllers/workspace.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/http';
import { addMemberSchema, changeRoleSchema, updateWorkspaceSchema, workspaceSchema } from '../validators';

const router = Router();
router.use(authenticate);
router.post('/', validate(workspaceSchema), h(c.createWorkspace));
router.get('/:id', h(c.getWorkspace));
router.patch('/:id', requireRole('ADMIN'), validate(updateWorkspaceSchema), h(c.updateWorkspace));
router.delete('/:id', requireRole('ADMIN'), h(c.deleteWorkspace));
router.get('/:id/members', h(c.listMembers));
router.post('/:id/members', requireRole('ADMIN'), validate(addMemberSchema), h(c.addMember));
router.patch('/:id/members/:userId', requireRole('ADMIN'), validate(changeRoleSchema), h(c.changeMemberRole));
router.delete('/:id/members/:userId', requireRole('ADMIN'), h(c.removeMember));
export default router;
