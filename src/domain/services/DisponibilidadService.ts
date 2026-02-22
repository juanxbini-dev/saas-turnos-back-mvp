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
    console.log('🔍🔍🔍 [DisponibilidadService] INICIO - Parámetros:', { mes, año });
    console.log('🔍🔍🔍 [DisponibilidadService] Excepciones recibidas:', excepciones);
    
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

      // Primero verificar si hay una excepción para este día (prioridad máxima)
      const excepcion = excepciones.find(exc => {
        const fechaExcepcion = new Date(exc.fecha).toISOString().split('T')[0];
        return fechaExcepcion === fechaStr;
      });
      if (excepcion) {
        console.log(`🔍 [DisponibilidadService] Excepción encontrada para ${fechaStr}:`, excepcion);
        if (excepcion.disponible) {
          // Si la excepción dice que está disponible, agregar el día
          console.log(`🔍 [DisponibilidadService] Día ${fechaStr} disponible por excepción`);
          diasDisponibles.push(fechaStr!);
        } else {
          console.log(`🔍 [DisponibilidadService] Día ${fechaStr} NO disponible por excepción`);
        }
        // Si disponible = false, no se agrega el día (se ignora la disponibilidad semanal)
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

      // Si no hay excepción y pasa todas las validaciones, agregar el día
      console.log(`🔍 [DisponibilidadService] Día ${fechaStr} disponible por disponibilidad semanal`);
      diasDisponibles.push(fechaStr!);
    }

    console.log('🔍🔍🔍 [DisponibilidadService] Días disponibles finales:', diasDisponibles);
    return diasDisponibles;
  }

  calcularSlotsDisponibles(
    disponibilidades: DisponibilidadSemanal[],
    excepciones: ExcepcionDia[],
    turnosExistentes: Turno[],
    fecha: string
  ): string[] {
    console.log('🔍🔍🔍 [DisponibilidadService] calcularSlotsDisponibles - INICIO');
    console.log('🔍 [DisponibilidadService] Parámetros:', { fecha });
    console.log('🔍 [DisponibilidadService] Disponibilidades:', disponibilidades.length);
    console.log('🔍 [DisponibilidadService] Excepciones:', excepciones);
    console.log('🔍 [DisponibilidadService] Turnos existentes:', turnosExistentes.length);
    
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay();
    const ahora = new Date();
    const esHoy = fechaObj.toDateString() === ahora.toDateString();
    
    console.log('🔍 [DisponibilidadService] Fecha procesada:', { 
      fechaObj, 
      diaSemana, 
      esHoy,
      diaSemanaTexto: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][diaSemana]
    });

    // Primero verificar si hay una excepción que marque el día como NO disponible
    const excepcionNoDisponible = excepciones.find(exc => {
      const fechaExcepcion = new Date(exc.fecha).toISOString().split('T')[0];
      console.log('🔍 [DisponibilidadService] Verificando excepción NO disponible:', { 
        excFecha: exc.fecha, 
        fechaExcepcion, 
        fechaParametro: fecha, 
        disponible: exc.disponible,
        coincide: fechaExcepcion === fecha
      });
      return fechaExcepcion === fecha && !exc.disponible;
    });

    if (excepcionNoDisponible) {
      console.log('🔍 [DisponibilidadService] Día marcado como NO disponible por excepción, retornando array vacío');
      return [];
    }

    // Determinar hora_inicio, hora_fin e intervalo del día (excepción tiene prioridad)
    const excepcionDia = excepciones.find(exc => {
      const fechaExcepcion = new Date(exc.fecha).toISOString().split('T')[0];
      console.log('🔍 [DisponibilidadService] Buscando excepción CON disponibilidad:', { 
        excFecha: exc.fecha, 
        fechaExcepcion, 
        fechaParametro: fecha, 
        disponible: exc.disponible,
        coincide: fechaExcepcion === fecha
      });
      return fechaExcepcion === fecha && exc.disponible;
    });
    
    console.log('🔍 [DisponibilidadService] Excepción encontrada para el día:', excepcionDia);
    
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

    const slotsFinales = slots.filter(slot => !slotsOcupados.includes(slot));
    
    console.log('🔍 [DisponibilidadService] Slots generados:', slots);
    console.log('🔍 [DisponibilidadService] Slots ocupados:', slotsOcupados);
    console.log('🔍 [DisponibilidadService] Slots finales disponibles:', slotsFinales);
    console.log('🔍🔍🔍 [DisponibilidadService] calcularSlotsDisponibles - FIN');

    return slotsFinales;
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
