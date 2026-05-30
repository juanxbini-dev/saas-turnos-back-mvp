/**
 * Tests de CreateDisponibilidadUseCase.
 *
 * Foco principal: la validación de solapamiento de rangos que habilita los
 * horarios cortados (ej. Lun-Vie 09:00-13:00 y Lun-Vie 17:00-20:00) pero
 * rechaza rangos que se cruzan. También cubre las validaciones de intervalo,
 * orden de horas/días, y el caso de horas con segundos ("13:00:00") que vienen
 * de la columna TIME de Postgres.
 */

import { CreateDisponibilidadUseCase } from '../../../application/use-cases/disponibilidad/CreateDisponibilidadUseCase';
import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { DisponibilidadSemanal } from '../../../domain/entities/Disponibilidad';

function buildDisp(overrides: Partial<DisponibilidadSemanal> = {}): DisponibilidadSemanal {
  return {
    id: 'disp-existente',
    profesional_id: 'prof-001',
    dia_inicio: 1,
    dia_fin: 5,
    hora_inicio: '09:00:00', // como lo devuelve Postgres (TIME)
    hora_fin: '13:00:00',
    intervalo_minutos: 60,
    activo: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildMocks(existentes: DisponibilidadSemanal[] = []) {
  const disponibilidadRepo: jest.Mocked<Pick<IDisponibilidadRepository,
    'findDisponibilidadByProfesional' | 'createDisponibilidad'>> = {
    findDisponibilidadByProfesional: jest.fn().mockResolvedValue(existentes),
    createDisponibilidad: jest.fn().mockImplementation((data) => Promise.resolve({
      ...data,
      activo: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })),
  };
  const cryptoService = { generateUUID: jest.fn().mockReturnValue('nuevo-uuid') };
  const useCase = new CreateDisponibilidadUseCase(
    disponibilidadRepo as unknown as IDisponibilidadRepository,
    cryptoService as any
  );
  return { useCase, disponibilidadRepo, cryptoService };
}

// Firma: (profesionalId, diaInicio, diaFin, horaInicio, horaFin, intervaloMinutos, empresaId, usuarioAutenticadoId)
const PROF = 'prof-001';

describe('CreateDisponibilidadUseCase — validación de solapamiento', () => {
  it('permite un segundo rango en otro horario el mismo día (horario cortado)', async () => {
    const { useCase, disponibilidadRepo } = buildMocks([buildDisp()]); // existe 09:00-13:00
    // Nuevo: Lun-Vie 17:00-20:00
    await useCase.execute(PROF, 1, 5, '17:00', '20:00', 60, 'empresa-001', PROF);
    expect(disponibilidadRepo.createDisponibilidad).toHaveBeenCalledTimes(1);
  });

  it('rechaza un rango que se cruza con uno existente (mismos días)', async () => {
    const { useCase, disponibilidadRepo } = buildMocks([buildDisp()]); // 09:00-13:00
    // Nuevo: 12:00-15:00 cruza con 09:00-13:00
    await expect(
      useCase.execute(PROF, 1, 5, '12:00', '15:00', 60, 'empresa-001', PROF)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(disponibilidadRepo.createDisponibilidad).not.toHaveBeenCalled();
  });

  it('permite rangos adyacentes (fin de uno == inicio del otro)', async () => {
    const { useCase, disponibilidadRepo } = buildMocks([buildDisp()]); // 09:00-13:00 (DB: "13:00:00")
    // Nuevo: 13:00-17:00 — adyacente, NO solapa
    await useCase.execute(PROF, 1, 5, '13:00', '17:00', 60, 'empresa-001', PROF);
    expect(disponibilidadRepo.createDisponibilidad).toHaveBeenCalledTimes(1);
  });

  it('permite mismo horario en días que no se solapan', async () => {
    const { useCase, disponibilidadRepo } = buildMocks([buildDisp({ dia_inicio: 1, dia_fin: 5 })]);
    // Nuevo: sábado (6) mismo horario — no comparte días
    await useCase.execute(PROF, 6, 6, '09:00', '13:00', 60, 'empresa-001', PROF);
    expect(disponibilidadRepo.createDisponibilidad).toHaveBeenCalledTimes(1);
  });

  it('una disponibilidad inactiva no bloquea la creación de un rango que la pisaría', async () => {
    const { useCase, disponibilidadRepo } = buildMocks([buildDisp({ activo: false })]);
    await useCase.execute(PROF, 1, 5, '09:00', '13:00', 60, 'empresa-001', PROF);
    expect(disponibilidadRepo.createDisponibilidad).toHaveBeenCalledTimes(1);
  });
});

describe('CreateDisponibilidadUseCase — validaciones básicas', () => {
  it('rechaza intervalo que no es múltiplo de 60', async () => {
    const { useCase } = buildMocks();
    await expect(
      useCase.execute(PROF, 1, 5, '09:00', '13:00', 30, 'empresa-001', PROF)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rechaza hora_fin <= hora_inicio', async () => {
    const { useCase } = buildMocks();
    await expect(
      useCase.execute(PROF, 1, 5, '13:00', '09:00', 60, 'empresa-001', PROF)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rechaza dia_fin < dia_inicio', async () => {
    const { useCase } = buildMocks();
    await expect(
      useCase.execute(PROF, 5, 1, '09:00', '13:00', 60, 'empresa-001', PROF)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rechaza crear disponibilidad para otro profesional', async () => {
    const { useCase } = buildMocks();
    await expect(
      useCase.execute(PROF, 1, 5, '09:00', '13:00', 60, 'empresa-001', 'otro-usuario')
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
