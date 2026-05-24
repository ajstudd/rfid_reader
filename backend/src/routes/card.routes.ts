import { Router } from 'express';
import { validateCard, registerCard, unregisterCard } from '../controllers/card.controller';
import deviceMiddleware from '../middleware/device.middleware';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// ESP32 device route (API key auth)
router.post('/validate', deviceMiddleware, validateCard);

// Dashboard routes (JWT auth)
router.post('/register', authMiddleware, registerCard);
router.delete('/unregister/:userId', authMiddleware, unregisterCard);

export default router;
