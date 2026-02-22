import cron from 'node-cron';
import { CompletarTurnosVencidosUseCase } from '../../application/use-cases/turnos/CompletarTurnosVencidosUseCase';
import { PostgresTurnoRepository } from '../repositories/PostgresTurnoRepository';

export const initTurnosCron = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const useCase = new CompletarTurnosVencidosUseCase(new PostgresTurnoRepository());
      await useCase.execute();
    } catch (error) {
      console.error('❌ [Cron] Error completando turnos:', error);
    }
  });
  
  console.log('✅ [Cron] Turnos cron iniciado — cada 5 minutos');
};
