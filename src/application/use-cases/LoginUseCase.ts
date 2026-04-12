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
    if (!request.email || !request.email.trim()) {
      throw new Error('El usuario o email es requerido');
    }

    // 1. Buscar usuario por username o email
    const user = await this.userRepository.findByUsernameOrEmail(request.email.trim());

    if (!user) {
      throw new Error('Usuario no encontrado. Verificá tu usuario o email.');
    }

    // 2. Validar usuario activo
    if (!user.activo) {
      throw new Error('Tu usuario está inactivo. Contactá al administrador.');
    }

    // 3. Validar empresa activa
    if (!user.empresa_activa) {
      throw new Error('La cuenta de la empresa está inactiva. Contactá al administrador.');
    }

    // 4. Comparar password
    const isPasswordValid = await this.passwordService.compare(request.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Contraseña incorrecta. Verificá e intentá de nuevo.');
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
