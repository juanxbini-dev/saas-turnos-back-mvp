/**
 * Tests del logger y requestStore.
 *
 * Estrategia: spyar winston.transports.Console.prototype.log para capturar
 * el objeto `info` que winston le entrega al transport justo antes de
 * serializar. Esto da acceso al objeto ya procesado por todos los formatos
 * (redact + addRequestContext).
 */

import winston from 'winston';
import { requestStore, logger } from '../../utils/logger';

// ── Helper: captura el próximo objeto info que llega al transport ─────────────

function captureNextLog(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const transport = logger.transports[0] as any;
    const original = transport.log.bind(transport);

    transport.log = (info: Record<string, unknown>, callback: () => void) => {
      // Restaurar inmediatamente para no interferir con más logs
      transport.log = original;
      resolve({ ...info });
      if (callback) callback();
    };
  });
}

// ── Tests: propagación de contexto ───────────────────────────────────────────

describe('requestStore — propagación de requestId en logs', () => {
  it('el log incluye requestId cuando se emite dentro de requestStore.run()', async () => {
    const logPromise = captureNextLog();

    requestStore.run({ requestId: 'test-request-id-999' }, () => {
      logger.info('mensaje de prueba');
    });

    const info = await logPromise;
    expect(info.requestId).toBe('test-request-id-999');
  });

  it('el log incluye userId cuando el store lo contiene', async () => {
    const logPromise = captureNextLog();

    requestStore.run({ requestId: 'req-xyz', userId: 'user-42' }, () => {
      logger.info('con usuario');
    });

    const info = await logPromise;
    expect(info.requestId).toBe('req-xyz');
    expect(info.userId).toBe('user-42');
  });

  it('el log NO incluye requestId cuando se emite fuera del store', async () => {
    const logPromise = captureNextLog();

    // Intencionalmente fuera de requestStore.run()
    logger.info('fuera del contexto');

    const info = await logPromise;
    expect(info.requestId).toBeUndefined();
  });
});

// ── Tests: redacción de campos sensibles ─────────────────────────────────────

describe('logger — redacción de campos sensibles', () => {
  it('redacta el campo password', async () => {
    const logPromise = captureNextLog();

    requestStore.run({ requestId: 'redact-test' }, () => {
      (logger.info as any)('login attempt', { password: 'supersecret' });
    });

    const info = await logPromise;
    expect(info.password).toBe('[REDACTED]');
  });

  it('redacta el campo token', async () => {
    const logPromise = captureNextLog();

    requestStore.run({ requestId: 'redact-test' }, () => {
      (logger.info as any)('token present', { token: 'eyJhbGciOiJIUzI1NiJ9.xxx' });
    });

    const info = await logPromise;
    expect(info.token).toBe('[REDACTED]');
  });

  it('redacta el campo accessToken', async () => {
    const logPromise = captureNextLog();

    requestStore.run({ requestId: 'redact-test' }, () => {
      (logger.info as any)('access token', { accessToken: 'bearer-abc' });
    });

    const info = await logPromise;
    expect(info.accessToken).toBe('[REDACTED]');
  });

  it('redacta el campo refreshToken', async () => {
    const logPromise = captureNextLog();

    requestStore.run({ requestId: 'redact-test' }, () => {
      (logger.info as any)('refresh token', { refreshToken: 'refresh-xyz' });
    });

    const info = await logPromise;
    expect(info.refreshToken).toBe('[REDACTED]');
  });

  it('redacta el campo authorization', async () => {
    const logPromise = captureNextLog();

    requestStore.run({ requestId: 'redact-test' }, () => {
      (logger.info as any)('auth header', { authorization: 'Bearer token123' });
    });

    const info = await logPromise;
    expect(info.authorization).toBe('[REDACTED]');
  });

  it('redacta password dentro de body anidado', async () => {
    const logPromise = captureNextLog();

    requestStore.run({ requestId: 'redact-nested' }, () => {
      (logger.info as any)('request body', { body: { username: 'juan', password: 'mypass' } });
    });

    const info = await logPromise;
    expect((info.body as any).password).toBe('[REDACTED]');
    // Campos no sensibles dentro de body se preservan
    expect((info.body as any).username).toBe('juan');
  });

  it('preserva campos no sensibles sin modificar', async () => {
    const logPromise = captureNextLog();

    requestStore.run({ requestId: 'safe-fields' }, () => {
      (logger.info as any)('datos públicos', { userId: 'user-1', action: 'create' });
    });

    const info = await logPromise;
    expect(info.userId).toBe('user-1');
    expect(info.action).toBe('create');
  });
});
