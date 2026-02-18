import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { TokenService, TokenPair } from '../../infrastructure/security/token.service';
import { CryptoService } from '../../infrastructure/security/crypto.service';
import { User } from '../../domain/entities/User';

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    roles: string[];
    tenant: string;
  };
}

export class RefreshUseCase {
  constructor(
    private refreshTokenRepository: IRefreshTokenRepository,
    private userRepository: IUserRepository,
    private tokenService: typeof TokenService
  ) {}

  async execute(request: RefreshRequest, ipAddress?: string, userAgent?: string): Promise<RefreshResponse> {
    // Hash the refresh token for lookup
    const tokenHash = CryptoService.hashToken(request.refreshToken);

    // Find the refresh token in database
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    
    if (!storedToken) {
      throw new Error('Refresh token inválido');
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      // Revoke the expired token
      await this.refreshTokenRepository.revokeToken(tokenHash);
      throw new Error('Refresh token expirado');
    }

    // Check if token is revoked
    if (!storedToken.isActive || storedToken.revokedAt) {
      throw new Error('Refresh token revocado');
    }

    // Get user information from refresh token
    const userInfo = storedToken.userInfo;
    
    if (!userInfo) {
      throw new Error('Información de usuario no encontrada en refresh token');
    }

    // Generate new token pair
    const newRefreshToken = this.tokenService.generateRefreshToken();
    
    // Revoke old refresh token (token rotation)
    await this.refreshTokenRepository.revokeToken(tokenHash);

    // Create new refresh token record
    await this.refreshTokenRepository.create({
      userId: storedToken.userId,
      tokenHash: newRefreshToken.hash,
      expiresAt: newRefreshToken.expiresAt,
      revokedAt: null,
      lastUsedAt: new Date(),
      ipAddress: ipAddress || storedToken.ipAddress,
      userAgent: userAgent || storedToken.userAgent,
      isActive: true,
      userInfo: userInfo
    });

    // Generate new access token
    const accessToken = this.tokenService.generateAccessToken({
      userId: userInfo.id,
      empresaId: userInfo.empresaId,
      roles: userInfo.roles
    });

    // Return response
    return {
      accessToken,
      refreshToken: newRefreshToken.token,
      expiresIn: this.tokenService.getAccessTokenExpiration(),
      user: {
        id: userInfo.id,
        email: userInfo.email,
        roles: userInfo.roles,
        tenant: userInfo.tenant
      }
    };
  }
}
