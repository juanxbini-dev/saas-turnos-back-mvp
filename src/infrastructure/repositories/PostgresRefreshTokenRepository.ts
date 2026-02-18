import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { RefreshToken } from '../../domain/entities/RefreshToken';
import { pool } from '../database/postgres.connection';

export class PostgresRefreshTokenRepository implements IRefreshTokenRepository {
  async create(refreshToken: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
    const query = `
      INSERT INTO refresh_tokens (
        user_id, token_hash, expires_at, revoked_at, last_used_at, 
        ip_address, user_agent, is_active, user_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `;

    const values = [
      refreshToken.userId,
      refreshToken.tokenHash,
      refreshToken.expiresAt,
      refreshToken.revokedAt,
      refreshToken.lastUsedAt,
      refreshToken.ipAddress,
      refreshToken.userAgent,
      refreshToken.isActive,
      JSON.stringify(refreshToken.userInfo)
    ];

    try {
      const result = await pool.query(query, values);
      const row = result.rows[0];

      return {
        id: row.id,
        userId: refreshToken.userId,
        tokenHash: refreshToken.tokenHash,
        expiresAt: refreshToken.expiresAt,
        createdAt: row.created_at,
        revokedAt: refreshToken.revokedAt,
        lastUsedAt: refreshToken.lastUsedAt,
        ipAddress: refreshToken.ipAddress,
        userAgent: refreshToken.userAgent,
        isActive: refreshToken.isActive,
        userInfo: refreshToken.userInfo
      };
    } catch (error) {
      console.error('Error creating refresh token:', error);
      throw error;
    }
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const query = `
      SELECT id, user_id, token_hash, expires_at, created_at, revoked_at, 
             last_used_at, ip_address, user_agent, is_active, user_info
      FROM refresh_tokens
      WHERE token_hash = $1 AND is_active = true
    `;

    try {
      const result = await pool.query(query, [tokenHash]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        userId: row.user_id,
        tokenHash: row.token_hash,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        revokedAt: row.revoked_at,
        lastUsedAt: row.last_used_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        isActive: row.is_active,
        userInfo: row.user_info ? (typeof row.user_info === 'string' ? JSON.parse(row.user_info) : row.user_info) : null
      };
    } catch (error) {
      console.error('Error finding refresh token by hash:', error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    const query = `
      SELECT id, user_id, token_hash, expires_at, created_at, revoked_at, 
             last_used_at, ip_address, user_agent, is_active, user_info
      FROM refresh_tokens
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;

    try {
      const result = await pool.query(query, [userId]);
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        tokenHash: row.token_hash,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        revokedAt: row.revoked_at,
        lastUsedAt: row.last_used_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        isActive: row.is_active,
        userInfo: row.user_info ? (typeof row.user_info === 'string' ? JSON.parse(row.user_info) : row.user_info) : null
      }));
    } catch (error) {
      console.error('Error finding refresh tokens by user:', error);
      throw error;
    }
  }

  async revokeToken(tokenHash: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens 
      SET revoked_at = NOW(), is_active = false 
      WHERE token_hash = $1
    `;

    try {
      await pool.query(query, [tokenHash]);
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      throw error;
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens 
      SET revoked_at = NOW(), is_active = false 
      WHERE user_id = $1 AND is_active = true
    `;

    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error revoking all user refresh tokens:', error);
      throw error;
    }
  }

  async updateLastUsed(tokenId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens 
      SET last_used_at = NOW(), 
          ip_address = COALESCE($2, ip_address),
          user_agent = COALESCE($3, user_agent)
      WHERE id = $1
    `;

    const values = [tokenId, ipAddress, userAgent];

    try {
      await pool.query(query, values);
    } catch (error) {
      console.error('Error updating last used:', error);
      throw error;
    }
  }

  async cleanupExpired(): Promise<number> {
    const query = `
      DELETE FROM refresh_tokens 
      WHERE expires_at < NOW() 
         OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days')
    `;

    try {
      const result = await pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }
}
