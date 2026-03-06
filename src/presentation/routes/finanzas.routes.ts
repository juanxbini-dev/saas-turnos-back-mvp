import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { FinanzasController } from '../controllers/finanzas.controller';

const router = Router();
const finanzasController = new FinanzasController();

// Apply authentication middleware to all finanzas routes
router.use(authenticate);

// GET /api/finanzas/me - Obtener finanzas del usuario autenticado
router.get('/me', (req, res) => finanzasController.getMyFinanzas(req, res));

// GET /api/finanzas/profesional/:id - Obtener finanzas de un profesional (solo admin)
router.get('/profesional/:id', (req, res) => finanzasController.getFinanzasByProfesional(req, res));

export default router;
