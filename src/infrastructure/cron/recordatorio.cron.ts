import cron from 'node-cron';
import { createLogger } from '../../utils/logger';
import { PostgresTurnoRepository } from '../repositories/PostgresTurnoRepository';
import { N8nService } from '../services/n8n.service';

const logger = createLogger('RecordatorioCron');

async function enviarRecordatoriosDelDia(): Promise<void> {
  logger.info('Iniciando envío de recordatorios del día');

  const turnoRepo = new PostgresTurnoRepository();
  const n8nService = new N8nService();

  let turnos;
  try {
    turnos = await turnoRepo.findConfirmadosDelDiaSinRecordatorio();
  } catch (error) {
    logger.error('Error al obtener turnos para recordatorio', error as Error);
    return;
  }

  if (turnos.length === 0) {
    logger.info('No hay turnos pendientes de recordatorio hoy');
    return;
  }

  logger.info(`${turnos.length} turno(s) para notificar`);

  let enviados = 0;
  let fallidos = 0;

  for (const turno of turnos) {
    const ok = await n8nService.enviarRecordatorio({
      turno_id: turno.id,
      customer_name: turno.customer_name || '',
      customer_phone: N8nService.normalizarTelefono(turno.customer_phone ?? undefined),
      service_name: turno.servicio,
      professional_name: turno.professional_name || '',
      hora: turno.hora
    });

    if (ok) {
      try {
        await turnoRepo.marcarRecordatorioEnviado(turno.id);
        enviados++;
      } catch (error) {
        logger.error('Error al marcar recordatorio enviado', error as Error, { turnoId: turno.id });
      }
    } else {
      fallidos++;
      logger.error('Falló el envío del recordatorio', new Error('n8n respondió con error'), { turnoId: turno.id });
    }
  }

  logger.info(`Recordatorios completados — enviados: ${enviados}, fallidos: ${fallidos}`);
}

export function initRecordatorioCron(): void {
  // Todos los días a las 8:00 AM
  cron.schedule('0 8 * * *', () => {
    enviarRecordatoriosDelDia().catch((error) => {
      logger.error('Error inesperado en cron de recordatorios', error);
    });
  }, {
    timezone: 'America/Argentina/Buenos_Aires'
  });

  logger.info('Cron de recordatorios registrado (0 8 * * * America/Argentina/Buenos_Aires)');
}
