import { Request, Response } from 'express';
import { TestDatabaseUseCase } from '../../application/use-cases/TestDatabaseUseCase';

export class TestController {
  constructor(private testDatabaseUseCase: TestDatabaseUseCase) {}

  async testDatabase(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.testDatabaseUseCase.execute();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Database connection failed'
      });
    }
  }
}
