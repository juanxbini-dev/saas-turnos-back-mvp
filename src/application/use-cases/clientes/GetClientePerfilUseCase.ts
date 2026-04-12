import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { ClientePerfil, TurnoResumen } from '../../../domain/entities/Cliente';


export class GetClientePerfilUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(clienteId: string, empresaId: string): Promise<ClientePerfil> {
    const cliente = await this.clienteRepository.findById(clienteId);

    if (!cliente) {
      const error: any = new Error('Cliente no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (cliente.empresa_id !== empresaId) {
      const error: any = new Error('No tenés permisos para ver este cliente');
      error.statusCode = 403;
      throw error;
    }

    const [turnos, productos] = await Promise.all([
      this.clienteRepository.getClienteTurnos(clienteId, empresaId),
      this.clienteRepository.getClienteProductos(clienteId, empresaId)
    ]);

    const hoy = new Date().toISOString().split('T')[0];

    const total_turnos = turnos.filter(t => t.estado !== 'cancelado').length;

    const total_gastado_turnos = turnos
      .filter(t => t.estado === 'completado' && t.total_final != null)
      .reduce((sum, t) => sum + Number(t.total_final), 0);

    const total_gastado_productos = productos
      .reduce((sum, p) => sum + Number(p.precio_total), 0);

    const total_gastado = total_gastado_turnos + total_gastado_productos;

    const proximo_turno: TurnoResumen | null = turnos
      .filter(t => t.fecha >= hoy && (t.estado === 'pendiente' || t.estado === 'confirmado'))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))[0] ?? null;

    const ultimo_turno: TurnoResumen | null = turnos
      .filter(t => t.fecha < hoy && t.estado === 'completado')
      [0] ?? null;

    return {
      cliente,
      stats: {
        total_turnos,
        total_gastado,
        proximo_turno,
        ultimo_turno
      },
      turnos_recientes: turnos.slice(0, 10),
      productos_comprados: productos
    };
  }
}
