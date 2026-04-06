import { createLogger } from '../../utils/logger';

const logger = createLogger('N8nService');

// TODO: Reemplazar este número por el teléfono real del cliente (campo `telefono` de la tabla clientes).
// Mientras tanto se usa este número de prueba para todas las notificaciones de WhatsApp.
const TELEFONO_PRUEBA = '+542915705322';

export interface N8nTurnoPayload {
  appointment_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_id: string;
  service_name: string;
  professional_id: string;
  professional_name: string;
  appointment_date: string; // formato: YYYY-MM-DD HH:MM:SS
}

export interface N8nWebhookResult {
  success: boolean;
  whatsapp_enviado: boolean;
  email_enviado: boolean;
}

export class N8nService {
  private readonly webhookUrl: string;
  // Timeout generoso: fire-and-forget, no afecta al tiempo de respuesta al usuario
  private readonly timeoutMs = 10_000;

  constructor() {
    const base = process.env.N8N_WEBHOOK_BASE_URL || '';
    this.webhookUrl = `${base}/webhook/crear-turno`;
  }

  /**
   * Notifica a n8n que se creó un turno.
   * Diseñado para usarse como fire-and-forget (sin await en el caller).
   * Nunca propaga excepciones — loguea internamente y devuelve resultado.
   */
  async notificarTurnoCreado(payload: N8nTurnoPayload): Promise<N8nWebhookResult> {
    const resultado: N8nWebhookResult = { success: false, whatsapp_enviado: false, email_enviado: false };

    if (!process.env.N8N_WEBHOOK_BASE_URL) {
      logger.error('N8N_WEBHOOK_BASE_URL no está configurada', new Error('Missing env'), {
        turnoId: payload.appointment_id
      });
      return resultado;
    }

    try {
      logger.info('Enviando notificación a n8n', { turnoId: payload.appointment_id, url: this.webhookUrl });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error('n8n respondió con error HTTP', new Error(`HTTP ${response.status}`), {
          turnoId: payload.appointment_id,
          status: response.status
        });
        return resultado;
      }

      const data = await response.json() as any;
      resultado.success = data.success === true;
      resultado.whatsapp_enviado = data.detalles?.whatsapp_enviado === true;
      resultado.email_enviado = data.detalles?.email_enviado === true;

      logger.info('n8n respondió OK', { turnoId: payload.appointment_id, resultado });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error('n8n timeout — no respondió en tiempo', error, { turnoId: payload.appointment_id });
      } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
        logger.error('n8n no disponible (conexión rechazada)', error, { turnoId: payload.appointment_id });
      } else {
        logger.error('Error en webhook n8n', error, { turnoId: payload.appointment_id });
      }
    }

    return resultado;
  }

  /**
   * Normaliza el teléfono al formato internacional requerido por WhatsApp Business API.
   * TODO: Cuando se pase al teléfono real del cliente, reemplazar getTelefonoPrueba() por
   * N8nService.normalizarTelefono(cliente.telefono) en TurnosController, TurnoPublicController
   * y turnos.cron.ts.
   */
  static normalizarTelefono(telefono?: string): string {
    if (!telefono) return TELEFONO_PRUEBA;
    const limpio = telefono.replace(/[\s\-().]/g, '');
    if (limpio.startsWith('+')) return limpio;
    if (limpio.startsWith('54')) return `+${limpio}`;
    // Si no tiene código de país, asumir Argentina (+54)
    return `+54${limpio}`;
  }

  /** Devuelve el teléfono de prueba hardcodeado. Usar hasta tener el teléfono real del cliente. */
  static getTelefonoPrueba(): string {
    return TELEFONO_PRUEBA;
  }
}
