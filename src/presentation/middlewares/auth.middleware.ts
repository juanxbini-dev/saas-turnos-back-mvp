import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../../infrastructure/security/token.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  empresaId: string;
  tenant: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = TokenService.verifyAccessToken(token);

    // Obtener datos del usuario desde la base de datos para tener email y tenant
    // Por ahora, usamos los datos del token (necesitaríamos inyectar un repositorio)
    req.user = {
      id: payload.userId,
      email: '', // Se debería obtener de la base de datos
      roles: payload.roles,
      empresaId: payload.empresaId,
      tenant: '', // Se debería obtener del JOIN con empresas
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' });
    return;
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'No autenticado' });
    return;
  }

  if (!req.user.roles.includes('admin')) {
    res.status(403).json({ message: 'Se requiere rol de administrador' });
    return;
  }

  next();
};
