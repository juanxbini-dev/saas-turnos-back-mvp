import { Router } from 'express';
import { UsuariosController } from '../controllers/usuarios.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();
const usuariosController = new UsuariosController();

// GET /api/usuarios/profesionales - lista paginada de todos los usuarios activos de la empresa incluyendo admins. Solo admin.
router.get('/profesionales', authenticate, (req, res) => usuariosController.getProfesionales(req, res));

// GET /api/usuarios/:id/servicios - servicios suscriptos por ese profesional. Todos los autenticados.
router.get('/:id/servicios', authenticate, (req, res) => usuariosController.getServiciosProfesional(req, res));

// Todas las rutas siguientes requieren autenticación y rol de admin
router.use(authenticate);
router.use(requireAdmin);

// GET /api/usuarios - Listar usuarios del tenant
router.get('/', (req, res) => usuariosController.getUsuarios(req, res));

// POST /api/usuarios - Crear usuario
router.post('/', (req, res) => usuariosController.createUsuario(req, res));

// PUT /api/usuarios/:id/datos - Editar nombre y username
router.put('/:id/datos', (req, res) => usuariosController.updateDatos(req, res));

// PUT /api/usuarios/:id/password - Cambiar password
router.put('/:id/password', (req, res) => usuariosController.updatePassword(req, res));

// PUT /api/usuarios/:id/rol - Cambiar rol
router.put('/:id/rol', (req, res) => usuariosController.updateRol(req, res));

// PUT /api/usuarios/:id/activo - Activar o desactivar
router.put('/:id/activo', (req, res) => usuariosController.toggleActivo(req, res));

export default router;
