import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { PasswordService } from '../../infrastructure/security/password.service';
import { TokenService } from '../../infrastructure/security/token.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    nombre: string;
    roles: string[];
    tenant: string;
  };
}

export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private refreshTokenRepository: IRefreshTokenRepository,
    private passwordService: PasswordService,
    private tokenService: typeof TokenService
  ) {}

  async execute(request: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    // Parse email como username@domain.com
    const emailParts = request.email.split('@');
    if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
      throw new Error('Formato de email inválido');
    }

    const username = emailParts[0];  // "test_admin"
    const domain = emailParts[1];    // "testempresa.com"

    // 1. Buscar usuario por username y dominio (como está guardado en BD)
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

    // 5. Generar access token
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      empresaId: user.empresa_id,
      roles: user.roles
    });

    // 6. Generar refresh token
    const refreshTokenData = this.tokenService.generateRefreshToken();

    // 7. Guardar refresh token en base de datos
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refreshTokenData.hash,
      expiresAt: refreshTokenData.expiresAt,
      revokedAt: null,
      lastUsedAt: new Date(),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      isActive: true,
      userInfo: {
        id: user.id,
        email: user.email,
        roles: user.roles,
        tenant: user.tenant || '',
        empresaId: user.empresa_id
      }
    });

    // 8. Actualizar last_login
    await this.userRepository.updateLastLogin(user.id);

    // 9. Retornar respuesta
    return {
      accessToken,
      refreshToken: refreshTokenData.token,
      expiresIn: this.tokenService.getAccessTokenExpiration(),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        roles: user.roles,
        tenant: user.tenant || ''
      }
    };
  }
}
