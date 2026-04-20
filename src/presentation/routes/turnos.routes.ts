import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { TurnosController } from '../controllers/turnos.controller';
import { PostgresTurnoRepository } from '../../infrastructure/repositories/PostgresTurnoRepository';
import { PostgresDisponibilidadRepository } from '../../infrastructure/repositories/PostgresDisponibilidadRepository';
import { PostgresUsuarioServicioRepository } from '../../infrastructure/repositories/PostgresUsuarioServicioRepository';
import { DisponibilidadService } from '../../domain/services/DisponibilidadService';
import { CryptoService } from '../../infrastructure/security/crypto.service';
import { GetTurnosUseCase } from '../../application/use-cases/turnos/GetTurnosUseCase';
import { CreateTurnoUseCase } from '../../application/use-cases/turnos/CreateTurnoUseCase';
import { UpdateTurnoEstadoUseCase } from '../../application/use-cases/turnos/UpdateTurnoEstadoUseCase';
import { GetDisponibilidadMesUseCase } from '../../application/use-cases/turnos/GetDisponibilidadMesUseCase';
import { GetSlotsDisponiblesUseCase } from '../../application/use-cases/turnos/GetSlotsDisponiblesUseCase';
import { GetCalendarioUseCase } from '../../application/use-cases/turnos/GetCalendarioUseCase';
import { CreateDisponibilidadUseCase } from '../../application/use-cases/disponibilidad/CreateDisponibilidadUseCase';
import { UpdateDisponibilidadUseCase } from '../../application/use-cases/disponibilidad/UpdateDisponibilidadUseCase';
import { DeleteDisponibilidadUseCase } from '../../application/use-cases/disponibilidad/DeleteDisponibilidadUseCase';
import { CreateVacacionUseCase } from '../../application/use-cases/disponibilidad/CreateVacacionUseCase';
import { UpdateVacacionUseCase } from '../../application/use-cases/disponibilidad/UpdateVacacionUseCase';
import { DeleteVacacionUseCase } from '../../application/use-cases/disponibilidad/DeleteVacacionUseCase';
import { CreateExcepcionUseCase } from '../../application/use-cases/disponibilidad/CreateExcepcionUseCase';
import { UpdateExcepcionUseCase } from '../../application/use-cases/disponibilidad/UpdateExcepcionUseCase';
import { DeleteExcepcionUseCase } from '../../application/use-cases/disponibilidad/DeleteExcepcionUseCase';
import { GetSlotsRangoUseCase } from '../../application/use-cases/turnos/GetSlotsRangoUseCase';
import { PostgresBloqueoSlotRepository } from '../../infrastructure/repositories/PostgresBloqueoSlotRepository';

const router = Router();

// Dependencies
const turnoRepository = new PostgresTurnoRepository();
const disponibilidadRepository = new PostgresDisponibilidadRepository();
const usuarioServicioRepository = new PostgresUsuarioServicioRepository();
const bloqueoSlotRepository = new PostgresBloqueoSlotRepository();
const disponibilidadService = new DisponibilidadService();
const cryptoService = new CryptoService();

