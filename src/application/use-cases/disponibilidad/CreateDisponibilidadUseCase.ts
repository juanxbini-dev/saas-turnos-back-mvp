import { IDisponibilidadRepository, CreateDisponibilidadData } from '../../../domain/repositories/IDisponibilidadRepository';
import { DisponibilidadSemanal } from '../../../domain/entities/Disponibilidad';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class CreateDisponibilidadUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private cryptoService: CryptoService
  ) {}

  async execute(
    profesionalId: string,
    diaInicio: number,
    diaFin: number,
    horaInicio: string,
    horaFin: string,
    intervaloMinutos: number,
    empresaId: string,
    usuarioAutenticadoId: string
  ): Promise<DisponibilidadSemanal> {
    // Verificar que el registro pertenezca al profesionalId autenticado
    if (profesionalId !== usuarioAutenticadoId) {
      throw Object.assign(new Error('No puedes crear disponibilidad para otro profesional'), { statusCode: 403 });
    }

    const id = this.cryptoService.generateUUID();

    const data: CreateDisponibilidadData = {
      id,
      profesional_id: profesionalId,
      dia_inicio: diaInicio,
      dia_fin: diaFin,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      intervalo_minutos: intervaloMinutos,
      empresa_id: empresaId
    };

    return this.disponibilidadRepository.createDisponibilidad(data);
  }
}
