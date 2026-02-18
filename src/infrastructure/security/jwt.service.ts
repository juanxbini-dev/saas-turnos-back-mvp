import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

export class JwtService {
  sign(payload: { userId: string; empresaId: string; roles: string[] }): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: '15m'
    });
  }
}
