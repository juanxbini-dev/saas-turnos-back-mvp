import { Health } from '../../domain/entities/Health';

export class GetHealthUseCase {
  async execute(): Promise<Health> {
    return {
      status: 'ok',
      message: 'Backend running'
    };
  }
}
