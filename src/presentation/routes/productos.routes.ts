import { Router } from 'express';
import { ProductosController } from '../controllers/productos.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new ProductosController();

router.use(authenticate);

router.get('/stats', (req, res) => controller.getStats(req, res));
router.get('/ventas-finanzas', (req, res) => controller.getVentasFinanzas(req, res));
router.get('/', (req, res) => controller.getProductos(req, res));
router.post('/', (req, res) => controller.createProducto(req, res));
router.patch('/:id', (req, res) => controller.updateProducto(req, res));
router.delete('/:id', (req, res) => controller.deleteProducto(req, res));
router.post('/:id/stock', (req, res) => controller.addStock(req, res));

export default router;
