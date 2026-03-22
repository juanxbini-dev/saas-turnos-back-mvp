import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';
import { DateUtils } from '../../../shared/utils/DateUtils';
import { isFeatureEnabled, logDate } from '../../../shared/config/featureFlags';

export class GetSlotsRangoUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private turnoRepository: ITurnoRepository,
    private disponibilidadService: DisponibilidadService,
    private bloqueoSlotRepository: IBloqueoSlotRepository
  ) {}

  async execute(
    profesionalId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<{ fecha: string; slots: string[] }[]> {
    logDate('Ejecutando:', { profesionalId, fechaInicio, fechaFin });

    // Usar DateUtils si el feature flag está activo
    const useNewUtils = isFeatureEnabled('USE_DATE_UTILS_IN_TURNS');

    // Validar fechas
    let inicio: Date;
    let fin: Date;
    
    if (useNewUtils) {
      // Validar formato con DateUtils
      if (!DateUtils.isValidDate(fechaInicio) || !DateUtils.isValidDate(fechaFin)) {
        throw new Error('Formato de fecha inválido');
      }
      
      inicio = new Date(fechaInicio + 'T00:00:00');
      fin = new Date(fechaFin + 'T00:00:00');
    } else {
      // Validación legacy
      const [iYear, iMonth, iDay] = fechaInicio.split('-').map(Number);
      const [fYear, fMonth, fDay] = fechaFin.split('-').map(Number);
      
      if (!iYear || !iMonth || !iDay || !fYear || !fMonth || !fDay) {
        throw new Error('Formato de fecha inválido');
      }
      
      inicio = new Date(iYear, iMonth - 1, iDay);
      fin = new Date(fYear, fMonth - 1, fDay);
      
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        throw new Error('Fechas inválidas');
      }
    }
    
    if (inicio > fin) {
      throw new Error('La fecha de inicio no puede ser posterior a la fecha de fin');
    }

    // Generar array de fechas en el rango
    const fechas = useNewUtils ? DateUtils.getDateRange(inicio, fin) : (() => {
      const fechasLegacy: string[] = [];
      const fechaActual = new Date(inicio);
      
      while (fechaActual <= fin) {
        const y = fechaActual.getFullYear();
        const m = String(fechaActual.getMonth() + 1).padStart(2, '0');
        const d = String(fechaActual.getDate()).padStart(2, '0');
        fechasLegacy.push(`${y}-${m}-${d}`);
        fechaActual.setDate(fechaActual.getDate() + 1);
      }
      
      return fechasLegacy;
    })();

    logDate('Fechas a procesar:', { fechas, useNewUtils });

    // Obtener disponibilidades, excepciones y bloqueos una sola vez para todo el rango
    const [disponibilidades, excepciones, bloqueosRango] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(profesionalId),
      this.disponibilidadRepository.findExcepcionesByProfesional(profesionalId),
      this.bloqueoSlotRepository.findByProfesionalAndRango(profesionalId, fechaInicio, fechaFin)
    ]);

    // Procesar cada fecha
    const resultados = await Promise.all(
      fechas.map(async (fecha) => {
        try {
          // Obtener turnos existentes para esa fecha específica
          const turnosExistentes = await this.turnoRepository.findByFechaYProfesional(
            profesionalId,
            fecha
          );

          // Generar slots disponibles usando el mismo servicio que el use case existente
          const bloqueosDelDia = bloqueosRango.filter(b => b.fecha.slice(0, 10) === fecha);
          const slots = this.disponibilidadService.calcularSlotsDisponibles(
            disponibilidades,
            excepciones,
            turnosExistentes,
            fecha,
            bloqueosDelDia
          );

          return {
            fecha,
            slots
          };
        } catch (error) {
          console.error(`Error procesando fecha ${fecha}:`, error);
          return {
            fecha,
            slots: []
          };
        }
      })
    );

    logDate('Resultados:', resultados);
    return resultados;
  }
}
