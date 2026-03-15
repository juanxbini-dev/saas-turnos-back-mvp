import { Router } from 'express';
import { ConfiguracionController } from '../controllers/configuracion.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { uploadAvatar } from '../middlewares/upload.middleware';

const router = Router();
const controller = new ConfiguracionController();

router.use(authenticate, requireAdmin);

// Config general
router.get('/',                  (req, res) => controller.getConfig(req, res));
router.patch('/',                (req, res) => controller.updateConfig(req, res));
router.post('/logo',  uploadAvatar, (req, res) => controller.uploadLogo(req, res));
router.post('/fondo', uploadAvatar, (req, res) => controller.uploadFondo(req, res));

// Profesionales en landing
router.get('/profesionales',                              (req, res) => controller.getProfesionales(req, res));
router.patch('/profesionales/:usuarioId',                 (req, res) => controller.updateProfesional(req, res));
router.post('/profesionales/:usuarioId/avatar', uploadAvatar, (req, res) => controller.uploadAvatarProfesional(req, res));
router.patch('/profesionales-orden',                      (req, res) => controller.updateOrden(req, res));

export default router;
