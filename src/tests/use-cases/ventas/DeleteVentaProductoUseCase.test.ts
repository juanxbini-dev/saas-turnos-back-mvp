/**
 * Tests unitarios de DeleteVentaProductoUseCase.
 *
 * Verifica que:
 *   - deleteById se llama con el id y empresaId correctos
 *   - empresaId siempre se pasa (multi-tenancy: no puede borrar de otra empresa)
 *   - No lanza error si la venta no existe (el repo hace DELETE silencioso)
 */

import { DeleteVentaProductoUseCase } from '../../../application/use-cases/ventas/DeleteVentaProductoUseCase';
import { IVentaProductoRepository } from '../../../domain/repositories/IVentaProductoRepository';

// ── Factory de mocks ──────────────────────────────────────────────────────────

function makeMocks() {
  const ventaProductoRepo: jest.Mocked<IVentaProductoRepository> = {
    create:           jest.fn(),
    findByTurno:      jest.fn(),
    deleteByTurno:    jest.fn(),
    findByVendedor:   jest.fn(),
    findAllPaginated: jest.fn(),
    updateById:       jest.fn(),
    deleteById:       jest.fn(),
    getResumen:       jest.fn(),
  };

  return { ventaProductoRepo };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeleteVentaProductoUseCase', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── LLAMADA CORRECTA AL REPO ──────────────────────────────────────────────

  describe('llamada al repo', () => {

    it('llama deleteById exactamente una vez con el id y empresaId correctos', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new DeleteVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.deleteById.mockResolvedValue(undefined);

      await useCase.execute('venta-001', 'empresa-001');

      expect(ventaProductoRepo.deleteById).toHaveBeenCalledTimes(1);
      expect(ventaProductoRepo.deleteById).toHaveBeenCalledWith('venta-001', 'empresa-001');
    });

    it('no llama ningún otro método del repo', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new DeleteVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.deleteById.mockResolvedValue(undefined);

      await useCase.execute('venta-001', 'empresa-001');

      expect(ventaProductoRepo.create).not.toHaveBeenCalled();
      expect(ventaProductoRepo.updateById).not.toHaveBeenCalled();
      expect(ventaProductoRepo.findAllPaginated).not.toHaveBeenCalled();
      expect(ventaProductoRepo.findByTurno).not.toHaveBeenCalled();
      expect(ventaProductoRepo.deleteByTurno).not.toHaveBeenCalled();
    });

  });

  // ── MULTI-TENANCY ─────────────────────────────────────────────────────────

  describe('multi-tenancy', () => {

    it('empresaId se pasa siempre — no puede borrar ventas de otra empresa', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new DeleteVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.deleteById.mockResolvedValue(undefined);

      await useCase.execute('venta-ajena', 'empresa-RESTRINGIDA');

      const [idPasado, empresaIdPasado] = ventaProductoRepo.deleteById.mock.calls[0];
      expect(idPasado).toBe('venta-ajena');
      expect(empresaIdPasado).toBe('empresa-RESTRINGIDA');
    });

    it('distintas empresas generan llamadas con su propio empresaId', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new DeleteVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.deleteById.mockResolvedValue(undefined);

      await useCase.execute('venta-A', 'empresa-AAA');
      await useCase.execute('venta-B', 'empresa-BBB');

      expect(ventaProductoRepo.deleteById).toHaveBeenNthCalledWith(1, 'venta-A', 'empresa-AAA');
      expect(ventaProductoRepo.deleteById).toHaveBeenNthCalledWith(2, 'venta-B', 'empresa-BBB');
    });

  });

  // ── COMPORTAMIENTO CUANDO NO EXISTE ───────────────────────────────────────

  describe('venta inexistente', () => {

    it('no lanza error si la venta no existe (DELETE silencioso del repo)', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new DeleteVentaProductoUseCase(ventaProductoRepo);
      // El repo hace DELETE silencioso → resuelve undefined sin error
      ventaProductoRepo.deleteById.mockResolvedValue(undefined);

      await expect(useCase.execute('venta-inexistente', 'empresa-001'))
        .resolves.toBeUndefined();
    });

    it('retorna void (undefined) en el caso exitoso', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new DeleteVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.deleteById.mockResolvedValue(undefined);

      const resultado = await useCase.execute('venta-001', 'empresa-001');

      expect(resultado).toBeUndefined();
    });

  });

  // ── PROPAGACIÓN DE ERRORES DEL REPO ──────────────────────────────────────

  describe('propagación de errores', () => {

    it('propaga el error si el repo lanza una excepción (ej: DB caída)', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new DeleteVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.deleteById.mockRejectedValue(new Error('DB connection lost'));

      await expect(useCase.execute('venta-001', 'empresa-001'))
        .rejects.toThrow('DB connection lost');
    });

  });

});
