import { createHash, randomBytes } from 'crypto';

export class CryptoService {
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  static generateUUID(): string {
    return randomBytes(16).toString('hex');
  }

  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
