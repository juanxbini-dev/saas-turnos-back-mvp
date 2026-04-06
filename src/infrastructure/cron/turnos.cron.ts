import cron from 'node-cron';
import { pool } from '../database/postgres.connection';
import { N8nService } from '../services/n8n.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TurnosCron');

export const initTurnosCron = () => {
  // CRON DESACTIVADO - Ahora los turnos se finalizan manualmente
  // Se mantiene el archivo por si se necesita reactivar en el futuro
  console.log('⚠️ [Cron] Turnos cron desactivado — finalización manual activada');

  // Cada 15 minutos: reintentar notificaciones de n8n que fallaron
  // Busca turnos creados hace más de 5 min con notificaciones pendientes (hasta 24hs atrás)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const n8nService = new N8nService();

      const { rows } = await pool.query(`
        SELECT
          t.id,
          t.fecha,
          t.hora,
          t.servicio,
          t.servicio_id,
          t.usuario_id,
          t.cliente_id,
          c.nombre  AS cliente_nombre,
          c.email   AS cliente_email,
          c.telefono AS cliente_telefono,
          u.nombre  AS profesional_nombre
        FROM turnos t
        JOIN clientes  c ON c.id = t.cliente_id
        JOIN usuarios  u ON u.id = t.usuario_id
        WHERE (t.confirmacion_whatsapp_enviada = FALSE OR t.confirmacion_email_enviada = FALSE)
          AND t.estado != 'cancelado'
          AND t.created_at < NOW() - INTERVAL '5 minutes'
          AND t.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 20
      `);

      if (rows.length === 0) return;

      logger.info(`Reintentando notificaciones para ${rows.length} turno(s)`);

      for (const row of rows) {
        // TODO: Reemplazar N8nService.getTelefonoPrueba() por N8nService.normalizarTelefono(row.cliente_telefono)
        // cuando se pase a producción real con los teléfonos de los clientes.
        await n8nService.notificarTurnoCreado({
          appointment_id: row.id,
          customer_name: row.cliente_nombre,
          customer_email: row.cliente_email,
          customer_phone: N8nService.getTelefonoPrueba(),
          service_id: row.servicio_id,
          service_name: row.servicio,
          professional_id: row.usuario_id,
          professional_name: row.profesional_nombre,
          appointment_date: `${row.fecha} ${row.hora}`
        });
      }
    } catch (error) {
      logger.error('Error en cron de reintentos de notificaciones n8n', error as Error);
    }
  });
};
