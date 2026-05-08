import { Router } from 'express';
import { VentasController } from '../controllers/ventas.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new VentasController();

router.use(authenticate);

router.get('/', (req, res) => controller.getVentas(req, res));
router.post('/', (req, res) => controller.createVenta(req, res));
router.patch('/:id', (req, res) => controller.updateVenta(req, res));
router.delete('/:id', (req, res) => controller.deleteVenta(req, res));

export default router;
