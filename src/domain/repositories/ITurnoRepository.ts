import { Turno, TurnoConDetalle, CreateTurnoData } from '../entities/Turno';

export { CreateTurnoData };

export interface ITurnoRepository {
  findByEmpresa(empresaId: string): Promise<TurnoConDetalle[]>;
  findByProfesional(profesionalId: string): Promise<TurnoConDetalle[]>;
  findByFechaYProfesional(profesionalId: string, fecha: string): Promise<Turno[]>;
  create(data: CreateTurnoData): Promise<Turno>;
  updateEstado(id: string, estado: 'pendiente' | 'confirmado' | 'completado' | 'cancelado'): Promise<Turno>;
  completarVencidos(): Promise<number>;
}
