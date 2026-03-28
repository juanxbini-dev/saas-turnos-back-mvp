import { LandingConfig, LandingProfesional } from '../entities/LandingConfig';

export interface UpdateLandingConfigData {
  titulo?: string;
  descripcion?: string;
  direccion?: string;
  direccion_maps?: string;
  horarios_texto?: string;
}

export interface ILandingConfigRepository {
  findByEmpresa(empresaId: string): Promise<LandingConfig | null>;
  upsert(empresaId: string): Promise<LandingConfig>;
  update(empresaId: string, data: UpdateLandingConfigData): Promise<LandingConfig>;
  updateLogo(empresaId: string, logoUrl: string | null, logoPublicId: string | null): Promise<LandingConfig>;
  updateFondo(empresaId: string, fondoUrl: string | null, fondoPublicId: string | null): Promise<LandingConfig>;
}

export interface ILandingProfesionalRepository {
  findAllByEmpresa(empresaId: string): Promise<LandingProfesional[]>;
  upsert(empresaId: string, usuarioId: string): Promise<LandingProfesional>;
  update(empresaId: string, usuarioId: string, data: { subtitulo?: string; descripcion?: string; visible?: boolean }): Promise<LandingProfesional>;
  updateOrden(empresaId: string, orden: { usuarioId: string; orden: number }[]): Promise<void>;
  findVisiblesByEmpresa(empresaId: string): Promise<LandingProfesional[]>;
}
