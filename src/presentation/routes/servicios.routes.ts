import { Router } from 'express';
import { ServiciosController } from '../controllers/servicios.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();
const serviciosController = new ServiciosController();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/servicios - Listar catálogo de servicios (todos)
router.get('/', (req, res) => serviciosController.getServicios(req, res));

// POST /api/servicios - Crear servicio (solo admin)
router.post('/', requireAdmin, (req, res) => serviciosController.createServicio(req, res));

// PUT /api/servicios/:id - Editar servicio (solo admin)
router.put('/:id', requireAdmin, (req, res) => serviciosController.updateServicio(req, res));

// PUT /api/servicios/:id/activo - Activar/desactivar servicio (solo admin)
router.put('/:id/activo', requireAdmin, (req, res) => serviciosController.toggleActivo(req, res));

// DELETE /api/servicios/:id - Eliminar servicio (solo admin)
router.delete('/:id', requireAdmin, (req, res) => serviciosController.deleteServicio(req, res));

// POST /api/servicios/:id/suscribirse - Suscribirse a servicio (todos)
router.post('/:id/suscribirse', (req, res) => serviciosController.suscribirse(req, res));

// DELETE /api/servicios/:id/suscribirse - Desuscribirse de servicio (todos)
router.delete('/:id/suscribirse', (req, res) => serviciosController.desuscribirse(req, res));

// GET /api/servicios/mis-servicios - Ver mis suscripciones (todos)
router.get('/mis-servicios', (req, res) => serviciosController.getMisServicios(req, res));

// PUT /api/servicios/mis-servicios/:id - Editar mi suscripción (todos)
router.put('/mis-servicios/:id', (req, res) => serviciosController.updateMiServicio(req, res));

export default router;
