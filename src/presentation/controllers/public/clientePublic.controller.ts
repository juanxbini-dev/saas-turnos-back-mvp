import { Request, Response } from 'express';
import { ValidateClienteUseCase } from '../../../application/use-cases/public/ValidateClienteUseCase';
import { PostgresClienteRepository } from '../../../infrastructure/repositories/PostgresClienteRepository';

export class ClientePublicController {
  private validateClienteUseCase: ValidateClienteUseCase;

  constructor() {
    const clienteRepository = new PostgresClienteRepository();
    this.validateClienteUseCase = new ValidateClienteUseCase(clienteRepository);
  }

  validateCliente = async (req: Request, res: Response) => {
    try {
      const { email, telefono, empresa_id } = req.body;


      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email es requerido'
        });
      }

      if (!empresa_id) {
        return res.status(400).json({
          success: false,
          message: 'Empresa ID es requerido'
        });
      }

      const result = await this.validateClienteUseCase.execute({ 
        email, 
        telefono: telefono || undefined,
        empresa_id
      });


      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error al validar cliente:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
      return;
    }
  };
}
