import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { PasswordService } from '../../infrastructure/security/password.service';
import { JwtService } from '../../infrastructure/security/jwt.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    roles: string[];
    tenant: string;
  };
}

export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordService: PasswordService,
    private jwtService: JwtService
  ) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    // Parse email como username@domain.com
    const emailParts = request.email.split('@');
    if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
      throw new Error('Formato de email inválido');
    }

    const username = emailParts[0];
    const domain = emailParts[1];

    // 1. Buscar usuario por username y dominio
    const user = await this.userRepository.findByUsernameAndDomain(username, domain);
    
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // 2. Validar usuario activo
    if (!user.activo) {
      throw new Error('Usuario inactivo');
    }

    // 3. Validar empresa activa
    if (!user.empresa_activa) {
      throw new Error('Empresa inactiva');
    }

    // 4. Comparar password
    const isPasswordValid = await this.passwordService.compare(request.password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // 5. Generar JWT
    const accessToken = this.jwtService.sign({
      userId: user.id,
      empresaId: user.empresa_id,
      roles: user.roles
    });

    // 6. Actualizar last_login
    await this.userRepository.updateLastLogin(user.id);

    // 7. Retornar respuesta
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
        tenant: user.tenant || ''
      }
    };
  }
}
