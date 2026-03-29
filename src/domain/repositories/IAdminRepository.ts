import { Empresa } from '../entities/Empresa';
import { UsuarioPublico } from '../entities/User';

export interface EmpresaConStats extends Empresa {
  total_usuarios: number;
  total_turnos: number;
  total_clientes: number;
}

export interface EmpresaDetalle extends EmpresaConStats {
  usuarios: UsuarioPublico[];
}

export interface GlobalStats {
  total_empresas: number;
  empresas_activas: number;
  total_usuarios: number;
  total_turnos: number;
  total_clientes: number;
}

export interface IAdminRepository {
  getEmpresas(): Promise<EmpresaConStats[]>;
  getEmpresaDetalle(empresaId: string): Promise<EmpresaDetalle | null>;
  toggleEmpresaActivo(empresaId: string): Promise<Empresa>;
  getGlobalStats(): Promise<GlobalStats>;
}
