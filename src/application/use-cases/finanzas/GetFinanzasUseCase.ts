import { FinanzasFilters, FinanzasResponse, ComisionConDetalle } from '../../../domain/entities/Finanzas';
import { IFinanzasRepository } from '../../../domain/repositories/IFinanzasRepository';

export class GetMyFinanzasUseCase {
  constructor(private finanzasRepository: IFinanzasRepository) {}

  async execute(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<FinanzasResponse> {
    // Obtener comisiones paginadas
    const { data, total } = await this.finanzasRepository.getComisionesByProfesional(
      profesionalId,
      empresaId,
      filters
    );

    // Obtener resumen
    const summary = await this.finanzasRepository.getFinanzasSummary(
      profesionalId,
      empresaId,
      filters
    );

    // Calcular paginación
    const totalPaginas = Math.ceil(total / filters.por_pagina);

    return {
      data,
      summary,
      total,
      pagina: filters.pagina,
      por_pagina: filters.por_pagina,
      total_paginas: totalPaginas
    };
  }
}

export class GetFinanzasByProfesionalUseCase {
  constructor(private finanzasRepository: IFinanzasRepository) {}

  async execute(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<FinanzasResponse> {
    // Validar que el profesional pertenezca a la empresa
    // Esta validación se hace a nivel de repositorio con el JOIN

    // Obtener comisiones paginadas
    const comisionesResult = await this.finanzasRepository.getComisionesByProfesional(
      profesionalId,
      empresaId,
      filters
    );

    // Obtener resumen
    const summary = await this.finanzasRepository.getFinanzasSummary(
      profesionalId,
      empresaId,
      filters
    );

    // Calcular paginación
    const totalPaginas = Math.ceil(comisionesResult.total / filters.por_pagina);

    return {
      data: comisionesResult.data,
      summary,
      total: comisionesResult.total,
      pagina: filters.pagina,
      por_pagina: filters.por_pagina,
      total_paginas: totalPaginas
    };
  }
}
