import { createLogger } from '../../utils/logger';

const logger = createLogger('N8nService');

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

export interface N8nCancelacionPayload {
  turno_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  professional_id: string;
  professional_name: string;
  professional_phone: string;
  appointment_date: string;
  fecha: string;
  hora: string;
}

export interface N8nRecordatorioPayload {
  turno_id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  professional_name: string;
  hora: string;
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

      // n8n puede devolver body vacío — en ese caso tratamos el 2xx como éxito parcial
      const text = await response.text();
      if (text) {
        try {
          const data = JSON.parse(text) as any;
          resultado.success = data.success === true;
          resultado.whatsapp_enviado = data.detalles?.whatsapp_enviado === true;
          resultado.email_enviado = data.detalles?.email_enviado === true;
        } catch {
          // n8n respondió con algo que no es JSON válido — lo tratamos como éxito genérico
          logger.info('n8n respondió con body no-JSON (respuesta vacía o texto plano)', {
            turnoId: payload.appointment_id, body: text.slice(0, 100)
          });
          resultado.success = true;
        }
      } else {
        // Body vacío con 2xx = n8n recibió el webhook correctamente
        resultado.success = true;
        logger.info('n8n respondió con body vacío (2xx) — webhook recibido', { turnoId: payload.appointment_id });
      }

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
   * Envía recordatorio de turno a n8n.
   * Retorna true si n8n respondió 2xx (el backend marcará recordatorio_enviado = true).
   * Nunca propaga excepciones.
   */
  async enviarRecordatorio(payload: N8nRecordatorioPayload): Promise<boolean> {
    if (!process.env.N8N_WEBHOOK_BASE_URL) return false;

    const url = `${process.env.N8N_WEBHOOK_BASE_URL}/webhook/enviar-recordatorio`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error('n8n respondió con error HTTP al enviar recordatorio', new Error(`HTTP ${response.status}`), {
          turnoId: payload.turno_id, status: response.status
        });
        return false;
      }

      logger.info('Recordatorio enviado a n8n', { turnoId: payload.turno_id });
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error('n8n timeout al enviar recordatorio', error, { turnoId: payload.turno_id });
      } else {
        logger.error('Error al enviar recordatorio a n8n', error, { turnoId: payload.turno_id });
      }
      return false;
    }
  }

  /**
   * Notifica a n8n que se canceló un turno desde la web pública.
   * Fire-and-forget — nunca propaga excepciones.
   */
  async notificarCancelacionTurno(payload: N8nCancelacionPayload): Promise<void> {
    if (!process.env.N8N_WEBHOOK_BASE_URL) {
      logger.error('N8N_WEBHOOK_BASE_URL no está configurada — cancelación sin notificar', new Error('Missing env'), { turnoId: payload.turno_id });
      return;
    }

    const url = `${process.env.N8N_WEBHOOK_BASE_URL}/webhook/cancelar-turno`;
    logger.info('Enviando notificación cancelación a n8n', { turnoId: payload.turno_id, url, professionalPhone: payload.professional_phone });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      logger.info('Notificación cancelación enviada a n8n', { turnoId: payload.turno_id, status: response.status });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error('n8n timeout al notificar cancelación', error, { turnoId: payload.turno_id });
      } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
        logger.error('n8n no disponible al notificar cancelación', error, { turnoId: payload.turno_id });
      } else {
        logger.error('Error al notificar cancelación a n8n', error, { turnoId: payload.turno_id });
      }
    }
  }

  /** Normaliza el teléfono al formato internacional requerido por WhatsApp Business API (Argentina: 54...). */
  static normalizarTelefono(telefono?: string): string {
    if (!telefono) return '';
    const limpio = telefono.replace(/[\s\-().+]/g, '');
    if (limpio.startsWith('54')) return limpio;
    return `54${limpio}`;
  }

  /**
   * Formatea fecha y hora para n8n en formato YYYY-MM-DD HH:MM:SS.
   * Necesario porque PostgreSQL devuelve `fecha` como objeto Date de JS,
   * y al interpolarlo en un template string produce un toString() ilegible.
   */
  static formatearAppointmentDate(fecha: Date | string, hora: string): string {
    let fechaStr: string;

    if (fecha instanceof Date) {
      // Extraer YYYY-MM-DD en hora local (no UTC) para evitar desfase de zona horaria
      const y = fecha.getFullYear();
      const m = String(fecha.getMonth() + 1).padStart(2, '0');
      const d = String(fecha.getDate()).padStart(2, '0');
      fechaStr = `${y}-${m}-${d}`;
    } else {
      // Si ya es string, tomar solo la parte de fecha (YYYY-MM-DD)
      fechaStr = String(fecha).split('T')[0].substring(0, 10);
    }

    // hora puede venir como "HH:MM" o "HH:MM:SS" — normalizar a "HH:MM:SS"
    const horaNorm = String(hora).substring(0, 8);
    const horaStr = horaNorm.length === 5 ? `${horaNorm}:00` : horaNorm;

    return `${fechaStr} ${horaStr}`;
  }
}
