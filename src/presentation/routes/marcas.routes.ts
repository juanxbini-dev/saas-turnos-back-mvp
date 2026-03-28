import { Router } from 'express';
import { MarcasController } from '../controllers/marcas.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new MarcasController();

router.use(authenticate);

router.get('/', (req, res) => controller.getMarcas(req, res));
router.post('/', (req, res) => controller.createMarca(req, res));
router.patch('/:id', (req, res) => controller.updateMarca(req, res));
router.delete('/:id', (req, res) => controller.deleteMarca(req, res));

export default router;
