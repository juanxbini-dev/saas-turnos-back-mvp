import { Request, Response, NextFunction } from 'express';

// ── Mock del pool ANTES de cualquier import que lo use ──────────────────────
const mockQuery = jest.fn();
jest.mock('../../infrastructure/database/postgres.connection', () => ({
  pool: { query: mockQuery },
}));

// Mock de logger para no contaminar la salida del test
jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
  requestStore: { getStore: jest.fn(() => null) },
}));

import { errorHandler, CustomError } from '../../presentation/middlewares/error.middleware';

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildError(message: string, statusCode?: number): CustomError {
  const err = new Error(message) as CustomError;
  if (statusCode !== undefined) err.statusCode = statusCode;
  return err;
}

function buildRequest(id?: string): Request {
  return {
    id,
    method: 'GET',
    originalUrl: '/api/test',
    headers: {},
    user: null,
  } as unknown as Request;
}

function buildResponse() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  return { res, status, json };
}

const next: NextFunction = jest.fn();

// ── Tests ────────────────────────────────────────────────────────────────────

describe('errorHandler — errores 4xx (cliente)', () => {
  it('devuelve status 400 con { success: false, message, requestId }', () => {
    const req = buildRequest('req-abc');
    const { res, status, json } = buildResponse();
    const err = buildError('Datos inválidos', 400);

    errorHandler(err, req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Datos inválidos',
      requestId: 'req-abc',
    });
  });

  it('NO llama a pool.query para errores 4xx', async () => {
    const req = buildRequest('req-def');
    const { res } = buildResponse();
    const err = buildError('Not found', 404);

    errorHandler(err, req, res, next);

    // Dar tiempo al posible fire-and-forget (aunque no debería ejecutarse)
    await new Promise((r) => setTimeout(r, 20));

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('incluye el requestId correcto de req.id en la respuesta', () => {
    const req = buildRequest('mi-id-personalizado');
    const { res, json } = buildResponse();
    const err = buildError('Unauthorized', 401);

    errorHandler(err, req, res, next);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'mi-id-personalizado' })
    );
  });
});

describe('errorHandler — errores 5xx (servidor)', () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('devuelve status 500 con { success: false, message, requestId }', () => {
    const req = buildRequest('req-500');
    const { res, status, json } = buildResponse();
    const err = buildError('Fallo interno', 500);

    errorHandler(err, req, res, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Fallo interno',
      requestId: 'req-500',
    });
  });

  it('usa statusCode 500 por defecto si el error no tiene statusCode', () => {
    const req = buildRequest('req-nocode');
    const { res, status } = buildResponse();
    const err = new Error('error sin código') as CustomError;

    errorHandler(err, req, res, next);

    expect(status).toHaveBeenCalledWith(500);
  });

  it('intenta insertar en error_logs para un 500', async () => {
    const req = buildRequest('req-log');
    const { res } = buildResponse();
    const err = buildError('DB exploded', 500);

    errorHandler(err, req, res, next);

    // Esperar el fire-and-forget
    await new Promise((r) => setTimeout(r, 20));

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO error_logs/i);
    // El primer parámetro del INSERT debe ser el requestId
    expect(params[0]).toBe('req-log');
    // El status code
    expect(params[5]).toBe(500);
    // El mensaje
    expect(params[6]).toBe('DB exploded');
  });

  it('la respuesta al cliente se envía aunque el insert en error_logs falle', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const req = buildRequest('req-db-fail');
    const { res, status, json } = buildResponse();
    const err = buildError('Error crítico', 500);

    // No debe lanzar error
    expect(() => errorHandler(err, req, res, next)).not.toThrow();

    // La respuesta ya fue enviada antes de que el insert falle
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Error crítico',
      requestId: 'req-db-fail',
    });

    // Esperar que el promise rechazado se resuelva (el .catch(() => {}) no debe romper nada)
    await new Promise((r) => setTimeout(r, 20));
  });

  it('incluye requestId undefined cuando req.id no está asignado', () => {
    const req = buildRequest(undefined);
    const { res, json } = buildResponse();
    const err = buildError('error sin id', 500);

    errorHandler(err, req, res, next);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: undefined })
    );
  });
});
