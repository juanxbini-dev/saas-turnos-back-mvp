import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';
import { IUsuarioServicioRepository } from '../../../domain/repositories/IUsuarioServicioRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';

export class GetSlotsDisponiblesUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private turnoRepository: ITurnoRepository,
    private disponibilidadService: DisponibilidadService,
    private bloqueoSlotRepository: IBloqueoSlotRepository,
    private usuarioServicioRepository: IUsuarioServicioRepository
  ) {}

  async execute(profesionalId: string, fecha: string, servicioId?: string): Promise<string[]> {
    const [disponibilidades, excepciones, turnosExistentes, bloqueosSlots] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(profesionalId),
      this.disponibilidadRepository.findExcepcionesByProfesional(profesionalId),
      this.turnoRepository.findByFechaYProfesional(profesionalId, fecha),
      this.bloqueoSlotRepository.findByProfesionalAndFecha(profesionalId, fecha)
    ]);

    let duracionMinutos = 0;
    if (servicioId) {
      const servicio = await this.usuarioServicioRepository.findByUsuarioAndServicio(profesionalId, servicioId);
      if (servicio) {
        duracionMinutos = servicio.duracion_personalizada || servicio.duracion_minutos || 0;
      }
    }

    return this.disponibilidadService.calcularSlotsDisponibles(
      disponibilidades,
      excepciones,
      turnosExistentes,
      fecha,
      bloqueosSlots,
      duracionMinutos
    );
  }
}
