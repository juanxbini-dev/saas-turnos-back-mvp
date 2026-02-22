import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';

export class GetDisponibilidadMesUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private disponibilidadService: DisponibilidadService
  ) {}

  async execute(profesionalId: string, mes: number, año: number): Promise<string[]> {
    const [disponibilidades, vacaciones, excepciones] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(profesionalId),
      this.disponibilidadRepository.findVacacionesByProfesional(profesionalId),
      this.disponibilidadRepository.findExcepcionesByProfesional(profesionalId)
    ]);

    return this.disponibilidadService.calcularDiasDisponiblesMes(
      disponibilidades,
      vacaciones,
      excepciones,
      mes,
      año
    );
  }
}
