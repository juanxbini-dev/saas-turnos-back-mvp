import { Request, Response } from 'express';
import { RefreshUseCase, RefreshRequest } from '../../application/use-cases/RefreshUseCase';
import { PostgresRefreshTokenRepository } from '../../infrastructure/repositories/PostgresRefreshTokenRepository';
import { TokenService } from '../../infrastructure/security/token.service';
import { CryptoService } from '../../infrastructure/security/crypto.service';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';

export class RefreshController {
  private refreshUseCase: RefreshUseCase;

  constructor() {
    const refreshTokenRepository = new PostgresRefreshTokenRepository();
    const userRepository = new PostgresUserRepository();
    const cryptoService = new CryptoService();
    this.refreshUseCase = new RefreshUseCase(refreshTokenRepository, userRepository, TokenService, cryptoService);
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      // Intentar obtener refresh token de la cookie primero
      let refreshToken = req.cookies?.refreshToken;
      
      // Si no hay en cookie, intentar del body (para compatibilidad)
      if (!refreshToken) {
        const { refreshToken: bodyRefreshToken } = req.body as RefreshRequest;
        refreshToken = bodyRefreshToken;
      }

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token es requerido'
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await this.refreshUseCase.execute(
        { refreshToken },
        ipAddress,
        userAgent
      );

      // Set new refresh token in HttpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken, // También devolver en response para compatibilidad
          expiresIn: result.expiresIn,
          user: result.user
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al refrescar token';
      
      res.status(401).json({
        success: false,
        message
      });
    }
  }
}
