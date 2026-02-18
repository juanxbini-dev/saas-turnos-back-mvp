export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean;
  userInfo: {
    id: string;
    email: string;
    roles: string[];
    tenant: string;
    empresaId: string;
  } | null;
}
