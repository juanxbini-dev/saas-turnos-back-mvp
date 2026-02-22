import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { MailDeliveryController } from '../controllers/mailDelivery.controller';
import { UpdateTurnoEstadoUseCase } from '../../application/use-cases/turnos/UpdateTurnoEstadoUseCase';
import { PostgresTurnoRepository } from '../../infrastructure/repositories/PostgresTurnoRepository';

const router = Router();

// Dependencies
const turnoRepository = new PostgresTurnoRepository();
const updateTurnoEstadoUseCase = new UpdateTurnoEstadoUseCase(turnoRepository);

// Controller
const mailDeliveryController = new MailDeliveryController(updateTurnoEstadoUseCase);

// Routes
// Ruta temporal para debugging sin autenticación
router.post('/debug/confirmar-turno/:turnoId', mailDeliveryController.confirmarTurno.bind(mailDeliveryController));

// Ruta protegida
router.use(authenticate);
router.post('/confirmar-turno/:turnoId', mailDeliveryController.confirmarTurno.bind(mailDeliveryController));

export default router;
