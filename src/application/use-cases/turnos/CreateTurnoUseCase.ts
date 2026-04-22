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

    // Buscar servicio antes de validar para conocer la duración y validar el rango completo
    const servicioParaValidar = await this.usuarioServicioRepository.findByUsuarioAndServicio(usuarioId, data.servicio_id);
    const duracionParaValidar = servicioParaValidar
      ? (servicioParaValidar.duracion_personalizada || servicioParaValidar.duracion_minutos || 0)
      : 0;

    if (isAdmin) {
      // Admin: solo verificar solapamiento con turnos existentes, sin restricción de horario configurado.
      // El frontend ya actúa como primera barrera para slots futuros fuera del horario.
      const [horaH, horaM] = data.hora.split(':').map(Number);
      const inicioMinutos = horaH * 60 + horaM;
      const finMinutos = inicioMinutos + (duracionParaValidar || 60);
      const turnosActivos = turnosExistentes.filter(t => t.estado !== 'cancelado');
      const hayConflicto = turnosActivos.some(t => {
        const [tH, tM] = t.hora.split(':').map(Number);
        const tInicio = tH * 60 + tM;
        const tFin = tInicio + (t.duracion_minutos || 60);
        return inicioMinutos < tFin && finMinutos > tInicio;
      });
      if (hayConflicto) {
        throw Object.assign(new Error('Ya existe un turno en ese horario'), { statusCode: 400 });
      }
    } else {
      const slotDisponible = this.disponibilidadService.validarSlotDisponible(
        disponibilidades,
        excepciones,
        turnosExistentes,
        vacaciones,
        data.fecha,
        data.hora,
        bloqueosSlots,
        duracionParaValidar
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
    }

    // Reutilizar el servicio ya buscado para el snapshot del turno
    turnoLogger.debug('Buscando servicio', { usuarioId, servicioId: data.servicio_id });
    const servicio = servicioParaValidar;

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
    turnoLogger.info('Turno creado y confirmado', { turnoId: turno.id });

    return turno;
  }
}
