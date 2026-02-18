import { Request, Response } from 'express';
import { LogoutUseCase, LogoutRequest } from '../../application/use-cases/LogoutUseCase';
import { PostgresRefreshTokenRepository } from '../../infrastructure/repositories/PostgresRefreshTokenRepository';
import { CryptoService } from '../../infrastructure/security/crypto.service';

export class LogoutController {
  private logoutUseCase: LogoutUseCase;

  constructor() {
    const refreshTokenRepository = new PostgresRefreshTokenRepository();
    this.logoutUseCase = new LogoutUseCase(refreshTokenRepository);
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      const userId = (req as any).user?.userId; // From JWT middleware

      let logoutRequest: LogoutRequest = {};

      if (refreshToken) {
        logoutRequest.refreshToken = refreshToken;
      } else if (userId) {
        logoutRequest.userId = userId;
      } else {
        res.status(400).json({
          success: false,
          message: 'Se requiere refresh token o sesión activa'
        });
        return;
      }

      await this.logoutUseCase.execute(logoutRequest);

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cerrar sesión';
      
      res.status(500).json({
        success: false,
        message
      });
    }
  }
}
