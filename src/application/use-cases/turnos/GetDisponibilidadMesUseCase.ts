import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IUsuarioServicioRepository } from '../../../domain/repositories/IUsuarioServicioRepository';
import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';

export class GetDisponibilidadMesUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private disponibilidadService: DisponibilidadService,
    private turnoRepository: ITurnoRepository,
    private usuarioServicioRepository: IUsuarioServicioRepository,
    private bloqueoSlotRepository: IBloqueoSlotRepository
  ) {}

  async execute(profesionalId: string, mes: number, año: number, servicioId?: string): Promise<string[]> {
    const primerDia = `${año}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = `${año}-${String(mes).padStart(2, '0')}-${new Date(año, mes, 0).getDate()}`;

    const [disponibilidades, vacaciones, excepciones, turnosMes, bloqueosMes] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(profesionalId),
      this.disponibilidadRepository.findVacacionesByProfesional(profesionalId),
      this.disponibilidadRepository.findExcepcionesByProfesional(profesionalId),
      this.turnoRepository.findByProfesionalEnRango(profesionalId, primerDia, ultimoDia),
      this.bloqueoSlotRepository.findByProfesionalAndRango(profesionalId, primerDia, ultimoDia)
    ]);

    let duracionMinutos = 0;
    if (servicioId) {
      const servicio = await this.usuarioServicioRepository.findByUsuarioAndServicio(profesionalId, servicioId);
      if (servicio) {
        duracionMinutos = servicio.duracion_personalizada || servicio.duracion_minutos || 0;
      }
    }

    // Agrupar turnos por fecha
    const turnosPorFecha = new Map<string, typeof turnosMes>();
    for (const turno of turnosMes) {
      const fecha = typeof turno.fecha === 'string'
        ? turno.fecha.slice(0, 10)
        : (turno.fecha as unknown as Date).toISOString().slice(0, 10);
      if (!turnosPorFecha.has(fecha)) turnosPorFecha.set(fecha, []);
      turnosPorFecha.get(fecha)!.push(turno);
    }

    // Agrupar bloqueos por fecha
    const bloqueosPorFecha = new Map<string, typeof bloqueosMes>();
    for (const bloqueo of bloqueosMes) {
      const fecha = typeof bloqueo.fecha === 'string'
        ? bloqueo.fecha.slice(0, 10)
        : (bloqueo.fecha as unknown as Date).toISOString().slice(0, 10);
      if (!bloqueosPorFecha.has(fecha)) bloqueosPorFecha.set(fecha, []);
      bloqueosPorFecha.get(fecha)!.push(bloqueo);
    }

    const diasConHorario = this.disponibilidadService.calcularDiasDisponiblesMes(
      disponibilidades,
      vacaciones,
      excepciones,
      mes,
      año
    );

    // Filtrar los días que tengan al menos un slot libre (respetando duración y bloqueos)
    const diasDisponibles = diasConHorario.filter(fecha => {
      const turnosDelDia = turnosPorFecha.get(fecha) || [];
      const bloqueosDelDia = bloqueosPorFecha.get(fecha) || [];
      const slots = this.disponibilidadService.calcularSlotsDisponibles(
        disponibilidades,
        excepciones,
        turnosDelDia as any,
        fecha,
        bloqueosDelDia as any,
        duracionMinutos
      );
      return slots.length > 0;
    });

    return diasDisponibles;
  }
}
