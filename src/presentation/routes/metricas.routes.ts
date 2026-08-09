import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { MetricasController } from '../controllers/metricas.controller';

const router = Router();
const metricasController = new MetricasController();

// Todas las métricas son a nivel empresa: solo admin
router.use(authenticate);
router.use(requireAdmin);

// GET /api/metricas/resumen - KPIs del período
router.get('/resumen', (req, res) => metricasController.getResumen(req, res));

// GET /api/metricas/evolucion - Serie temporal de facturación (agrupar=dia|mes)
router.get('/evolucion', (req, res) => metricasController.getEvolucion(req, res));

// GET /api/metricas/equipo - Comparativa de profesionales
router.get('/equipo', (req, res) => metricasController.getEquipo(req, res));

// GET /api/metricas/clientes-nuevos - Clientes nuevos del período y qué profesional eligieron
router.get('/clientes-nuevos', (req, res) => metricasController.getClientesNuevos(req, res));

// GET /api/metricas/comparativa - Comparativa detallada de profesionales (agrupar=dia|mes)
router.get('/comparativa', (req, res) => metricasController.getComparativa(req, res));

export default router;
