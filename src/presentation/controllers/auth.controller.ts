import { Request, Response } from 'express';
import { LoginUseCase, LoginRequest } from '../../application/use-cases/LoginUseCase';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { PostgresRefreshTokenRepository } from '../../infrastructure/repositories/PostgresRefreshTokenRepository';
import { PasswordService } from '../../infrastructure/security/password.service';
import { TokenService } from '../../infrastructure/security/token.service';

export class AuthController {
  private loginUseCase: LoginUseCase;

  constructor() {
    const userRepository = new PostgresUserRepository();
    const refreshTokenRepository = new PostgresRefreshTokenRepository();
    const passwordService = new PasswordService();
    
    this.loginUseCase = new LoginUseCase(
      userRepository,
      refreshTokenRepository,
      passwordService,
      TokenService
    );
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as LoginRequest;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email y password son requeridos'
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      console.log('🔍 [Backend] LoginUseCase execute - Input:', { email, ipAddress, userAgent });
      const result = await this.loginUseCase.execute(
        { email, password },
        ipAddress,
        userAgent
      );
      console.log('🔍 [Backend] LoginUseCase result:', {
        hasAccessToken: !!result.accessToken,
        hasRefreshToken: !!result.refreshToken,
        hasUser: !!result.user,
        expiresIn: result.expiresIn
      });

      // Set refresh token in HttpOnly cookie
      console.log('🔍 [Backend] Setting refresh token cookie:', {
        tokenLength: result.refreshToken.length,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      console.log('🔍 [Backend] Preparando response body:', {
        includesAccessToken: !!result.accessToken,
        includesRefreshToken: !!result.refreshToken, // ← ESTO ES EL PROBLEMA
        includesUser: !!result.user,
        expiresIn: result.expiresIn
      });

      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken, // ← AGREGADO
          expiresIn: result.expiresIn,
          user: result.user
        }
      });
      
      console.log('✅ [Backend] Login response enviado con refresh token en body');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de autenticación';
      
      res.status(401).json({
        success: false,
        message
      });
    }
  }
}
