import { BloqueoSlot, CreateBloqueoSlotData } from '../entities/BloqueoSlot';

export interface IBloqueoSlotRepository {
  findByProfesionalAndFecha(profesionalId: string, fecha: string): Promise<BloqueoSlot[]>;
  findByProfesionalAndRango(profesionalId: string, fechaInicio: string, fechaFin: string): Promise<BloqueoSlot[]>;
  create(data: CreateBloqueoSlotData): Promise<BloqueoSlot>;
  delete(id: string, profesionalId: string | null): Promise<void>;
}
