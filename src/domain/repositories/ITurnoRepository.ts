import { Turno, TurnoConDetalle, CreateTurnoData, FinalizarTurnoData } from '../entities/Turno';

export { CreateTurnoData };

export interface ITurnoRepository {
  findById(id: string): Promise<TurnoConDetalle | null>;
  findByEmpresa(empresaId: string): Promise<TurnoConDetalle[]>;
  findByProfesional(profesionalId: string): Promise<TurnoConDetalle[]>;
  findByFechaYProfesional(profesionalId: string, fecha: string): Promise<Turno[]>;
  findByProfesionalEnRango(
    profesionalId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<TurnoConDetalle[]>;
  create(data: CreateTurnoData): Promise<Turno>;
  updateEstado(id: string, estado: 'pendiente' | 'confirmado' | 'completado' | 'cancelado'): Promise<Turno>;
  finalizar(id: string, data: Partial<FinalizarTurnoData>): Promise<Turno>;
  marcarWhatsappEnviado(id: string): Promise<void>;
  completarVencidos(): Promise<number>;
}
