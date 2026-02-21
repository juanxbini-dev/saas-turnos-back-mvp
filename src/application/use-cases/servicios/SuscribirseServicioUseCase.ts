import { IUsuarioServicioRepository, CreateUsuarioServicioData } from '../../../domain/repositories/IUsuarioServicioRepository';
import { UsuarioServicio } from '../../../domain/entities/Servicio';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class SuscribirseServicioUseCase {
  constructor(
    private usuarioServicioRepository: IUsuarioServicioRepository,
    private cryptoService: CryptoService
  ) {}

  async execute(usuarioId: string, servicioId: string, empresaId: string): Promise<UsuarioServicio> {
    const yaSubscripto = await this.usuarioServicioRepository.estaSubscripto(usuarioId, servicioId);
    
    if (yaSubscripto) {
      throw Object.assign(new Error('Ya estás suscripto a este servicio'), { statusCode: 400 });
    }

    const id = this.cryptoService.generateUUID();
    
    return this.usuarioServicioRepository.create({
      id,
      usuario_id: usuarioId,
      servicio_id: servicioId,
      empresa_id: empresaId,
      habilitado: true
    });
  }
}
