/**
 * Tests unitarios de GetDisponibilidadMesUseCase.
 *
 * Foco del cambio reciente:
 *   - El segundo llamado al servicio (calcularSlotsDisponibles, usado para
 *     filtrar los días sin slots libres) ahora recibe `vacaciones`.
 *   - El primer llamado (calcularDiasDisponiblesMes) sigue recibiendo vacaciones
 *     como antes (era el único que las consideraba).
 *
 * Estrategia: spy en AMBOS métodos del DisponibilidadService.
 */

import { GetDisponibilidadMesUseCase } from '../../../application/use-cases/turnos/GetDisponibilidadMesUseCase';
import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IUsuarioServicioRepository } from '../../../domain/repositories/IUsuarioServicioRepository';
import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';
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
    findByFechaYProfesional: jest.fn(),
    findByProfesionalEnRango: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    updateEstado: jest.fn(),
    finalizar: jest.fn(),
    marcarConfirmacionWhatsappEnviada: jest.fn(),
    findConfirmadosDelDiaSinRecordatorio: jest.fn(),
    marcarRecordatorioEnviado: jest.fn(),
    completarVencidos: jest.fn(),
    findByClienteAndProfesional: jest.fn(),
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

  const bloqueoSlotRepo: jest.Mocked<IBloqueoSlotRepository> = {
    findByProfesionalAndFecha: jest.fn(),
    findByProfesionalAndRango: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const disponibilidadService = new DisponibilidadService();
  // Por defecto: sin días disponibles
  const calcularDiasSpy = jest
    .spyOn(disponibilidadService, 'calcularDiasDisponiblesMes')
    .mockReturnValue([]);
  const calcularSlotsSpy = jest
    .spyOn(disponibilidadService, 'calcularSlotsDisponibles')
    .mockReturnValue([]);

  return {
    disponibilidadRepo,
    turnoRepo,
    usuarioServicioRepo,
    bloqueoSlotRepo,
    disponibilidadService,
    calcularDiasSpy,
    calcularSlotsSpy,
  };
}

function buildUseCase(mocks: ReturnType<typeof buildMocks>) {
  return new GetDisponibilidadMesUseCase(
    mocks.disponibilidadRepo,
    mocks.disponibilidadService,
    mocks.turnoRepo,
    mocks.usuarioServicioRepo,
    mocks.bloqueoSlotRepo
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

describe('GetDisponibilidadMesUseCase', () => {

  describe('integración con vacaciones', () => {
    it('pasa las vacaciones al calcularSlotsDisponibles del filtro final (7mo arg)', async () => {
      const mocks = buildMocks();
      const vacaciones = [buildVacacion()];
      mocks.disponibilidadRepo.findVacacionesByProfesional.mockResolvedValue(vacaciones);

      // calcularDiasDisponiblesMes devuelve 2 días → calcularSlotsDisponibles
      // se llama 2 veces (una por día) para filtrar los que tienen 0 slots
      mocks.calcularDiasSpy.mockReturnValue(['2026-06-15', '2026-06-16']);
      mocks.calcularSlotsSpy.mockReturnValue(['09:00']); // al menos un slot para pasar el filtro

      await buildUseCase(mocks).execute('prof-001', 6, 2026);

      const slotsSpy = mocks.calcularSlotsSpy;
      expect(slotsSpy).toHaveBeenCalledTimes(2);

      // El 7mo argumento (índice 6) es vacaciones
      for (const call of slotsSpy.mock.calls) {
        expect(call[6]).toBe(vacaciones);
      }
    });

    it('también pasa vacaciones al calcularDiasDisponiblesMes (no se rompe el comportamiento previo)', async () => {
      const mocks = buildMocks();
      const vacaciones = [buildVacacion()];
      mocks.disponibilidadRepo.findVacacionesByProfesional.mockResolvedValue(vacaciones);

      await buildUseCase(mocks).execute('prof-001', 6, 2026);

      const diasSpy = mocks.calcularDiasSpy;
      expect(diasSpy).toHaveBeenCalledTimes(1);
      // calcularDiasDisponiblesMes(disp, vacaciones, exc, mes, año)
      expect(diasSpy.mock.calls[0][1]).toBe(vacaciones);
    });
  });

  describe('filtro de días sin slots', () => {
    it('un día que sale de calcularDiasDisponiblesMes pero con 0 slots NO se incluye', async () => {
      const mocks = buildMocks();
      mocks.calcularDiasSpy.mockReturnValue(['2026-06-15', '2026-06-16', '2026-06-17']);

      // Solo el segundo día tiene slots libres
      mocks.calcularSlotsSpy
        .mockReturnValueOnce([])           // 2026-06-15 → bloqueado
        .mockReturnValueOnce(['09:00'])    // 2026-06-16 → libre
        .mockReturnValueOnce([]);          // 2026-06-17 → bloqueado

      const resultado = await buildUseCase(mocks).execute('prof-001', 6, 2026);

      expect(resultado).toEqual(['2026-06-16']);
    });
  });

  describe('resolución de duración del servicio', () => {
    it('sin servicioId → duracionMinutos = 0', async () => {
      const mocks = buildMocks();
      mocks.calcularDiasSpy.mockReturnValue(['2026-06-15']);
      mocks.calcularSlotsSpy.mockReturnValue(['09:00']);

      await buildUseCase(mocks).execute('prof-001', 6, 2026);

      expect(mocks.usuarioServicioRepo.findByUsuarioAndServicio).not.toHaveBeenCalled();

      // calcularSlotsDisponibles(disp, exc, turnos, fecha, bloqueos, dur, vac)
      expect(mocks.calcularSlotsSpy.mock.calls[0][5]).toBe(0);
    });

    it('con servicioId que devuelve duracion_personalizada=90 → pasa 90', async () => {
      const mocks = buildMocks();
      mocks.usuarioServicioRepo.findByUsuarioAndServicio.mockResolvedValue(
        buildUsuarioServicio({ duracion_personalizada: 90 })
      );
      mocks.calcularDiasSpy.mockReturnValue(['2026-06-15']);
      mocks.calcularSlotsSpy.mockReturnValue(['09:00']);

      await buildUseCase(mocks).execute('prof-001', 6, 2026, 'srv-001');

      expect(mocks.calcularSlotsSpy.mock.calls[0][5]).toBe(90);
    });
  });
});
