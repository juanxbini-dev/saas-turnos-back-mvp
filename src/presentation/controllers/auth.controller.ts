import { Request, Response } from 'express';
import { LoginUseCase, LoginRequest } from '../../application/use-cases/LoginUseCase';

export class AuthController {
  constructor(private loginUseCase: LoginUseCase) {}

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

      const result = await this.loginUseCase.execute({ email, password });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de autenticación';
      
      res.status(401).json({
        success: false,
        message
      });
    }
  }
}
