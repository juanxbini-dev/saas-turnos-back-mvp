/**
 * Tests unitarios de GetSlotsRangoUseCase (alimenta el dashboard).
 *
 * Foco:
 *   - findVacacionesByProfesional se llama UNA SOLA VEZ (no por día — performance)
 *   - Las vacaciones se propagan a cada invocación de calcularSlotsDisponibles
 *   - Los bloqueos se filtran por día antes de pasarlos al servicio
 *   - Validación de fechas (formato + orden)
 *   - La validación de rango > 30 días NO está acá (vive en el controller)
 */

import { GetSlotsRangoUseCase } from '../../../application/use-cases/turnos/GetSlotsRangoUseCase';
import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';
import { IUsuarioServicioRepository } from '../../../domain/repositories/IUsuarioServicioRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';
import { DiasVacacion } from '../../../domain/entities/Disponibilidad';
import { BloqueoSlot } from '../../../domain/entities/BloqueoSlot';

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
  return new GetSlotsRangoUseCase(
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

function buildBloqueo(overrides: Partial<BloqueoSlot> = {}): BloqueoSlot {
  return {
    id: 'blq-001',
    empresa_id: 'empresa-001',
    profesional_id: 'prof-001',
    fecha: '2026-06-15',
    hora_inicio: '10:00',
    hora_fin: '11:00',
    motivo: null,
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GetSlotsRangoUseCase', () => {

  describe('integración con findVacacionesByProfesional', () => {
    it('llama a findVacacionesByProfesional UNA SOLA VEZ (no por día)', async () => {
      const mocks = buildMocks();
      // Rango de 3 días
      await buildUseCase(mocks).execute('prof-001', '2026-06-15', '2026-06-17');

      expect(mocks.disponibilidadRepo.findVacacionesByProfesional)
        .toHaveBeenCalledTimes(1);
      expect(mocks.disponibilidadRepo.findVacacionesByProfesional)
        .toHaveBeenCalledWith('prof-001');
    });

    it('pasa las vacaciones a CADA invocación de calcularSlotsDisponibles', async () => {
      const mocks = buildMocks();
      const vacaciones = [buildVacacion()];
      mocks.disponibilidadRepo.findVacacionesByProfesional.mockResolvedValue(vacaciones);

      await buildUseCase(mocks).execute('prof-001', '2026-06-15', '2026-06-17');

      const spy = mocks.calcularSlotsSpy;
      expect(spy).toHaveBeenCalledTimes(3); // 3 días
      for (const call of spy.mock.calls) {
        // Argumento 6 = vacaciones
        expect(call[6]).toBe(vacaciones);
      }
    });
  });

  describe('iteración por rango', () => {
    it('rango de 3 días genera 3 llamadas al servicio, una por fecha', async () => {
      const mocks = buildMocks();
      await buildUseCase(mocks).execute('prof-001', '2026-06-15', '2026-06-17');

      const spy = mocks.calcularSlotsSpy;
      expect(spy).toHaveBeenCalledTimes(3);

      // El orden puede variar por Promise.all; comparamos como sets
      const fechas = spy.mock.calls.map(c => c[3]).sort();
      expect(fechas).toEqual(['2026-06-15', '2026-06-16', '2026-06-17']);
    });

    it('filtra bloqueos por día (cada llamada recibe solo los bloqueos de ese día)', async () => {
      const mocks = buildMocks();
      const bloqueoDia1 = buildBloqueo({ id: 'b1', fecha: '2026-06-15' });
      const bloqueoDia2 = buildBloqueo({ id: 'b2', fecha: '2026-06-16' });
      const bloqueoDia3 = buildBloqueo({ id: 'b3', fecha: '2026-06-17' });

      mocks.bloqueoSlotRepo.findByProfesionalAndRango.mockResolvedValue([
        bloqueoDia1, bloqueoDia2, bloqueoDia3,
      ]);

      await buildUseCase(mocks).execute('prof-001', '2026-06-15', '2026-06-17');

      const spy = mocks.calcularSlotsSpy;
      // calcularSlotsDisponibles(disp, exc, turnos, fecha, bloqueos, dur, vac)
      // El orden de las llamadas dentro de Promise.all puede variar, así que
      // matcheamos por la fecha (arg 3) en lugar de asumir un orden fijo.
      const callByFecha = new Map(
        spy.mock.calls.map(c => [c[3] as string, c[4] as unknown])
      );
      expect(callByFecha.get('2026-06-15')).toEqual([bloqueoDia1]);
      expect(callByFecha.get('2026-06-16')).toEqual([bloqueoDia2]);
      expect(callByFecha.get('2026-06-17')).toEqual([bloqueoDia3]);
    });
  });

  describe('validación de fechas', () => {
    it('si fechaInicio > fechaFin → throw', async () => {
      const mocks = buildMocks();
      await expect(
        buildUseCase(mocks).execute('prof-001', '2026-06-17', '2026-06-15')
      ).rejects.toThrow('La fecha de inicio no puede ser posterior a la fecha de fin');
    });

    it('NO valida rangos mayores a 30 días (esa validación vive en el controller)', async () => {
      const mocks = buildMocks();
      // Rango de 60 días: debe ejecutarse sin throw y producir 60 llamadas al servicio
      const resultado = await buildUseCase(mocks)
        .execute('prof-001', '2026-06-01', '2026-07-30');

      // 30 días junio + 30 días julio = 60 días
      expect(resultado).toHaveLength(60);
      expect(mocks.calcularSlotsSpy).toHaveBeenCalledTimes(60);
    });
  });

  describe('retorno', () => {
    it('cada item del resultado tiene fecha y slots', async () => {
      const mocks = buildMocks();
      mocks.calcularSlotsSpy.mockReturnValue(['09:00', '09:30']);

      const resultado = await buildUseCase(mocks)
        .execute('prof-001', '2026-06-15', '2026-06-16');

      expect(resultado).toEqual([
        { fecha: '2026-06-15', slots: ['09:00', '09:30'] },
        { fecha: '2026-06-16', slots: ['09:00', '09:30'] },
      ]);
    });
  });
});
