import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';

export interface CancelarTurnoPublicRequest {
  turno_id: string;
  email?: string;
  telefono?: string;
  empresa_id: string;
}

export interface CancelarTurnoPublicResponse {
  id: string;
  fecha: string;
  hora: string;
  servicio: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string | null;
  profesional_nombre: string;
  profesional_id: string;
}

const LIMITE_HORAS_CANCELACION = 24;

export class CancelarTurnoPublicUseCase {
  constructor(
    private clienteRepository: IClienteRepository,
    private turnoRepository: ITurnoRepository
  ) {}

  async execute(request: CancelarTurnoPublicRequest): Promise<CancelarTurnoPublicResponse> {
    const { turno_id, email, telefono, empresa_id } = request;

    if (!telefono && !email) {
      throw Object.assign(new Error('Se requiere teléfono o email para cancelar'), { statusCode: 400 });
    }

    // Verificar identidad del cliente (prioridad teléfono)
    let cliente = null;
    if (telefono) {
      cliente = await this.clienteRepository.findByTelefono(telefono, empresa_id);
    }
    if (!cliente && email) {
      cliente = await this.clienteRepository.findByEmail(email, empresa_id);
    }
    if (!cliente) {
      throw Object.assign(new Error('No se encontró un cliente con esos datos'), { statusCode: 404 });
    }

    // Buscar el turno
    const turno = await this.turnoRepository.findById(turno_id);
    if (!turno) {
      throw Object.assign(new Error('Turno no encontrado'), { statusCode: 404 });
    }

    // Verificar que el turno pertenece al cliente
    if (turno.cliente_id !== cliente.id) {
      throw Object.assign(new Error('No tenés permiso para cancelar este turno'), { statusCode: 403 });
    }

    // Verificar que el turno es cancelable
    if (!['pendiente', 'confirmado'].includes(turno.estado)) {
      throw Object.assign(new Error('Este turno no puede cancelarse'), { statusCode: 409 });
    }

    // Verificar restricción de 24 horas
    const fechaStr = typeof turno.fecha === 'string' ? turno.fecha.slice(0, 10) : (turno.fecha as any).toISOString().slice(0, 10);
    const horaStr = typeof turno.hora === 'string' ? turno.hora.slice(0, 5) : turno.hora;
    const turnoDateTime = new Date(`${fechaStr}T${horaStr}:00-03:00`); // Argentina UTC-3
    const ahora = new Date();
    const diffHoras = (turnoDateTime.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    if (diffHoras <= LIMITE_HORAS_CANCELACION) {
      throw Object.assign(
        new Error('El turno alcanzó el límite de 24hs para ser cancelado online'),
        {
          statusCode: 403,
          code: 'LIMITE_CANCELACION',
          profesional_nombre: (turno as any).usuario_nombre || 'el profesional'
        }
      );
    }

    // Cancelar el turno
    await this.turnoRepository.updateEstado(turno_id, 'cancelado');

    return {
      id: turno.id,
      fecha: fechaStr,
      hora: horaStr,
      servicio: turno.servicio,
      cliente_nombre: cliente.nombre,
      cliente_email: cliente.email,
      cliente_telefono: cliente.telefono ?? null,
      profesional_nombre: (turno as any).usuario_nombre || '',
      profesional_id: turno.usuario_id
    };
  }
}
