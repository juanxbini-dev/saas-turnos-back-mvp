import { Router } from 'express';
import { EmpresaPublicController } from '../controllers/public/empresaPublic.controller';
import { ProfesionalPublicController } from '../controllers/public/profesionalPublic.controller';
import { ClientePublicController } from '../controllers/public/clientePublic.controller';
import { TurnoPublicController } from '../controllers/public/turnoPublic.controller';
import { LandingPublicController } from '../controllers/public/landingPublic.controller';

const router = Router();
const empresaController = new EmpresaPublicController();
const profesionalController = new ProfesionalPublicController();
const clienteController = new ClientePublicController();
const turnoController = new TurnoPublicController();
const landingController = new LandingPublicController();

// Rutas públicas (sin autenticación)
router.get('/empresas/:slug', empresaController.getEmpresa);
router.get('/empresas/:slug/profesionales', profesionalController.getProfesionales);
router.get('/profesionales/:profesionalId/servicios', profesionalController.getServicios);
router.post('/clientes/validate', clienteController.validateCliente);
router.post('/turnos', turnoController.createTurno);

// Landing pública con configuracion dinámica
router.get('/landing/:empresaSlug', landingController.getLanding);

export default router;
