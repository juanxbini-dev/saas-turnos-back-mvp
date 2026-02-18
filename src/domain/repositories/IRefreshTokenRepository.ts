import { RefreshToken } from '../entities/RefreshToken';

export interface IRefreshTokenRepository {
  create(refreshToken: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken[]>;
  revokeToken(tokenHash: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
  updateLastUsed(tokenId: string, ipAddress?: string, userAgent?: string): Promise<void>;
  cleanupExpired(): Promise<number>;
}
