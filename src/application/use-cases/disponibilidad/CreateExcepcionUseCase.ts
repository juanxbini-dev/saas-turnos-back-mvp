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
    usuarioAutenticadoId: string,
    tipo: 'reemplazo' | 'adicional' = 'reemplazo'
  ): Promise<ExcepcionDia> {
    const id = this.cryptoService.generateUUID();

    const data: CreateExcepcionData = {
      id,
      profesional_id: profesionalId,
      fecha,
      disponible,
      tipo,
      ...(horaInicio && { hora_inicio: horaInicio }),
      ...(horaFin && { hora_fin: horaFin }),
      ...(intervaloMinutos && { intervalo_minutos: intervaloMinutos }),
      ...(notas && { notas })
    };

    return this.disponibilidadRepository.createExcepcion(data);
  }
}
