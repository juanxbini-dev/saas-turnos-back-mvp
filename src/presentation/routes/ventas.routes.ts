import { Router } from 'express';
import { VentasController } from '../controllers/ventas.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new VentasController();

router.use(authenticate);

router.post('/', (req, res) => controller.createVenta(req, res));

export default router;
