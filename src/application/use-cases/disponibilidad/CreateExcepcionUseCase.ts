import { IDisponibilidadRepository, CreateExcepcionData } from '../../../domain/repositories/IDisponibilidadRepository';
import { ExcepcionDia } from '../../../domain/entities/Disponibilidad';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class CreateExcepcionUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private cryptoService: CryptoService
  ) {}

  async execute(
    profesionalId: string,
    fecha: string,
    disponible: boolean,
    horaInicio: string | null,
    horaFin: string | null,
    intervaloMinutos: number | null,
    notas: string | null,
    empresaId: string,
    usuarioAutenticadoId: string
  ): Promise<ExcepcionDia> {
    // Verificar que el registro pertenezca al profesionalId autenticado
    if (profesionalId !== usuarioAutenticadoId) {
      throw Object.assign(new Error('No puedes crear excepciones para otro profesional'), { statusCode: 403 });
    }

    const id = this.cryptoService.generateUUID();

    const data: CreateExcepcionData = {
      id,
      profesional_id: profesionalId,
      fecha,
      disponible,
      ...(horaInicio && { hora_inicio: horaInicio }),
      ...(horaFin && { hora_fin: horaFin }),
      ...(intervaloMinutos && { intervalo_minutos: intervaloMinutos }),
      ...(notas && { notas }),
      empresa_id: empresaId
    };

    return this.disponibilidadRepository.createExcepcion(data);
  }
}
