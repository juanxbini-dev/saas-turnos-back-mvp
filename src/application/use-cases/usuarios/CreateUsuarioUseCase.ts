import { IUsuarioRepository, CreateUsuarioData } from '../../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico } from '../../../domain/entities/User';
import { PasswordService } from '../../../infrastructure/security/password.service';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class CreateUsuarioUseCase {
  constructor(
    private usuarioRepository: IUsuarioRepository,
    private passwordService: PasswordService,
    private cryptoService: CryptoService
  ) {}

  async execute(data: CreateUsuarioData): Promise<UsuarioPublico> {
    const usernameExists = await this.usuarioRepository.existeUsername(
      data.username,
      data.empresa_id
    );
    
    if (usernameExists) {
      throw Object.assign(new Error('El username ya está en uso'), { statusCode: 400 });
    }

    const hashedPassword = await this.passwordService.hash(data.password);
    const id = this.cryptoService.generateUUID();
    
    const roles = data.rol === 'admin' ? ['admin', 'staff'] : ['staff'];

    return this.usuarioRepository.create({
      ...data,
      password: hashedPassword,
      id
    });
  }
}
