import { Request, Response } from 'express';
import { CheckUsersUseCase } from '../../application/use-cases/CheckUsersUseCase';
import { PostgresDatabaseRepository } from '../../infrastructure/repositories/PostgresDatabaseRepository';

export class CheckController {
  private checkUsersUseCase: CheckUsersUseCase;

  constructor() {
    const databaseRepository = new PostgresDatabaseRepository();
    this.checkUsersUseCase = new CheckUsersUseCase(databaseRepository);
  }

  async checkUsers(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.checkUsersUseCase.execute();
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      
      res.status(500).json({
        success: false,
        message
      });
    }
  }
}
