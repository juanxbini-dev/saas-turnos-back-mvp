import { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from '../../presentation/middlewares/requestId.middleware';

// Patrón UUID v4
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildMocks(headers: Record<string, string> = {}) {
  const req = {
    headers,
  } as unknown as Request;

  const setHeaderCalls: Array<[string, string]> = [];
  const res = {
    setHeader: jest.fn((name: string, value: string) => {
      setHeaderCalls.push([name, value]);
    }),
  } as unknown as Response;

  const next: NextFunction = jest.fn();

  return { req, res, next, setHeaderCalls };
}

describe('requestIdMiddleware', () => {
  it('usa el X-Request-Id del header entrante si está presente', () => {
    const fixedId = 'my-custom-request-id-123';
    const { req, res, next } = buildMocks({ 'x-request-id': fixedId });

    requestIdMiddleware(req, res, next);

    expect((req as any).id).toBe(fixedId);
  });

  it('genera un UUID v4 cuando no viene X-Request-Id en el header', () => {
    const { req, res, next } = buildMocks();

    requestIdMiddleware(req, res, next);

    const assignedId: string = (req as any).id;
    expect(assignedId).toMatch(UUID_V4_REGEX);
  });

  it('genera IDs distintos en dos requests sin header', () => {
    const { req: req1, res: res1, next: next1 } = buildMocks();
    const { req: req2, res: res2, next: next2 } = buildMocks();

    requestIdMiddleware(req1, res1, next1);
    requestIdMiddleware(req2, res2, next2);

    expect((req1 as any).id).not.toBe((req2 as any).id);
  });

  it('siempre setea el header X-Request-Id en la respuesta', () => {
    const { req, res, next } = buildMocks({ 'x-request-id': 'abc-123' });

    requestIdMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'abc-123');
  });

  it('setea en respuesta el mismo ID generado cuando no viene header', () => {
    const { req, res, next } = buildMocks();

    requestIdMiddleware(req, res, next);

    const assignedId: string = (req as any).id;
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', assignedId);
  });

  it('llama a next() para continuar la cadena de middlewares', () => {
    const { req, res, next } = buildMocks({ 'x-request-id': 'test-id' });

    requestIdMiddleware(req, res, next);

    // next se invoca dentro del callback de requestStore.run(), así que debe haber sido llamado
    expect(next).toHaveBeenCalledTimes(1);
  });
});
