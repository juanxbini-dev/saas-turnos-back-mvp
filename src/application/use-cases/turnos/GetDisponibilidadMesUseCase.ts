import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';

export class GetDisponibilidadMesUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private disponibilidadService: DisponibilidadService
  ) {}

  async execute(profesionalId: string, mes: number, año: number): Promise<string[]> {
    console.log('🔍 [GetDisponibilidadMesUseCase] Iniciando ejecución:', { profesionalId, mes, año });
    
    const [disponibilidades, vacaciones, excepciones] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(profesionalId),
      this.disponibilidadRepository.findVacacionesByProfesional(profesionalId),
      this.disponibilidadRepository.findExcepcionesByProfesional(profesionalId)
    ]);

    console.log(' [GetDisponibilidadMesUseCase] Datos obtenidos:', {
      disponibilidades: disponibilidades.length,
      vacaciones: vacaciones.length,
      excepciones: excepciones.length,
      excepciones_detalle: excepciones.map(exc => ({
        fecha: exc.fecha,
        disponible: exc.disponible,
        hora_inicio: exc.hora_inicio,
        hora_fin: exc.hora_fin
      }))
    });

    const result = this.disponibilidadService.calcularDiasDisponiblesMes(
      disponibilidades,
      vacaciones,
      excepciones,
      mes,
      año
    );

    console.log('🔍 [GetDisponibilidadMesUseCase] Resultado final:', result);
    return result;
  }
}
