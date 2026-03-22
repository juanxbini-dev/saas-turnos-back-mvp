import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { IUsuarioServicioRepository } from '../../../domain/repositories/IUsuarioServicioRepository';
import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';
import { CryptoService } from '../../../infrastructure/security/crypto.service';
import { CreateTurnoData, Turno } from '../../../domain/entities/Turno';
import { createLogger } from '../../../utils/logger';

const turnoLogger = createLogger('CreateTurnoUseCase');

export class CreateTurnoUseCase {
  constructor(
    private turnoRepository: ITurnoRepository,
    private disponibilidadRepository: IDisponibilidadRepository,
    private usuarioServicioRepository: IUsuarioServicioRepository,
    private disponibilidadService: DisponibilidadService,
    private cryptoService: CryptoService,
    private bloqueoSlotRepository: IBloqueoSlotRepository
  ) {}

  async execute(
    data: Omit<CreateTurnoData, 'id' | 'servicio' | 'precio' | 'duracion_minutos'>,
    usuarioAutenticadoId: string,
    isAdmin: boolean
  ): Promise<Turno> {
    turnoLogger.debug('INICIO - Creación de turno', { 
      usuarioId: data.usuario_id, 
      servicioId: data.servicio_id, 
      fecha: data.fecha,
      hora: data.hora,
      isAdmin,
      usuarioAutenticadoId
    });

    // Si no es admin, forzar usuario_id = usuarioAutenticadoId
    const usuarioId = isAdmin ? data.usuario_id : usuarioAutenticadoId;
    turnoLogger.debug('UsuarioId final', { usuarioId, isAdmin });

    // Validar slot con DisponibilidadService.validarSlotDisponible
    turnoLogger.debug('Validando disponibilidad');
    const [disponibilidades, vacaciones, excepciones, turnosExistentes, bloqueosSlots] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(usuarioId),
      this.disponibilidadRepository.findVacacionesByProfesional(usuarioId),
      this.disponibilidadRepository.findExcepcionesByProfesional(usuarioId),
      this.turnoRepository.findByFechaYProfesional(usuarioId, data.fecha),
      this.bloqueoSlotRepository.findByProfesionalAndFecha(usuarioId, data.fecha)
    ]);

    turnoLogger.debug('Datos de disponibilidad cargados', {
      disponibilidades: disponibilidades.length,
      vacaciones: vacaciones.length,
      excepciones: excepciones.length,
      turnosExistentes: turnosExistentes.length
    });

    const slotDisponible = this.disponibilidadService.validarSlotDisponible(
      disponibilidades,
      excepciones,
      turnosExistentes,
      vacaciones,
      data.fecha,
      data.hora,
      bloqueosSlots
    );

    turnoLogger.debug('Resultado validación slot', { 
      slotDisponible, 
      fecha: data.fecha, 
      hora: data.hora 
    });

    if (!slotDisponible) {
      turnoLogger.error('Slot no disponible', undefined, { fecha: data.fecha, hora: data.hora });
      throw Object.assign(new Error('El slot no está disponible'), { statusCode: 400 });
    }

    // Buscar servicio en usuario_servicios JOIN servicios para snapshot
    turnoLogger.debug('Buscando servicio', { usuarioId, servicioId: data.servicio_id });
    const servicio = await this.usuarioServicioRepository.findByUsuarioAndServicio(usuarioId, data.servicio_id);
    
    turnoLogger.debug('Servicio encontrado', { servicioId: servicio?.id, nombre: servicio?.nombre });
    
    if (!servicio) {
      turnoLogger.error('Servicio no disponible', undefined, { usuarioId, servicioId: data.servicio_id });
      throw Object.assign(new Error('El servicio no está disponible para este profesional'), { statusCode: 400 });
    }

    const servicioNombre = servicio.nombre;
    const precio = servicio.precio_personalizado || servicio.precio || 0;
    const duracion = servicio.duracion_personalizada || servicio.duracion_minutos || 30; // valor por defecto

    turnoLogger.debug('Datos del servicio', {
      nombre: servicioNombre,
      precio,
      duracion
    });

    // Generar id con cryptoService.generateUUID()
    const id = this.cryptoService.generateUUID();

    // Crear turno con estado pendiente
    const turnoData: CreateTurnoData = {
      id,
      cliente_id: data.cliente_id,
      usuario_id: usuarioId,
      servicio_id: data.servicio_id,
      fecha: data.fecha,
      hora: data.hora,
      notas: data.notas || '',
      servicio: servicioNombre,
      precio,
      duracion_minutos: duracion,
      empresa_id: servicio.empresa_id
    };

    turnoLogger.debug('Datos del turno a crear', { 
      turnoId: id,
      clienteId: data.cliente_id,
      servicio: servicioNombre
    });

    const turno = await this.turnoRepository.create(turnoData);
    turnoLogger.info('Turno creado con estado pendiente', { turnoId: turno.id });

    // Simular envío de email con mail delivery
    turnoLogger.info('Iniciando envío de email', { 
      turnoId: id,
      fecha: data.fecha, 
      hora: data.hora
    });

    // Simular respuesta del mail delivery (async)
    setTimeout(async () => {
      try {
        // Simular mail delivery OK
        turnoLogger.info('Email enviado exitosamente', { turnoId: id });
        
        // Cuando el mail delivery confirma, actualizar estado a confirmado
        turnoLogger.debug('Actualizando estado a confirmado', { turnoId: id });
        const turnoConfirmado = await this.turnoRepository.updateEstado(id, 'confirmado');
        turnoLogger.info('Turno confirmado', { turnoId: id });
        
        // Aquí iría la lógica real del mail delivery callback
        // mailDeliveryService.onSuccess(id, () => { ... });
        
      } catch (error) {
        turnoLogger.error('Error al confirmar turno', error as Error, { turnoId: id });
        // Manejar error del mail delivery - podría quedar como pendiente o cancelarse
      }
    }, 1000); // Simular 1 segundo de delay del mail delivery

    // Devolver turno como pendiente (esperando confirmación del mail delivery)
    return turno;
  }
}
