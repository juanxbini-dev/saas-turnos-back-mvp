import { Request, Response } from 'express';
import { GetEmpresaPublicaUseCase } from '../../../application/use-cases/public/GetEmpresaPublicaUseCase';
import { PostgresEmpresaRepository } from '../../../infrastructure/repositories/PostgresEmpresaRepository';

export class EmpresaPublicController {
  private getEmpresaPublicaUseCase: GetEmpresaPublicaUseCase;

  constructor() {
    const empresaRepository = new PostgresEmpresaRepository();
    this.getEmpresaPublicaUseCase = new GetEmpresaPublicaUseCase(empresaRepository);
  }

  getEmpresa = async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      console.log('🔍 Buscando empresa con dominio:', slug);

      if (!slug) {
        return res.status(400).json({
          success: false,
          message: 'Slug de empresa es requerido'
        });
      }

      const empresa = await this.getEmpresaPublicaUseCase.execute({ dominio: slug as string });

      console.log('📤 Controller - Empresa devuelta:', empresa);

      res.status(200).json({
        success: true,
        data: empresa
      });
    } catch (error: any) {
      console.error('Error al obtener empresa pública:', error);
      
      if (error.message === 'Empresa no encontrada') {
        return res.status(404).json({
          success: false,
          message: 'Empresa no encontrada'
        });
      }

      if (error.message === 'Empresa no está activa') {
        return res.status(403).json({
          success: false,
          message: 'Empresa no está activa'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
      return;
    }
  };
}
