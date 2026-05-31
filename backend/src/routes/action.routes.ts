import { Router } from 'express';
import {
  listActions,
  getAction,
  createAction,
  updateAction,
  deleteAction,
  testFireAction,
  listProviders,
  getActionLogs,
} from '../controllers/action.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// All action routes require JWT authentication
router.use(authMiddleware);

// Static routes MUST come before /:id to avoid route conflicts
router.get('/providers', listProviders);
router.get('/logs', getActionLogs);

// CRUD routes
router.get('/', listActions);
router.get('/:id', getAction);
router.post('/', createAction);
router.put('/:id', updateAction);
router.delete('/:id', deleteAction);

// Test fire an action
router.post('/:id/test', testFireAction);

export default router;
