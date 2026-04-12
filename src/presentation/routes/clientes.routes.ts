import { Router } from 'express';
import { ClientesController } from '../controllers/clientes.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const clientesController = new ClientesController();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/clientes - Listar clientes de la empresa (todos pueden)
router.get('/', (req, res) => clientesController.getClientes(req, res));

// GET /api/clientes/mis-clientes - Listar clientes del profesional actual
router.get('/mis-clientes', (req, res) => clientesController.getMisClientes(req, res));

// GET /api/clientes/:id/perfil - Ver perfil completo con historial de turnos
router.get('/:id/perfil', (req, res) => clientesController.getPerfilCliente(req, res));

// POST /api/clientes - Crear cliente (admin y staff)
router.post('/', (req, res) => clientesController.createCliente(req, res));

// PUT /api/clientes/:id - Editar cliente (admin y staff)
router.put('/:id', (req, res) => clientesController.updateCliente(req, res));

// DELETE /api/clientes/:id - Eliminar cliente (solo admin)
router.delete('/:id', (req, res) => clientesController.deleteCliente(req, res));

export default router;
