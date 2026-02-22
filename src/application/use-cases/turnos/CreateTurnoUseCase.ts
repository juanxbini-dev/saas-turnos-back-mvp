import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { IUsuarioServicioRepository } from '../../../domain/repositories/IUsuarioServicioRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';
import { CryptoService } from '../../../infrastructure/security/crypto.service';
import { CreateTurnoData, Turno } from '../../../domain/entities/Turno';

export class CreateTurnoUseCase {
  constructor(
    private turnoRepository: ITurnoRepository,
    private disponibilidadRepository: IDisponibilidadRepository,
    private usuarioServicioRepository: IUsuarioServicioRepository,
    private disponibilidadService: DisponibilidadService,
    private cryptoService: CryptoService
  ) {}

  async execute(
    data: Omit<CreateTurnoData, 'id' | 'servicio' | 'precio' | 'duracion_minutos'>,
    usuarioAutenticadoId: string,
    isAdmin: boolean
  ): Promise<Turno> {
    console.log('🔍 [CreateTurnoUseCase] INICIO - Datos recibidos:', { 
      data, 
      usuarioAutenticadoId, 
      isAdmin 
    });

    // Si no es admin, forzar usuario_id = usuarioAutenticadoId
    const usuarioId = isAdmin ? data.usuario_id : usuarioAutenticadoId;
    console.log('🔍 [CreateTurnoUseCase] UsuarioId final:', usuarioId);

    // Validar slot con DisponibilidadService.validarSlotDisponible
    console.log('🔍 [CreateTurnoUseCase] Validando disponibilidad...');
    const [disponibilidades, vacaciones, excepciones, turnosExistentes] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(usuarioId),
      this.disponibilidadRepository.findVacacionesByProfesional(usuarioId),
      this.disponibilidadRepository.findExcepcionesByProfesional(usuarioId),
      this.turnoRepository.findByFechaYProfesional(usuarioId, data.fecha)
    ]);

    console.log('🔍 [CreateTurnoUseCase] Datos de disponibilidad:', {
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
      data.hora
    );

    console.log('🔍 [CreateTurnoUseCase] Resultado validación slot:', { 
      slotDisponible, 
      fecha: data.fecha, 
      hora: data.hora 
    });

    if (!slotDisponible) {
      console.error('💥 [CreateTurnoUseCase] Slot no disponible - lanzando error 400');
      throw Object.assign(new Error('El slot no está disponible'), { statusCode: 400 });
    }

    // Buscar servicio en usuario_servicios JOIN servicios para snapshot
    console.log('🔍 [CreateTurnoUseCase] Buscando servicio:', { usuarioId, servicio_id: data.servicio_id });
    const servicio = await this.usuarioServicioRepository.findByUsuarioAndServicio(usuarioId, data.servicio_id);
    
    console.log('🔍 [CreateTurnoUseCase] Servicio encontrado:', servicio);
    
    if (!servicio) {
      console.error('💥 [CreateTurnoUseCase] Servicio no disponible - lanzando error 400');
      throw Object.assign(new Error('El servicio no está disponible para este profesional'), { statusCode: 400 });
    }

    const servicioNombre = servicio.nombre;
    const precio = servicio.precio_personalizado || servicio.precio || 0;
    const duracion = servicio.duracion_personalizada || servicio.duracion_minutos || 30; // valor por defecto

    console.log('🔍 [CreateTurnoUseCase] Datos del servicio:', {
      nombre: servicioNombre,
      precio,
      duracion,
      precio_personalizado: servicio.precio_personalizado,
      precio_base: servicio.precio
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

    console.log('🔍 [CreateTurnoUseCase] Datos del turno a crear:', turnoData);

    const turno = await this.turnoRepository.create(turnoData);
    console.log('🔍 [CreateTurnoUseCase] Turno creado:', turno);

    // Simular envío de email
    console.log('📧 [MAIL]', { 
      clienteEmail: 'cliente@example.com', 
      profesionalEmail: 'profesional@example.com', 
      fecha: data.fecha, 
      hora: data.hora, 
      servicio: servicioNombre 
    });

    // Actualizar estado a confirmado
    console.log('🔍 [CreateTurnoUseCase] Actualizando estado a confirmado...');
    const turnoConfirmado = await this.turnoRepository.updateEstado(id, 'confirmado');
    console.log('🔍 [CreateTurnoUseCase] Turno confirmado:', turnoConfirmado);

    return turnoConfirmado;
  }
}
