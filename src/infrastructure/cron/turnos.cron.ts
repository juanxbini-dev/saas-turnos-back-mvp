import cron from 'node-cron';
import { pool } from '../database/postgres.connection';
import { N8nService } from '../services/n8n.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TurnosCron');

export const initTurnosCron = () => {
  // CRON DESACTIVADO - Ahora los turnos se finalizan manualmente
  // Se mantiene el archivo por si se necesita reactivar en el futuro
  console.log('⚠️ [Cron] Turnos cron desactivado — finalización manual activada');

  // CRON DE REINTENTOS N8N DESACTIVADO
  // Las flags confirmacion_whatsapp_enviada / confirmacion_email_enviada nunca se actualizaban
  // a TRUE tras el envío, causando reenvíos infinitos cada 15 min.
  // Reactivar solo después de implementar el UPDATE correspondiente en la DB.
  // cron.schedule('*/15 * * * *', async () => { ... });
};
