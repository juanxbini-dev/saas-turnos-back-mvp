import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { TestController } from '../controllers/test.controller';
import { GetHealthUseCase } from '../../application/use-cases/GetHealthUseCase';
import { TestDatabaseUseCase } from '../../application/use-cases/TestDatabaseUseCase';
import { PostgresDatabaseRepository } from '../../infrastructure/repositories/PostgresDatabaseRepository';

const router = Router();

// Dependencies
const databaseRepository = new PostgresDatabaseRepository();
const getHealthUseCase = new GetHealthUseCase();
const testDatabaseUseCase = new TestDatabaseUseCase(databaseRepository);

// Controllers
const healthController = new HealthController(getHealthUseCase);
const testController = new TestController(testDatabaseUseCase);

// Routes
router.get('/health', (req, res) => healthController.getHealth(req, res));
router.get('/api/test-db', (req, res) => testController.testDatabase(req, res));

export default router;
