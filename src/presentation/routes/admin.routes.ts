import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();
const adminController = new AdminController();

router.use(authenticate);
router.use(requireSuperAdmin);

// GET /admin/stats - estadísticas globales del sistema
router.get('/stats', (req, res) => adminController.getGlobalStats(req, res));

// GET /admin/empresas - listar todas las empresas con stats
router.get('/empresas', (req, res) => adminController.getEmpresas(req, res));

// GET /admin/empresas/:id - detalle de empresa + usuarios
router.get('/empresas/:id', (req, res) => adminController.getEmpresaDetalle(req, res));

// PATCH /admin/empresas/:id/activo - activar/desactivar empresa
router.patch('/empresas/:id/activo', (req, res) => adminController.toggleEmpresaActivo(req, res));

export default router;
