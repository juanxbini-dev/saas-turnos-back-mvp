import { ComisionTurno, CreateComisionData } from '../entities/Comision';

export interface IComisionRepository {
  create(data: CreateComisionData): Promise<ComisionTurno>;
  findByTurno(turnoId: string): Promise<ComisionTurno | null>;
  findByProfesional(profesionalId: string): Promise<ComisionTurno[]>;
  findByEmpresa(empresaId: string): Promise<ComisionTurno[]>;
  updateEstado(id: string, estado: 'pendiente' | 'pagada' | 'cancelada'): Promise<ComisionTurno>;
  updateByTurno(turnoId: string, data: Partial<CreateComisionData>): Promise<ComisionTurno>;
}
