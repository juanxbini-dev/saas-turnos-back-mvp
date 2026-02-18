import { Router } from 'express';
import { RefreshController } from '../controllers/refresh.controller';

const router = Router();
const refreshController = new RefreshController();

// POST /auth/refresh
router.post('/refresh', (req, res) => refreshController.refresh(req, res));

export default router;
