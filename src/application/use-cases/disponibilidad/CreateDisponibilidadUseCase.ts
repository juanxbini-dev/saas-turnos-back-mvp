import { IDisponibilidadRepository, CreateDisponibilidadData } from '../../../domain/repositories/IDisponibilidadRepository';
import { DisponibilidadSemanal } from '../../../domain/entities/Disponibilidad';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class CreateDisponibilidadUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private cryptoService: CryptoService
  ) {}

  async execute(
    profesionalId: string,
    diaInicio: number,
    diaFin: number,
    horaInicio: string,
    horaFin: string,
    intervaloMinutos: number,
    empresaId: string,
    usuarioAutenticadoId: string
  ): Promise<DisponibilidadSemanal> {
    // Verificar que el registro pertenezca al profesionalId autenticado
    if (profesionalId !== usuarioAutenticadoId) {
      throw Object.assign(new Error('No puedes crear disponibilidad para otro profesional'), { statusCode: 403 });
    }

    if (!intervaloMinutos || intervaloMinutos < 60 || intervaloMinutos % 60 !== 0) {
      throw Object.assign(new Error('El intervalo debe ser en horas completas (mínimo 60 minutos)'), { statusCode: 400 });
    }

    if (horaFin <= horaInicio) {
      throw Object.assign(new Error('La hora de fin debe ser posterior a la hora de inicio'), { statusCode: 400 });
    }

    if (diaFin < diaInicio) {
      throw Object.assign(new Error('El día de fin debe ser igual o posterior al día de inicio'), { statusCode: 400 });
    }

    // Validar que el nuevo rango no se solape con otro existente.
    // Dos rangos solapan si comparten al menos un día de la semana Y sus horarios se cruzan.
    // Esto permite horarios cortados (ej. Lun-Vie 09-13 y Lun-Vie 17-20) pero rechaza duplicados/cruces.
    const hhmm = (h: string) => h.slice(0, 5); // normaliza "13:00:00" y "13:00" a "13:00"
    const nuevoInicio = hhmm(horaInicio);
    const nuevoFin = hhmm(horaFin);
    const existentes = await this.disponibilidadRepository.findDisponibilidadByProfesional(profesionalId);
    const haySolapamiento = existentes.some(disp => {
      if (!disp.activo) return false;
      const diasSolapan = diaInicio <= disp.dia_fin && diaFin >= disp.dia_inicio;
      // Rangos adyacentes (fin de uno == inicio del otro) NO se consideran solapados
      const horasSolapan = nuevoInicio < hhmm(disp.hora_fin) && nuevoFin > hhmm(disp.hora_inicio);
      return diasSolapan && horasSolapan;
    });

    if (haySolapamiento) {
      throw Object.assign(
        new Error('El horario se solapa con otro rango ya configurado para esos días'),
        { statusCode: 409 }
      );
    }

    const id = this.cryptoService.generateUUID();

    const data: CreateDisponibilidadData = {
      id,
      profesional_id: profesionalId,
      dia_inicio: diaInicio,
      dia_fin: diaFin,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      intervalo_minutos: intervaloMinutos
    };

    return this.disponibilidadRepository.createDisponibilidad(data);
  }
}
