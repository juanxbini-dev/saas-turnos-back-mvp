import { IEmpresaRepository } from '../../../domain/repositories/IEmpresaRepository';

export interface GetEmpresaPublicaRequest {
  dominio: string;
}

export interface GetEmpresaPublicaResponse {
  id: string;
  nombre: string;
  dominio: string;
  activo: boolean;
}

export class GetEmpresaPublicaUseCase {
  constructor(private empresaRepository: IEmpresaRepository) {}

  async execute(request: GetEmpresaPublicaRequest): Promise<GetEmpresaPublicaResponse> {
    const { dominio } = request;
    console.log('🔍 Use Case - Buscando empresa con dominio:', dominio);

    // Buscar empresa por dominio
    const empresa = await this.empresaRepository.findByDominio(dominio);
    console.log('📋 Empresa encontrada:', empresa ? 'SÍ' : 'NO');

    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    if (!empresa.activo) {
      throw new Error('Empresa no está activa');
    }

    console.log('✅ Empresa encontrada - ID:', empresa.id, 'Nombre:', empresa.nombre);

    return {
      id: empresa.id,
      nombre: empresa.nombre,
      dominio: empresa.dominio,
      activo: empresa.activo
    };
  }
}
