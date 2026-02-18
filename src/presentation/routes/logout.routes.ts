import { Router } from 'express';
import { LogoutController } from '../controllers/logout.controller';

const router = Router();
const logoutController = new LogoutController();

// POST /auth/logout
router.post('/logout', (req, res) => logoutController.logout(req, res));

export default router;
