import { IDisponibilidadRepository, CreateVacacionData } from '../../../domain/repositories/IDisponibilidadRepository';
import { DiasVacacion } from '../../../domain/entities/Disponibilidad';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class CreateVacacionUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private cryptoService: CryptoService
  ) {}

  async execute(
    profesionalId: string,
    fecha: string,
    fechaFin: string | null,
    tipo: 'vacacion' | 'feriado' | 'personal' | 'enfermedad',
    motivo: string | null,
    empresaId: string,
    usuarioAutenticadoId: string
  ): Promise<DiasVacacion> {
    // Verificar que el registro pertenezca al profesionalId autenticado
    if (profesionalId !== usuarioAutenticadoId) {
      throw Object.assign(new Error('No puedes crear vacaciones para otro profesional'), { statusCode: 403 });
    }

    const id = this.cryptoService.generateUUID();

    const data: CreateVacacionData = {
      id,
      profesional_id: profesionalId,
      fecha,
      ...(fechaFin && { fecha_fin: fechaFin }),
      tipo,
      ...(motivo && { motivo })
    };

    return this.disponibilidadRepository.createVacacion(data);
  }
}
