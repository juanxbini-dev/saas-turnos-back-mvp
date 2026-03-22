import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { PostgresBloqueoSlotRepository } from '../../infrastructure/repositories/PostgresBloqueoSlotRepository';
import { CryptoService } from '../../infrastructure/security/crypto.service';
import { CreateBloqueoSlotUseCase } from '../../application/use-cases/bloqueo-slot/CreateBloqueoSlotUseCase';
import { DeleteBloqueoSlotUseCase } from '../../application/use-cases/bloqueo-slot/DeleteBloqueoSlotUseCase';
import { GetBloqueosSlotUseCase } from '../../application/use-cases/bloqueo-slot/GetBloqueosSlotUseCase';
import { BloqueoSlotController } from '../controllers/bloqueo-slot.controller';

const router = Router();

// Dependencies
const bloqueoSlotRepository = new PostgresBloqueoSlotRepository();
const cryptoService = new CryptoService();

// Use cases
const createBloqueoSlotUseCase = new CreateBloqueoSlotUseCase(bloqueoSlotRepository, cryptoService);
const deleteBloqueoSlotUseCase = new DeleteBloqueoSlotUseCase(bloqueoSlotRepository);
const getBloqueosSlotUseCase = new GetBloqueosSlotUseCase(bloqueoSlotRepository);

// Controller
const bloqueoSlotController = new BloqueoSlotController(
  createBloqueoSlotUseCase,
  deleteBloqueoSlotUseCase,
  getBloqueosSlotUseCase
);

router.use(authenticate);

router.get('/', (req, res) => bloqueoSlotController.getByRango(req, res));
router.post('/', (req, res) => bloqueoSlotController.create(req, res));
router.delete('/:id', (req, res) => bloqueoSlotController.remove(req, res));

export default router;
