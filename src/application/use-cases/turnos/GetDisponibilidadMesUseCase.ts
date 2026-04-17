import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';

export class GetDisponibilidadMesUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private disponibilidadService: DisponibilidadService,
    private turnoRepository: ITurnoRepository
  ) {}

  async execute(profesionalId: string, mes: number, año: number): Promise<string[]> {
    const primerDia = `${año}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = `${año}-${String(mes).padStart(2, '0')}-${new Date(año, mes, 0).getDate()}`;

    const [disponibilidades, vacaciones, excepciones, turnosMes] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(profesionalId),
      this.disponibilidadRepository.findVacacionesByProfesional(profesionalId),
      this.disponibilidadRepository.findExcepcionesByProfesional(profesionalId),
      this.turnoRepository.findByProfesionalEnRango(profesionalId, primerDia, ultimoDia)
    ]);

    // Agrupar turnos confirmados por fecha para reutilizar en el cálculo de slots
    const turnosPorFecha = new Map<string, typeof turnosMes>();
    for (const turno of turnosMes) {
      const fecha = typeof turno.fecha === 'string'
        ? turno.fecha.slice(0, 10)
        : (turno.fecha as unknown as Date).toISOString().slice(0, 10);
      if (!turnosPorFecha.has(fecha)) turnosPorFecha.set(fecha, []);
      turnosPorFecha.get(fecha)!.push(turno);
    }

    const diasConHorario = this.disponibilidadService.calcularDiasDisponiblesMes(
      disponibilidades,
      vacaciones,
      excepciones,
      mes,
      año
    );

    // Filtrar los días que tengan al menos un slot libre
    const diasDisponibles = diasConHorario.filter(fecha => {
      const turnosDelDia = turnosPorFecha.get(fecha) || [];
      const slots = this.disponibilidadService.calcularSlotsDisponibles(
        disponibilidades,
        excepciones,
        turnosDelDia as any,
        fecha
      );
      return slots.length > 0;
    });

    return diasDisponibles;
  }
}
