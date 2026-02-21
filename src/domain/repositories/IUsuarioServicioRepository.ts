import { UsuarioServicio } from '../entities/Servicio';

export interface CreateUsuarioServicioData {
  id?: string;
  usuario_id: string;
  servicio_id: string;
  empresa_id: string;
  precio_personalizado?: number;
  duracion_personalizada?: number;
  habilitado?: boolean;
  nivel_habilidad?: string;
  notas?: string;
}

export interface UpdateUsuarioServicioData extends Partial<Omit<CreateUsuarioServicioData, 'id' | 'usuario_id' | 'servicio_id' | 'empresa_id'>> {}

export interface IUsuarioServicioRepository {
  findByUsuario(usuarioId: string): Promise<UsuarioServicio[]>;
  findByServicio(servicioId: string): Promise<UsuarioServicio[]>;
  findByUsuarioAndServicio(usuarioId: string, servicioId: string): Promise<UsuarioServicio | null>;
  create(data: CreateUsuarioServicioData): Promise<UsuarioServicio>;
  update(id: string, data: UpdateUsuarioServicioData): Promise<UsuarioServicio>;
  delete(id: string): Promise<void>;
  estaSubscripto(usuarioId: string, servicioId: string): Promise<boolean>;
}
