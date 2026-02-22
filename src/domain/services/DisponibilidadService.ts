import { DisponibilidadSemanal, DiasVacacion, ExcepcionDia } from '../entities/Disponibilidad';
import { Turno } from '../entities/Turno';

export class DisponibilidadService {
  calcularDiasDisponiblesMes(
    disponibilidades: DisponibilidadSemanal[],
    vacaciones: DiasVacacion[],
    excepciones: ExcepcionDia[],
    mes: number,
    año: number
  ): string[] {
    const diasDisponibles: string[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Generar todos los días del mes
    const ultimoDiaMes = new Date(año, mes, 0).getDate();
    for (let dia = 1; dia <= ultimoDiaMes; dia++) {
      const fecha = new Date(año, mes - 1, dia);
      const fechaStr = fecha.toISOString().split('T')[0];
      
      // No incluir días anteriores a hoy
      if (fecha < hoy) {
        continue;
      }

      const diaSemana = fecha.getDay();

      // Verificar si cae en rango de alguna disponibilidad activa
      const disponiblePorRango = disponibilidades.some(disp => 
        disp.activo && 
        diaSemana >= disp.dia_inicio && 
        diaSemana <= disp.dia_fin
      );

      if (!disponiblePorRango) {
        continue;
      }

      // Restar días con vacaciones activas
      const estaDeVacaciones = vacaciones.some(vacacion => {
        const fechaInicio = new Date(vacacion.fecha);
        const fechaFin = vacacion.fecha_fin ? new Date(vacacion.fecha_fin) : fechaInicio;
        
        return fecha >= fechaInicio && fecha <= fechaFin;
      });

      if (estaDeVacaciones) {
        continue;
      }

      // Aplicar excepciones
      const excepcion = excepciones.find(exc => exc.fecha === fechaStr);
      if (excepcion) {
        if (excepcion.disponible) {
          diasDisponibles.push(fechaStr);
        }
        // Si disponible = false, no se agrega el día
      } else {
        diasDisponibles.push(fechaStr);
      }
    }

    return diasDisponibles;
  }

  calcularSlotsDisponibles(
    disponibilidades: DisponibilidadSemanal[],
    excepciones: ExcepcionDia[],
    turnosExistentes: Turno[],
    fecha: string
  ): string[] {
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay();
    const ahora = new Date();
    const esHoy = fechaObj.toDateString() === ahora.toDateString();

    // Determinar hora_inicio, hora_fin e intervalo del día (excepción tiene prioridad)
    const excepcionDia = excepciones.find(exc => exc.fecha === fecha && exc.disponible);
    
    let horaInicio: string;
    let horaFin: string;
    let intervaloMinutos: number;

    if (excepcionDia?.hora_inicio && excepcionDia?.hora_fin && excepcionDia?.intervalo_minutos) {
      horaInicio = excepcionDia.hora_inicio;
      horaFin = excepcionDia.hora_fin;
      intervaloMinutos = excepcionDia.intervalo_minutos;
    } else {
      const disponibilidad = disponibilidades.find(disp => 
        disp.activo && 
        diaSemana >= disp.dia_inicio && 
        diaSemana <= disp.dia_fin
      );

      if (!disponibilidad) {
        return [];
      }

      horaInicio = disponibilidad.hora_inicio;
      horaFin = disponibilidad.hora_fin;
      intervaloMinutos = disponibilidad.intervalo_minutos;
    }

    // Generar todos los slots según el intervalo
    const slots: string[] = [];
    const inicioParts = horaInicio.split(':');
    const finParts = horaFin.split(':');
    const inicioHoras = Number(inicioParts[0]);
    const inicioMinutos = Number(inicioParts[1]);
    const finHoras = Number(finParts[0]);
    const finMinutos = Number(finParts[1]);

    let currentMinutos = inicioHoras * 60 + inicioMinutos;
    const finMinutosTotal = finHoras * 60 + finMinutos;

    while (currentMinutos < finMinutosTotal) {
      const horas = Math.floor(currentMinutos / 60);
      const minutos = currentMinutos % 60;
      const slot = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
      
      // No incluir slots anteriores a hora actual si es hoy
      if (!esHoy || new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate(), horas, minutos) > ahora) {
        slots.push(slot);
      }
      
      currentMinutos += intervaloMinutos;
    }

    // Restar slots ocupados por turnos con estado pendiente o confirmado
    const slotsOcupados = turnosExistentes
      .filter(turno => turno.estado === 'pendiente' || turno.estado === 'confirmado')
      .map(turno => turno.hora);

    return slots.filter(slot => !slotsOcupados.includes(slot));
  }

  validarSlotDisponible(
    disponibilidades: DisponibilidadSemanal[],
    excepciones: ExcepcionDia[],
    turnosExistentes: Turno[],
    vacaciones: DiasVacacion[],
    fecha: string,
    hora: string
  ): boolean {
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay();

    // Verificar que la fecha esté disponible
    const diasDisponibles = this.calcularDiasDisponiblesMes(
      disponibilidades,
      vacaciones,
      excepciones,
      fechaObj.getMonth() + 1,
      fechaObj.getFullYear()
    );

    if (!diasDisponibles.includes(fecha)) {
      return false;
    }

    // Verificar que el slot no esté ocupado
    const slotsDisponibles = this.calcularSlotsDisponibles(
      disponibilidades,
      excepciones,
      turnosExistentes,
      fecha
    );

    return slotsDisponibles.includes(hora);
  }
}
