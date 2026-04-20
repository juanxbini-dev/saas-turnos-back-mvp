import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';

export interface GetClienteTurnosPublicRequest {
  email?: string;
  telefono?: string;
  profesional_id: string;
  empresa_id: string;
}

export interface TurnoPublicInfo {
  id: string;
  fecha: string;
  hora: string;
  estado: string;
  servicio: string;
  profesional_nombre: string;
}

export interface GetClienteTurnosPublicResponse {
  cliente: { id: string; nombre: string; email: string; telefono?: string } | null;
  turnos: TurnoPublicInfo[];
}

export class GetClienteTurnosPublicUseCase {
  constructor(
    private clienteRepository: IClienteRepository,
    private turnoRepository: ITurnoRepository
  ) {}

  async execute(request: GetClienteTurnosPublicRequest): Promise<GetClienteTurnosPublicResponse> {
    const { email, telefono, profesional_id, empresa_id } = request;

    if (!telefono && !email) {
      return { cliente: null, turnos: [] };
    }

    // Prioridad: teléfono primero, luego email
    let cliente = null;
    if (telefono) {
      cliente = await this.clienteRepository.findByTelefono(telefono, empresa_id);
    }
    if (!cliente && email) {
      cliente = await this.clienteRepository.findByEmail(email, empresa_id);
    }

    if (!cliente) {
      return { cliente: null, turnos: [] };
    }

    const turnosRaw = await this.turnoRepository.findByClienteAndProfesional(cliente.id, profesional_id);

    const turnos: TurnoPublicInfo[] = turnosRaw.map(t => ({
      id: t.id,
      fecha: typeof t.fecha === 'string' ? t.fecha.slice(0, 10) : (t.fecha as any).toISOString().slice(0, 10),
      hora: typeof t.hora === 'string' ? t.hora.slice(0, 5) : t.hora,
      estado: t.estado,
      servicio: t.servicio,
      profesional_nombre: (t as any).usuario_nombre || ''
    }));

    return {
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        ...(cliente.telefono ? { telefono: cliente.telefono } : {})
      },
      turnos
    };
  }
}
