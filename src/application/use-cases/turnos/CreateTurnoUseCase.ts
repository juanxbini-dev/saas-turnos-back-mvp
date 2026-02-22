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
    // Si no es admin, forzar usuario_id = usuarioAutenticadoId
    const usuarioId = isAdmin ? data.usuario_id : usuarioAutenticadoId;

    // Validar slot con DisponibilidadService.validarSlotDisponible
    const [disponibilidades, vacaciones, excepciones, turnosExistentes] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(usuarioId),
      this.disponibilidadRepository.findVacacionesByProfesional(usuarioId),
      this.disponibilidadRepository.findExcepcionesByProfesional(usuarioId),
      this.turnoRepository.findByFechaYProfesional(usuarioId, data.fecha)
    ]);

    const slotDisponible = this.disponibilidadService.validarSlotDisponible(
      disponibilidades,
      excepciones,
      turnosExistentes,
      vacaciones,
      data.fecha,
      data.hora
    );

    if (!slotDisponible) {
      throw Object.assign(new Error('El slot no está disponible'), { statusCode: 400 });
    }

    // Buscar servicio en usuario_servicios JOIN servicios para snapshot
    const servicioQuery = `
      SELECT s.nombre, s.precio, s.duracion_minutos, us.precio_personalizado, us.duracion_personalizada
      FROM usuario_servicios us
      JOIN servicios s ON us.servicio_id = s.id
      WHERE us.usuario_id = $1 AND us.servicio_id = $2 AND us.activo = true
    `;
    
    const result = await this.usuarioServicioRepository.query(servicioQuery, [usuarioId, data.servicio_id]);
    
    if (!result || result.length === 0) {
      throw Object.assign(new Error('El servicio no está disponible para este profesional'), { statusCode: 400 });
    }

    const servicio = result[0];
    const servicioNombre = servicio.nombre;
    const precio = servicio.precio_personalizado || servicio.precio;
    const duracion = servicio.duracion_personalizada || servicio.duracion_minutos;

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
      notas: data.notas,
      servicio: servicioNombre,
      precio,
      duracion_minutos: duracion,
      empresa_id: data.empresa_id
    };

    const turno = await this.turnoRepository.create(turnoData);

    // Simular envío de email
    console.log('📧 [MAIL]', { 
      clienteEmail: 'cliente@example.com', 
      profesionalEmail: 'profesional@example.com', 
      fecha: data.fecha, 
      hora: data.hora, 
      servicio: servicioNombre 
    });

    // Actualizar estado a confirmado
    const turnoConfirmado = await this.turnoRepository.updateEstado(id, 'confirmado');

    return turnoConfirmado;
  }
}
