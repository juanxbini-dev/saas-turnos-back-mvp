import { Request, Response } from 'express';
import { GetLandingPublicaUseCase } from '../../../application/use-cases/configuracion/GetLandingPublicaUseCase';
import { PostgresLandingConfigRepository, PostgresLandingProfesionalRepository } from '../../../infrastructure/repositories/PostgresLandingConfigRepository';
import { pool } from '../../../infrastructure/database/postgres.connection';

export class LandingPublicController {
  private getLandingPublicaUseCase: GetLandingPublicaUseCase;

  constructor() {
    this.getLandingPublicaUseCase = new GetLandingPublicaUseCase(
      new PostgresLandingConfigRepository(),
      new PostgresLandingProfesionalRepository()
    );
  }

  getLanding = async (req: Request, res: Response): Promise<void> => {
    try {
      const { empresaSlug } = req.params;

      // Resolver slug a empresa_id
      const empresaResult = await pool.query(
        `SELECT id FROM empresas WHERE dominio = $1 AND activo = true`,
        [empresaSlug]
      );

      if (!empresaResult.rows[0]) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada' });
        return;
      }

      const empresaId = empresaResult.rows[0].id;
      const data = await this.getLandingPublicaUseCase.execute(empresaId);

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener landing' });
    }
  };
}
