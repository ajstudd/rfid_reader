import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, getMe);

export default router;
