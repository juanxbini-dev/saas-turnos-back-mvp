import { ComisionProfesional, CreateComisionData } from '../entities/Comision';

export interface IComisionRepository {
  create(data: CreateComisionData): Promise<ComisionProfesional>;
  findByTurno(turnoId: string): Promise<ComisionProfesional | null>;
  findByProfesional(profesionalId: string): Promise<ComisionProfesional[]>;
  findByEmpresa(empresaId: string): Promise<ComisionProfesional[]>;
  updateEstado(id: string, estado: 'pendiente' | 'pagada' | 'cancelada'): Promise<ComisionProfesional>;
}
