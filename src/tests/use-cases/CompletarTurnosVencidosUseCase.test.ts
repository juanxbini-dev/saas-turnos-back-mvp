/**
 * Tests unitarios de CompletarTurnosVencidosUseCase.
 *
 * Este use case es deliberadamente simple: delega todo en
 * turnoRepository.completarVencidos() y devuelve el count.
 *
 * Riesgo documentado: el SQL que ejecuta el repositorio Postgres hace:
 *   UPDATE turnos SET estado = 'completado'
 *   WHERE estado = 'confirmado' AND (fecha + hora + 45min) < NOW()
 *
 * No crea comisiones_turno ni establece finalizado_at.
 * Los turnos que completa el cron quedan INVISIBLES en finanzas.
 */

import { CompletarTurnosVencidosUseCase } from '../../application/use-cases/turnos/CompletarTurnosVencidosUseCase';
import { ITurnoRepository }              from '../../domain/repositories/ITurnoRepository';

// ── Factory de mock ───────────────────────────────────────────────────────────

function buildTurnoRepoMock(): jest.Mocked<ITurnoRepository> {
  return {
    findById:                            jest.fn(),
    findByEmpresa:                       jest.fn(),
    findByProfesional:                   jest.fn(),
    findByFechaYProfesional:             jest.fn(),
    findByProfesionalEnRango:            jest.fn(),
    create:                              jest.fn(),
    updateEstado:                        jest.fn(),
    finalizar:                           jest.fn(),
    marcarConfirmacionWhatsappEnviada:   jest.fn(),
    findConfirmadosDelDiaSinRecordatorio: jest.fn(),
    marcarRecordatorioEnviado:           jest.fn(),
    completarVencidos:                   jest.fn(),
    findByClienteAndProfesional:         jest.fn(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CompletarTurnosVencidosUseCase', () => {

  // ── Comportamiento básico ─────────────────────────────────────────────────

  describe('delegación a turnoRepository.completarVencidos', () => {
    it('llama completarVencidos exactamente una vez', async () => {
      const turnoRepo = buildTurnoRepoMock();
      turnoRepo.completarVencidos.mockResolvedValue(0);

      const useCase = new CompletarTurnosVencidosUseCase(turnoRepo);
      await useCase.execute();

      expect(turnoRepo.completarVencidos).toHaveBeenCalledTimes(1);
    });

    it('retorna el count cuando no hay turnos vencidos (count = 0)', async () => {
      const turnoRepo = buildTurnoRepoMock();
      turnoRepo.completarVencidos.mockResolvedValue(0);

      const count = await new CompletarTurnosVencidosUseCase(turnoRepo).execute();

      expect(count).toBe(0);
    });

    it('retorna el count correcto cuando hay 5 turnos vencidos', async () => {
      const turnoRepo = buildTurnoRepoMock();
      turnoRepo.completarVencidos.mockResolvedValue(5);

      const count = await new CompletarTurnosVencidosUseCase(turnoRepo).execute();

      expect(count).toBe(5);
    });

    it('retorna el count correcto para un solo turno vencido', async () => {
      const turnoRepo = buildTurnoRepoMock();
      turnoRepo.completarVencidos.mockResolvedValue(1);

      const count = await new CompletarTurnosVencidosUseCase(turnoRepo).execute();

      expect(count).toBe(1);
    });

    it('propaga el error si el repositorio lanza una excepción', async () => {
      const turnoRepo = buildTurnoRepoMock();
      turnoRepo.completarVencidos.mockRejectedValue(new Error('DB timeout'));

      await expect(new CompletarTurnosVencidosUseCase(turnoRepo).execute())
        .rejects.toThrow('DB timeout');
    });
  });

  // ── Ausencia de efectos secundarios financieros ───────────────────────────
  //
  // El cron solo usa turnoRepository. No debe llamar a ningún repo de finanzas.
  // Este es el origen del bug documentado en EditarPagoTurnoUseCase:
  // los turnos completados por cron no tienen comisión_turno.

  describe('NO crea comisiones ni toca venta_productos', () => {
    it('solo recibe ITurnoRepository — no hay deps de comisión ni productos', () => {
      // La firma del constructor solo acepta ITurnoRepository.
      // Si alguien agrega una dependencia de comisionRepository en el futuro,
      // la definición de tipo de TypeScript lo haría evidente.
      const turnoRepo = buildTurnoRepoMock();
      const useCase = new CompletarTurnosVencidosUseCase(turnoRepo);

      // El use case no expone referencias a repos de comisiones o productos.
      expect((useCase as any).comisionRepository).toBeUndefined();
      expect((useCase as any).ventaProductoRepository).toBeUndefined();
      expect((useCase as any).productoRepository).toBeUndefined();
    });

    it('DOCUMENTA: los turnos completados por el cron no tienen comisión_turno (invisibles en finanzas)', async () => {
      // Este test es una especificación del comportamiento actual que causa el bug.
      // No debe interpretarse como correcto — es el estado defectuoso.
      //
      // Flujo real:
      //   cron → completarVencidos() → estado='completado'
      //              ↓
      //        NO crea comisiones_turno
      //              ↓
      //        GetFinanzasUseCase INNER JOIN comisiones_turno → turno invisible
      //
      // Fix sugerido: después de completarVencidos(), crear comisiones con
      // servicio_monto = turno.precio, usando la comision_turno del profesional.
      const turnoRepo = buildTurnoRepoMock();
      turnoRepo.completarVencidos.mockResolvedValue(3);

      const count = await new CompletarTurnosVencidosUseCase(turnoRepo).execute();

      // 3 turnos se marcan como completados...
      expect(count).toBe(3);
      // ...pero ninguno tendrá fila en comisiones_turno.
      // Verificamos que no existe ningún mecanismo de creación de comisiones:
      expect(turnoRepo.completarVencidos).toHaveBeenCalledTimes(1);
      // Solo el método completarVencidos fue invocado en el repositorio.
      // Verificamos que ningún otro método del repo fue llamado.
      const repoMethods = turnoRepo as Record<string, jest.MockedFunction<any>>;
      const metodosLlamados = Object.keys(repoMethods).filter(
        (nombre) => nombre !== 'completarVencidos' && repoMethods[nombre].mock.calls.length > 0
      );
      expect(metodosLlamados).toHaveLength(0);
    });
  });
});
