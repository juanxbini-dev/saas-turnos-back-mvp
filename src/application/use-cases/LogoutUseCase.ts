import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { CryptoService } from '../../infrastructure/security/crypto.service';

export interface LogoutRequest {
  refreshToken?: string;
  userId?: string;
}

export class LogoutUseCase {
  constructor(
    private refreshTokenRepository: IRefreshTokenRepository
  ) {}

  async execute(request: LogoutRequest): Promise<void> {
    if (request.refreshToken) {
      // Logout by refresh token (specific session)
      const tokenHash = CryptoService.hashToken(request.refreshToken);
      await this.refreshTokenRepository.revokeToken(tokenHash);
    } else if (request.userId) {
      // Logout by user ID (all sessions)
      await this.refreshTokenRepository.revokeAllUserTokens(request.userId);
    } else {
      throw new Error('Se requiere refresh token o userId para logout');
    }
  }
}
