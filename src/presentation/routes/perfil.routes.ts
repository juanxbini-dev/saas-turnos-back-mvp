import { Router } from 'express';
import { PerfilController } from '../controllers/perfil.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadAvatar } from '../middlewares/upload.middleware';

const router = Router();
const controller = new PerfilController();

// Todas las rutas requieren autenticacion
router.use(authenticate);

// GET /api/perfil/me - Obtener perfil del usuario actual
router.get('/me', (req, res) => controller.getProfile(req, res));

// POST /api/perfil/avatar - Subir/actualizar avatar
router.post('/avatar', uploadAvatar, (req, res) => controller.uploadAvatar(req, res));

// DELETE /api/perfil/avatar - Eliminar avatar
router.delete('/avatar', (req, res) => controller.deleteAvatar(req, res));

export default router;
