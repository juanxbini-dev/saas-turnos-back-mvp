/**
 * Tests unitarios de GetSlotsDisponiblesUseCase.
 *
 * Mockeamos todos los repos + el DisponibilidadService.
 * El foco del use case es:
 *   1. Cargar disponibilidad, excepciones, vacaciones, turnos y bloqueos en paralelo
 *   2. Resolver la duración del servicio (personalizada > minutos)
 *   3. Delegar el cálculo al DisponibilidadService PASÁNDOLE las vacaciones
 */

import { GetSlotsDisponiblesUseCase } from '../../../application/use-cases/turnos/GetSlotsDisponiblesUseCase';
import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';
import { IUsuarioServicioRepository } from '../../../domain/repositories/IUsuarioServicioRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';
import { DiasVacacion } from '../../../domain/entities/Disponibilidad';
import { UsuarioServicio } from '../../../domain/entities/Servicio';

// ── Factory de mocks ─────────────────────────────────────────────────────────

function buildMocks() {
  const disponibilidadRepo: jest.Mocked<IDisponibilidadRepository> = {
    findDisponibilidadByProfesional: jest.fn().mockResolvedValue([]),
    createDisponibilidad: jest.fn(),
    updateDisponibilidad: jest.fn(),
    deleteDisponibilidad: jest.fn(),
    findVacacionesByProfesional: jest.fn().mockResolvedValue([]),
    createVacacion: jest.fn(),
    updateVacacion: jest.fn(),
    deleteVacacion: jest.fn(),
    findExcepcionesByProfesional: jest.fn().mockResolvedValue([]),
    createExcepcion: jest.fn(),
    updateExcepcion: jest.fn(),
    deleteExcepcion: jest.fn(),
  };

  const turnoRepo: jest.Mocked<ITurnoRepository> = {
    findById: jest.fn(),
    findByEmpresa: jest.fn(),
    findByProfesional: jest.fn(),
    findByFechaYProfesional: jest.fn().mockResolvedValue([]),
    findByProfesionalEnRango: jest.fn(),
    create: jest.fn(),
    updateEstado: jest.fn(),
    finalizar: jest.fn(),
    marcarConfirmacionWhatsappEnviada: jest.fn(),
    findConfirmadosDelDiaSinRecordatorio: jest.fn(),
    marcarRecordatorioEnviado: jest.fn(),
    completarVencidos: jest.fn(),
    findByClienteAndProfesional: jest.fn(),
  };

  const bloqueoSlotRepo: jest.Mocked<IBloqueoSlotRepository> = {
    findByProfesionalAndFecha: jest.fn().mockResolvedValue([]),
    findByProfesionalAndRango: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const usuarioServicioRepo: jest.Mocked<IUsuarioServicioRepository> = {
    findByUsuario: jest.fn(),
    findByServicio: jest.fn(),
    findByUsuarioAndServicio: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    estaSubscripto: jest.fn(),
  };

  const disponibilidadService = new DisponibilidadService();
  // Spy en el método que esperamos que el use case llame
  const calcularSlotsSpy = jest
    .spyOn(disponibilidadService, 'calcularSlotsDisponibles')
    .mockReturnValue([]);

  return {
    disponibilidadRepo,
    turnoRepo,
    bloqueoSlotRepo,
    usuarioServicioRepo,
    disponibilidadService,
    calcularSlotsSpy,
  };
}

function buildUseCase(mocks: ReturnType<typeof buildMocks>) {
  return new GetSlotsDisponiblesUseCase(
    mocks.disponibilidadRepo,
    mocks.turnoRepo,
    mocks.disponibilidadService,
    mocks.bloqueoSlotRepo,
    mocks.usuarioServicioRepo
  );
}

function buildVacacion(overrides: Partial<DiasVacacion> = {}): DiasVacacion {
  return {
    id: 'vac-001',
    profesional_id: 'prof-001',
    fecha: '2026-06-15',
    fecha_fin: null,
    tipo: 'vacacion',
    motivo: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildUsuarioServicio(
  overrides: Partial<UsuarioServicio> = {}
): UsuarioServicio {
  return {
    id: 'us-001',
    usuario_id: 'prof-001',
    servicio_id: 'srv-001',
    empresa_id: 'empresa-001',
    precio_personalizado: null,
    duracion_personalizada: null,
    habilitado: true,
    nivel_habilidad: null,
    notas: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    nombre: 'Corte',
    descripcion: null,
    precio: 1000,
    duracion_minutos: 30,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GetSlotsDisponiblesUseCase', () => {

  describe('integración con findVacacionesByProfesional', () => {
    it('llama a findVacacionesByProfesional con el profesionalId correcto', async () => {
      const mocks = buildMocks();
      await buildUseCase(mocks).execute('prof-001', '2026-06-15');

      expect(mocks.disponibilidadRepo.findVacacionesByProfesional)
        .toHaveBeenCalledWith('prof-001');
      expect(mocks.disponibilidadRepo.findVacacionesByProfesional)
        .toHaveBeenCalledTimes(1);
    });

    it('pasa las vacaciones retornadas como 7mo argumento de calcularSlotsDisponibles', async () => {
      const mocks = buildMocks();
      const vacaciones = [buildVacacion()];
      mocks.disponibilidadRepo.findVacacionesByProfesional.mockResolvedValue(vacaciones);

      await buildUseCase(mocks).execute('prof-001', '2026-06-15');

      const spy = mocks.calcularSlotsSpy;
      expect(spy).toHaveBeenCalledTimes(1);
      // calcularSlotsDisponibles(disp, exc, turnos, fecha, bloqueos, duracion, vacaciones)
      // indexes:                  0     1    2       3      4         5         6
      const args = spy.mock.calls[0];
      expect(args[6]).toBe(vacaciones);
    });
  });

  describe('resolución de duración del servicio', () => {
    it('sin servicioId → duracionMinutos = 0', async () => {
      const mocks = buildMocks();
      await buildUseCase(mocks).execute('prof-001', '2026-06-15');

      // No debe consultar el servicio
      expect(mocks.usuarioServicioRepo.findByUsuarioAndServicio).not.toHaveBeenCalled();

      const spy = mocks.calcularSlotsSpy;
      expect(spy.mock.calls[0][5]).toBe(0);
    });

    it('con servicioId que devuelve duracion_personalizada=90 → pasa 90', async () => {
      const mocks = buildMocks();
      mocks.usuarioServicioRepo.findByUsuarioAndServicio.mockResolvedValue(
        buildUsuarioServicio({ duracion_personalizada: 90, duracion_minutos: 30 })
      );

      await buildUseCase(mocks).execute('prof-001', '2026-06-15', 'srv-001');

      expect(mocks.usuarioServicioRepo.findByUsuarioAndServicio)
        .toHaveBeenCalledWith('prof-001', 'srv-001');

      const spy = mocks.calcularSlotsSpy;
      expect(spy.mock.calls[0][5]).toBe(90);
    });

    it('con servicioId que devuelve duracion_minutos=60 (sin personalizada) → pasa 60', async () => {
      const mocks = buildMocks();
      mocks.usuarioServicioRepo.findByUsuarioAndServicio.mockResolvedValue(
        buildUsuarioServicio({ duracion_personalizada: null, duracion_minutos: 60 })
      );

      await buildUseCase(mocks).execute('prof-001', '2026-06-15', 'srv-001');

      const spy = mocks.calcularSlotsSpy;
      expect(spy.mock.calls[0][5]).toBe(60);
    });
  });

  describe('retorno', () => {
    it('devuelve exactamente los slots que retornó el servicio', async () => {
      const mocks = buildMocks();
      const slotsEsperados = ['09:00', '09:30', '10:00'];
      mocks.calcularSlotsSpy.mockReturnValue(slotsEsperados);

      const resultado = await buildUseCase(mocks).execute('prof-001', '2026-06-15');

      expect(resultado).toBe(slotsEsperados);
    });
  });
});
