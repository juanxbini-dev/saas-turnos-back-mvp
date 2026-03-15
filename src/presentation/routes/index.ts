import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { TestController } from '../controllers/test.controller';
import { CheckController } from '../controllers/check.controller';
import { GetHealthUseCase } from '../../application/use-cases/GetHealthUseCase';
import { TestDatabaseUseCase } from '../../application/use-cases/TestDatabaseUseCase';
import { PostgresDatabaseRepository } from '../../infrastructure/repositories/PostgresDatabaseRepository';
import authRoutes from './auth.routes';
import refreshRoutes from './refresh.routes';
import logoutRoutes from './logout.routes';
import usuariosRoutes from './usuarios.routes';
import serviciosRoutes from './servicios.routes';
import clientesRoutes from './clientes.routes';
import turnosRoutes from './turnos.routes';
import mailDeliveryRoutes from './mailDelivery.routes';
import publicRoutes from './public.routes';
import finanzasRoutes from './finanzas.routes';
import perfilRoutes from './perfil.routes';
import configuracionRoutes from './configuracion.routes';
import productosRoutes from './productos.routes';
import ventasRoutes from './ventas.routes';

const router = Router();

// Dependencies
const databaseRepository = new PostgresDatabaseRepository();
const getHealthUseCase = new GetHealthUseCase();
const testDatabaseUseCase = new TestDatabaseUseCase(databaseRepository);

// Controllers
const healthController = new HealthController(getHealthUseCase);
const testController = new TestController(testDatabaseUseCase);
const checkController = new CheckController();

// Routes
router.get('/health', (req, res) => healthController.getHealth(req, res));
router.get('/api/test-db', (req, res) => testController.testDatabase(req, res));
router.get('/api/check-users', (req, res) => checkController.checkUsers(req, res));

// Auth routes
router.use('/auth', authRoutes);
router.use('/auth', refreshRoutes);
router.use('/auth', logoutRoutes);

// Usuarios routes
router.use('/api/usuarios', usuariosRoutes);

// Servicios routes
router.use('/api/servicios', serviciosRoutes);

// Clientes routes
router.use('/api/clientes', clientesRoutes);

// Turnos routes
router.use('/api/turnos', turnosRoutes);

// Finanzas routes
router.use('/api/finanzas', finanzasRoutes);

// Perfil routes
router.use('/api/perfil', perfilRoutes);

// Configuracion routes (admin)
router.use('/api/configuracion', configuracionRoutes);

// Productos routes
router.use('/api/productos', productosRoutes);

// Ventas directas routes
router.use('/api/ventas', ventasRoutes);

// Mail delivery routes
router.use('/api/mail-delivery', mailDeliveryRoutes);

// Public routes (sin autenticación)
router.use('/public', publicRoutes);

export default router;
