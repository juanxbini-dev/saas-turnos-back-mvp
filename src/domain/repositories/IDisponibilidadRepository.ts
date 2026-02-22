import { 
  DisponibilidadSemanal, 
  DiasVacacion, 
  ExcepcionDia,
  CreateDisponibilidadData,
  UpdateDisponibilidadData,
  CreateVacacionData,
  UpdateVacacionData,
  CreateExcepcionData,
  UpdateExcepcionData
} from '../entities/Disponibilidad';

export { 
  CreateDisponibilidadData,
  UpdateDisponibilidadData,
  CreateVacacionData,
  UpdateVacacionData,
  CreateExcepcionData,
  UpdateExcepcionData
};

export interface IDisponibilidadRepository {
  // Disponibilidad semanal
  findDisponibilidadByProfesional(profesionalId: string): Promise<DisponibilidadSemanal[]>;
  createDisponibilidad(data: CreateDisponibilidadData): Promise<DisponibilidadSemanal>;
  updateDisponibilidad(id: string, data: UpdateDisponibilidadData): Promise<DisponibilidadSemanal>;
  deleteDisponibilidad(id: string): Promise<void>;

  // Vacaciones
  findVacacionesByProfesional(profesionalId: string): Promise<DiasVacacion[]>;
  createVacacion(data: CreateVacacionData): Promise<DiasVacacion>;
  updateVacacion(id: string, data: UpdateVacacionData): Promise<DiasVacacion>;
  deleteVacacion(id: string): Promise<void>;

  // Excepciones
  findExcepcionesByProfesional(profesionalId: string): Promise<ExcepcionDia[]>;
  createExcepcion(data: CreateExcepcionData): Promise<ExcepcionDia>;
  updateExcepcion(id: string, data: UpdateExcepcionData): Promise<ExcepcionDia>;
  deleteExcepcion(id: string): Promise<void>;
}
