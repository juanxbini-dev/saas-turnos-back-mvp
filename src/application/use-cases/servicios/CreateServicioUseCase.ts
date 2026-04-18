import { IServicioRepository, CreateServicioData } from '../../../domain/repositories/IServicioRepository';
import { Servicio } from '../../../domain/entities/Servicio';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class CreateServicioUseCase {
  constructor(
    private servicioRepository: IServicioRepository,
    private cryptoService: CryptoService
  ) {}

  async execute(data: CreateServicioData): Promise<Servicio> {
    if (!data.nombre?.trim()) {
      throw Object.assign(new Error('El nombre del servicio es requerido'), { statusCode: 400 });
    }

    if (!data.duracion || data.duracion < 60 || data.duracion % 60 !== 0) {
      throw Object.assign(new Error('La duración debe ser en horas completas (mínimo 60 minutos)'), { statusCode: 400 });
    }

    const id = this.cryptoService.generateUUID();
    
    return this.servicioRepository.create({
      ...data,
      id
    });
  }
}
