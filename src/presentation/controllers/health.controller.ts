import { Request, Response } from 'express';
import { GetHealthUseCase } from '../../application/use-cases/GetHealthUseCase';

export class HealthController {
  constructor(private getHealthUseCase: GetHealthUseCase) {}

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.getHealthUseCase.execute();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
