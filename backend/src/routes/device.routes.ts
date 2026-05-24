import { Router } from 'express';
import { getDevices, updateDevice } from '../controllers/device.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// All device routes require JWT auth
router.use(authMiddleware);

router.get('/', getDevices);
router.put('/:id', updateDevice);

export default router;
