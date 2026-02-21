import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { CryptoService } from './crypto.service';

export interface TokenPayload {
  userId: string;
  empresaId: string;
  roles: string[];
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class TokenService {
  private static readonly ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days
  private static cryptoService = new CryptoService();

  static generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
    const tokenPayload: TokenPayload = {
      ...payload,
      type: 'access'
    };

    return jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: 'turnos-api',
      audience: 'turnos-client'
    });
  }

  static generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
    const token = this.cryptoService.generateSecureToken(64);
    const hash = this.cryptoService.hashToken(token);
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN * 1000);

    return { token, hash, expiresAt };
  }

  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: 'turnos-api',
        audience: 'turnos-client'
      }) as TokenPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  static getAccessTokenExpiration(): number {
    return this.ACCESS_TOKEN_EXPIRES_IN;
  }

  static getRefreshTokenExpiration(): number {
    return this.REFRESH_TOKEN_EXPIRES_IN;
  }
}
