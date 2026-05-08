import { IVentaProductoRepository } from '../../../domain/repositories/IVentaProductoRepository';

export class DeleteVentaProductoUseCase {
  constructor(private repo: IVentaProductoRepository) {}

  async execute(id: string, empresaId: string): Promise<void> {
    await this.repo.deleteById(id, empresaId);
  }
}
