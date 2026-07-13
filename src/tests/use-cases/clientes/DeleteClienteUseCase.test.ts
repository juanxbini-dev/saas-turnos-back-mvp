/**
 * Tests unitarios de DeleteClienteUseCase.
 *
 * Flujo que cubre este use case:
 *   1. clienteRepository.findById(id)          → valida existencia
 *   2. cliente.empresa_id === empresaId         → valida pertenencia al tenant
 *   3. clienteRepository.tieneTurnosActivos(id) → bloquea si hay turnos pendientes/confirmados
 *   4. clienteRepository.delete(id)             → elimina si todo es válido
 */

import { DeleteClienteUseCase } from '../../../application/use-cases/clientes/DeleteClienteUseCase';
import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { Cliente } from '../../../domain/entities/Cliente';

// ── Factory de datos de prueba ────────────────────────────────────────────────

function buildCliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id:         'cliente-001',
    nombre:     'Ana López',
    email:      'ana@test.com',
    telefono:   '2915000001',
    empresa_id: 'empresa-001',
    activo:     true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Factory de mocks del repositorio ─────────────────────────────────────────

function makeMocks() {
  const clienteRepo: jest.Mocked<IClienteRepository> = {
    findByEmpresa:          jest.fn(),
    findByEmpresaPaginado:  jest.fn(),
    findByProfesional:      jest.fn(),
    findById:               jest.fn(),
    create:                 jest.fn(),
    update:                 jest.fn(),
    delete:                 jest.fn(),
    existeEmail:            jest.fn(),
    existeTelefono:         jest.fn(),
    findByEmailOrTelefono:  jest.fn(),
    findByTelefono:         jest.fn(),
    findByEmail:            jest.fn(),
    getTurnosCount:         jest.fn(),
    tieneTurnosActivos:     jest.fn(),
    getClienteTurnos:       jest.fn(),
    getClienteProductos:    jest.fn(),
  };

  return { clienteRepo };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeleteClienteUseCase', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── CLIENTE NO ENCONTRADO ─────────────────────────────────────────────────

  describe('cliente no encontrado', () => {

    it('lanza error 404 si findById retorna null', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockResolvedValue(null);

      const useCase = new DeleteClienteUseCase(clienteRepo);

      await expect(useCase.execute('cliente-inexistente', 'empresa-001'))
        .rejects.toMatchObject({ message: 'Cliente no encontrado', statusCode: 404 });
    });

    it('no llama a tieneTurnosActivos ni a delete si el cliente no existe', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockResolvedValue(null);

      const useCase = new DeleteClienteUseCase(clienteRepo);

      await expect(useCase.execute('cliente-inexistente', 'empresa-001'))
        .rejects.toThrow();

      expect(clienteRepo.tieneTurnosActivos).not.toHaveBeenCalled();
      expect(clienteRepo.delete).not.toHaveBeenCalled();
    });

  });

  // ── PERTENENCIA AL TENANT (MULTI-TENANCY) ────────────────────────────────

  describe('cliente de otra empresa', () => {

    it('lanza error 403 si el cliente pertenece a otro empresa_id', async () => {
      const { clienteRepo } = makeMocks();
      // El cliente existe pero pertenece a empresa-AJENA, no a empresa-SOLICITANTE
      clienteRepo.findById.mockResolvedValue(
        buildCliente({ empresa_id: 'empresa-AJENA' })
      );

      const useCase = new DeleteClienteUseCase(clienteRepo);

      await expect(useCase.execute('cliente-001', 'empresa-SOLICITANTE'))
        .rejects.toMatchObject({
          message: 'No tenés permisos para eliminar este cliente',
          statusCode: 403,
        });
    });

    it('no llama a tieneTurnosActivos ni a delete si la empresa no coincide', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockResolvedValue(
        buildCliente({ empresa_id: 'empresa-AJENA' })
      );

      const useCase = new DeleteClienteUseCase(clienteRepo);

      await expect(useCase.execute('cliente-001', 'empresa-SOLICITANTE'))
        .rejects.toThrow();

      expect(clienteRepo.tieneTurnosActivos).not.toHaveBeenCalled();
      expect(clienteRepo.delete).not.toHaveBeenCalled();
    });

  });

  // ── TURNOS ACTIVOS (CONFLICTO 409) ────────────────────────────────────────

  describe('cliente con turnos activos', () => {

    it('lanza error 409 si tieneTurnosActivos retorna 1 (singular)', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockResolvedValue(buildCliente());
      clienteRepo.tieneTurnosActivos.mockResolvedValue(1);

      const useCase = new DeleteClienteUseCase(clienteRepo);

      await expect(useCase.execute('cliente-001', 'empresa-001'))
        .rejects.toMatchObject({
          statusCode: 409,
          message: 'No se puede eliminar el cliente porque tiene 1 turno pendiente o confirmado',
          // singular: "turno", "pendiente", "confirmado"
        });
    });

    it('lanza error 409 si tieneTurnosActivos retorna 3 (plural)', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockResolvedValue(buildCliente());
      clienteRepo.tieneTurnosActivos.mockResolvedValue(3);

      const useCase = new DeleteClienteUseCase(clienteRepo);

      await expect(useCase.execute('cliente-001', 'empresa-001'))
        .rejects.toMatchObject({
          statusCode: 409,
          message: 'No se puede eliminar el cliente porque tiene 3 turnos pendientes o confirmados',
          // plural: "turnos", "pendientes", "confirmados"
        });
    });

    it('no llama a delete cuando hay turnos activos', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockResolvedValue(buildCliente());
      clienteRepo.tieneTurnosActivos.mockResolvedValue(2);

      const useCase = new DeleteClienteUseCase(clienteRepo);

      await expect(useCase.execute('cliente-001', 'empresa-001')).rejects.toThrow();

      expect(clienteRepo.delete).not.toHaveBeenCalled();
    });

  });

  // ── CASO EXITOSO ──────────────────────────────────────────────────────────

  describe('eliminación exitosa', () => {

    it('llama a delete con el id correcto cuando no hay turnos activos', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockResolvedValue(buildCliente());
      clienteRepo.tieneTurnosActivos.mockResolvedValue(0);
      clienteRepo.delete.mockResolvedValue(undefined);

      const useCase = new DeleteClienteUseCase(clienteRepo);
      await useCase.execute('cliente-001', 'empresa-001');

      expect(clienteRepo.delete).toHaveBeenCalledTimes(1);
      expect(clienteRepo.delete).toHaveBeenCalledWith('cliente-001');
    });

    it('retorna void (undefined) en el caso exitoso', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockResolvedValue(buildCliente());
      clienteRepo.tieneTurnosActivos.mockResolvedValue(0);
      clienteRepo.delete.mockResolvedValue(undefined);

      const useCase = new DeleteClienteUseCase(clienteRepo);
      const resultado = await useCase.execute('cliente-001', 'empresa-001');

      expect(resultado).toBeUndefined();
    });

    it('llama a delete también cuando tieneTurnosActivos retorna exactamente 0', async () => {
      const { clienteRepo } = makeMocks();
      // Caso borde: cliente que solo tiene turnos completados o cancelados
      clienteRepo.findById.mockResolvedValue(buildCliente());
      clienteRepo.tieneTurnosActivos.mockResolvedValue(0);
      clienteRepo.delete.mockResolvedValue(undefined);

      const useCase = new DeleteClienteUseCase(clienteRepo);
      await useCase.execute('cliente-001', 'empresa-001');

      expect(clienteRepo.delete).toHaveBeenCalledTimes(1);
    });

    it('ejecuta las llamadas en el orden correcto: findById → tieneTurnosActivos → delete', async () => {
      const { clienteRepo } = makeMocks();
      const callOrder: string[] = [];

      clienteRepo.findById.mockImplementation(async () => {
        callOrder.push('findById');
        return buildCliente();
      });
      clienteRepo.tieneTurnosActivos.mockImplementation(async () => {
        callOrder.push('tieneTurnosActivos');
        return 0;
      });
      clienteRepo.delete.mockImplementation(async () => {
        callOrder.push('delete');
      });

      const useCase = new DeleteClienteUseCase(clienteRepo);
      await useCase.execute('cliente-001', 'empresa-001');

      expect(callOrder).toEqual(['findById', 'tieneTurnosActivos', 'delete']);
    });

  });

  // ── PROPAGACIÓN DE ERRORES DEL REPO ──────────────────────────────────────

  describe('propagación de errores del repositorio', () => {

    it('propaga el error si findById lanza una excepción (ej: DB caída)', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockRejectedValue(new Error('DB connection lost'));

      const useCase = new DeleteClienteUseCase(clienteRepo);

      await expect(useCase.execute('cliente-001', 'empresa-001'))
        .rejects.toThrow('DB connection lost');
    });

    it('propaga el error si delete lanza una excepción', async () => {
      const { clienteRepo } = makeMocks();
      clienteRepo.findById.mockResolvedValue(buildCliente());
      clienteRepo.tieneTurnosActivos.mockResolvedValue(0);
      clienteRepo.delete.mockRejectedValue(new Error('FK constraint violation'));

      const useCase = new DeleteClienteUseCase(clienteRepo);

      await expect(useCase.execute('cliente-001', 'empresa-001'))
        .rejects.toThrow('FK constraint violation');
    });

  });

});
