import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { IServicioRepository } from '../../../domain/repositories/IServicioRepository';

export interface CreateTurnoPublicRequest {
  profesional_id: string;
  servicio_id: string;
  fecha: string;
  hora: string;
  cliente_data: {
    nombre: string;
    email: string;
    telefono?: string;
  };
  cliente_id?: string; // Si el cliente ya existe
  notas?: string;
}

export interface CreateTurnoPublicResponse {
  id: string;
  estado: string;
  fecha: string;
  hora: string;
  cliente_nombre: string;
  profesional_nombre: string;
  servicio_nombre: string;
}

export class CreateTurnoPublicUseCase {
  constructor(
    private turnoRepository: ITurnoRepository,
    private clienteRepository: IClienteRepository,
    private servicioRepository: IServicioRepository
  ) {}

  async execute(request: CreateTurnoPublicRequest): Promise<CreateTurnoPublicResponse> {
    const {
      profesional_id,
      servicio_id,
      fecha,
      hora,
      cliente_data,
      cliente_id,
      notas
    } = request;

    // Validar que el servicio exista y esté activo para el profesional
    const servicio = await this.servicioRepository.findById(servicio_id);
    if (!servicio) {
      throw new Error('Servicio no encontrado');
    }

    // Crear o usar cliente existente
    let finalClienteId = cliente_id;
    if (!finalClienteId) {
      // Buscar cliente existente por email
      const existingCliente = await this.clienteRepository.findByEmailOrTelefono(
        cliente_data.email, 
        servicio.empresa_id,
        cliente_data.telefono
      );
      
      if (existingCliente) {
        // Usar cliente existente
        finalClienteId = existingCliente.id;
        console.log('✅ Usando cliente existente:', existingCliente.id);
      } else {
        // Crear nuevo cliente
        const clienteData: any = {
          id: `cli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generar ID único
          nombre: cliente_data.nombre,
          email: cliente_data.email,
          empresa_id: servicio.empresa_id
        };

        // Solo agregar teléfono si existe
        if (cliente_data.telefono) {
          clienteData.telefono = cliente_data.telefono;
        }

        const newCliente = await this.clienteRepository.create(clienteData);
        finalClienteId = newCliente.id;
        console.log('✅ Cliente nuevo creado:', newCliente.id);
      }
    }

    // Validar disponibilidad (omisión temporal - se asume disponible)
    // TODO: Implementar validación de disponibilidad

    // Crear el turno
    const turnoData: any = {
      id: `tur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generar ID único
      cliente_id: finalClienteId,
      usuario_id: profesional_id,
      servicio_id,
      fecha,
      hora,
      servicio: servicio.nombre,
      precio: servicio.precio_base || 0,
      duracion_minutos: servicio.duracion || 30,
      empresa_id: servicio.empresa_id
    };

    // Solo agregar notas si existen
    if (notas) {
      turnoData.notas = notas;
    }

    const turno = await this.turnoRepository.create(turnoData);

    return {
      id: turno.id,
      estado: turno.estado,
      fecha: turno.fecha,
      hora: turno.hora,
      cliente_nombre: cliente_data.nombre,
      profesional_nombre: '', // Podríamos obtenerlo si es necesario
      servicio_nombre: servicio.nombre
    };
  }
}