// Use cases
const getTurnosUseCase = new GetTurnosUseCase(turnoRepository);
const createTurnoUseCase = new CreateTurnoUseCase(
  turnoRepository,
  disponibilidadRepository,
  usuarioServicioRepository,
  disponibilidadService,
  cryptoService,
  bloqueoSlotRepository
);
const updateTurnoEstadoUseCase = new UpdateTurnoEstadoUseCase(turnoRepository);
const getDisponibilidadMesUseCase = new GetDisponibilidadMesUseCase(
  disponibilidadRepository,
  disponibilidadService,
  turnoRepository,
  usuarioServicioRepository,
  bloqueoSlotRepository
);
const getSlotsDisponiblesUseCase = new GetSlotsDisponiblesUseCase(
  disponibilidadRepository,
  turnoRepository,
  disponibilidadService,
  bloqueoSlotRepository,
  usuarioServicioRepository
);
const getCalendarioUseCase = new GetCalendarioUseCase(turnoRepository);
const createDisponibilidadUseCase = new CreateDisponibilidadUseCase(
  disponibilidadRepository,
  cryptoService
);
const updateDisponibilidadUseCase = new UpdateDisponibilidadUseCase(disponibilidadRepository);
const deleteDisponibilidadUseCase = new DeleteDisponibilidadUseCase(disponibilidadRepository);
const createVacacionUseCase = new CreateVacacionUseCase(
  disponibilidadRepository,
  cryptoService
);
const updateVacacionUseCase = new UpdateVacacionUseCase(disponibilidadRepository);
const deleteVacacionUseCase = new DeleteVacacionUseCase(disponibilidadRepository);
const createExcepcionUseCase = new CreateExcepcionUseCase(
  disponibilidadRepository,
  cryptoService
);
const updateExcepcionUseCase = new UpdateExcepcionUseCase(disponibilidadRepository);
const deleteExcepcionUseCase = new DeleteExcepcionUseCase(disponibilidadRepository);
const getSlotsRangoUseCase = new GetSlotsRangoUseCase(
  disponibilidadRepository,
  turnoRepository,
  disponibilidadService,
  bloqueoSlotRepository,
  usuarioServicioRepository
);

// Controller
const turnosController = new TurnosController(
  getTurnosUseCase,
  createTurnoUseCase,
  updateTurnoEstadoUseCase,
  getDisponibilidadMesUseCase,
  getSlotsDisponiblesUseCase,
  getCalendarioUseCase,
  createDisponibilidadUseCase,
  updateDisponibilidadUseCase,
  deleteDisponibilidadUseCase,
  createVacacionUseCase,
  updateVacacionUseCase,
  deleteVacacionUseCase,
  createExcepcionUseCase,
  updateExcepcionUseCase,
  deleteExcepcionUseCase,
  getSlotsRangoUseCase,
  disponibilidadRepository
);

// Routes

// Rutas públicas de disponibilidad (sin autenticación — usadas desde la landing)
router.get('/disponibilidad/:profesionalId/mes', turnosController.getDisponibilidadMes.bind(turnosController));
router.get('/disponibilidad/:profesionalId/slots', turnosController.getSlotsDisponibles.bind(turnosController));
router.get('/disponibilidad/:profesionalId/slots-rango', turnosController.getSlotsRango.bind(turnosController));

router.use(authenticate);

// Turnos
router.get('/', turnosController.getTurnos.bind(turnosController));
router.post('/', turnosController.createTurno.bind(turnosController));
router.put('/:id/estado', turnosController.updateEstado.bind(turnosController));
router.put('/:id/finalizar', turnosController.finalizarTurno.bind(turnosController));
router.put('/:id/editar-pago', turnosController.editarPago.bind(turnosController));
router.get('/calendario', turnosController.getCalendario.bind(turnosController));
router.get('/configuracion', turnosController.getConfiguracion.bind(turnosController));

// CRUD Disponibilidad
router.post('/disponibilidad', turnosController.createDisponibilidad.bind(turnosController));
router.put('/disponibilidad/:id', turnosController.updateDisponibilidad.bind(turnosController));
router.delete('/disponibilidad/:id', turnosController.deleteDisponibilidad.bind(turnosController));

// CRUD Vacaciones
router.post('/vacaciones', turnosController.createVacacion.bind(turnosController));
router.put('/vacaciones/:id', turnosController.updateVacacion.bind(turnosController));
router.delete('/vacaciones/:id', turnosController.deleteVacacion.bind(turnosController));

// CRUD Excepciones
router.post('/excepciones', turnosController.createExcepcion.bind(turnosController));
router.put('/excepciones/:id', turnosController.updateExcepcion.bind(turnosController));
router.delete('/excepciones/:id', turnosController.deleteExcepcion.bind(turnosController));

export default router;
