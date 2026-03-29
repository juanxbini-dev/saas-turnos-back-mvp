import { FinanzasFilters, FinanzasResponse } from '../../../domain/entities/Finanzas';
import { IFinanzasRepository } from '../../../domain/repositories/IFinanzasRepository';

async function buildFinanzasResponse(
  finanzasRepository: IFinanzasRepository,
  profesionalId: string,
  empresaId: string,
  filters: FinanzasFilters
): Promise<FinanzasResponse> {
  const [{ items, total }, summary] = await Promise.all([
    finanzasRepository.getEntradasPaginadas(profesionalId, empresaId, filters),
    finanzasRepository.getFinanzasSummary(profesionalId, empresaId, filters),
  ]);

  return {
    items,
    summary,
    total,
    pagina: filters.pagina,
    por_pagina: filters.por_pagina,
    total_paginas: Math.ceil(total / filters.por_pagina),
  };
}

export class GetMyFinanzasUseCase {
  constructor(private finanzasRepository: IFinanzasRepository) {}

  async execute(profesionalId: string, empresaId: string, filters: FinanzasFilters): Promise<FinanzasResponse> {
    return buildFinanzasResponse(this.finanzasRepository, profesionalId, empresaId, filters);
  }
}

export class GetFinanzasByProfesionalUseCase {
  constructor(private finanzasRepository: IFinanzasRepository) {}

  async execute(profesionalId: string, empresaId: string, filters: FinanzasFilters): Promise<FinanzasResponse> {
    return buildFinanzasResponse(this.finanzasRepository, profesionalId, empresaId, filters);
  }
}
