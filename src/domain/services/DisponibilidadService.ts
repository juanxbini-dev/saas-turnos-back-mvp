import { DisponibilidadSemanal, DiasVacacion, ExcepcionDia } from '../entities/Disponibilidad';
import { Turno } from '../entities/Turno';
import { DateUtils } from '../../shared/utils/DateUtils';
import { isFeatureEnabled, logDate } from '../../shared/config/featureFlags';

export class DisponibilidadService {
  calcularDiasDisponiblesMes(
    disponibilidades: DisponibilidadSemanal[],
    vacaciones: DiasVacacion[],
    excepciones: ExcepcionDia[],
    mes: number,
    año: number
  ): string[] {
    logDate('INICIO - Parámetros:', { mes, año });
    logDate('Excepciones recibidas:', excepciones);
    
    // Usar DateUtils si el feature flag está activo
    const useNewUtils = isFeatureEnabled('USE_DATE_UTILS_IN_DISPONIBILIDAD');
    
    const diasDisponibles: string[] = [];
    const hoy = useNewUtils ? DateUtils.today() : (() => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    })();

    // Debug: Investigar por qué muestra días anteriores
    logDate('Fecha actual y parámetros:', {
      hoy: hoy.toISOString(),
      hoyLocal: useNewUtils ? DateUtils.normalizeDate(hoy) : `${hoy.getFullYear()}-${hoy.getMonth()+1}-${hoy.getDate()}`,
      mesParametro: mes,
      añoParametro: año,
      mesActual: hoy.getMonth() + 1,
      añoActual: hoy.getFullYear(),
      diaActual: hoy.getDate(),
      diaSemanaActual: hoy.getDay(),
      diaSemanaActualTexto: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][hoy.getDay()],
      useNewUtils
    });

    // Generar todos los días del mes
    const ultimoDiaMes = useNewUtils ? DateUtils.getDaysInMonth(año, mes) : new Date(año, mes, 0).getDate();
    
    for (let dia = 1; dia <= ultimoDiaMes; dia++) {
      const fecha = useNewUtils ? DateUtils.createDate(año, mes, dia) : new Date(año, mes - 1, dia);
      const fechaStr = useNewUtils ? DateUtils.normalizeDate(fecha) : `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      
      // No incluir días anteriores a hoy
      const esPasado = useNewUtils ? DateUtils.isPast(fecha) : fecha < hoy;
      
      if (esPasado) {
        logDate('Día excluido (anterior a hoy):', {
          dia,
          fechaStr,
          fechaISO: fecha.toISOString(),
          hoyISO: hoy.toISOString(),
          comparacion: `${fecha.toISOString()} < ${hoy.toISOString()} = ${fecha < hoy}`,
          useNewUtils
        });
        continue;
      }

      // Primero verificar si hay una excepción para este día (prioridad máxima)
      const excepcion = excepciones.find(exc => {
        const fechaExcepcion = useNewUtils ? DateUtils.normalizeDate(exc.fecha) : (() => {
          if (typeof exc.fecha === 'string') {
            return exc.fecha.slice(0, 10);
          }
          const d = exc.fecha as Date;
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        })();
        return fechaExcepcion === fechaStr;
      });
      
      if (excepcion) {
        logDate(`Excepción encontrada para ${fechaStr}:`, excepcion);
        if (excepcion.disponible) {
          // Si la excepción dice que está disponible, agregar el día
          logDate(`Día ${fechaStr} disponible por excepción`);
          diasDisponibles.push(fechaStr);
        } else {
          logDate(`Día ${fechaStr} NO disponible por excepción`);
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
        const fechaInicio = useNewUtils ? DateUtils.normalizeDate(vacacion.fecha) : (() => {
          if (typeof vacacion.fecha === 'string') {
            return vacacion.fecha.slice(0, 10);
          }
          const d = vacacion.fecha as Date;
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        })();
        const fechaFin = vacacion.fecha_fin ? (useNewUtils ? DateUtils.normalizeDate(vacacion.fecha_fin) : (() => {
          if (typeof vacacion.fecha_fin === 'string') {
            return vacacion.fecha_fin.slice(0, 10);
          }
          const d = vacacion.fecha_fin as Date;
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        })()) : fechaInicio;
        
        return fechaStr >= fechaInicio && fechaStr <= fechaFin;
      });

      if (estaDeVacaciones) {
        continue;
      }

      // Si no hay excepción y pasa todas las validaciones, agregar el día
      logDate(`Día ${fechaStr} disponible por disponibilidad semanal`);
      diasDisponibles.push(fechaStr);
    }

    logDate('Días disponibles finales:', diasDisponibles);
    return diasDisponibles;
  }

  calcularSlotsDisponibles(
    disponibilidades: DisponibilidadSemanal[],
    excepciones: ExcepcionDia[],
    turnosExistentes: Turno[],
    fecha: string
  ): string[] {
    logDate('calcularSlotsDisponibles - INICIO');
    logDate('Parámetros:', { fecha });
    logDate('Disponibilidades:', disponibilidades.length);
    logDate('Excepciones:', excepciones);
    logDate('Turnos existentes:', turnosExistentes.length);
    
    // Usar DateUtils si el feature flag está activo
    const useNewUtils = isFeatureEnabled('USE_DATE_UTILS_IN_DISPONIBILIDAD');
    
    const fechaObj = useNewUtils ? DateUtils.combineDateTime(fecha, '00:00') : new Date(fecha + 'T00:00:00');
    const diaSemana = fechaObj.getDay();
    const ahora = new Date();
    
    // Usar hora local para que coincida con la zona horaria del servidor
    const esHoy = useNewUtils ? DateUtils.isToday(fechaObj) : (
      fechaObj.getFullYear() === ahora.getFullYear() &&
      fechaObj.getMonth() === ahora.getMonth() &&
      fechaObj.getDate() === ahora.getDate()
    );
    
    logDate('Fecha procesada:', { 
      fechaParametro: fecha,
      fechaObj,
      fechaObjLocal: useNewUtils ? DateUtils.normalizeDate(fechaObj) : `${fechaObj.getFullYear()}-${fechaObj.getMonth() + 1}-${fechaObj.getDate()}`,
      ahora,
      ahoraLocal: useNewUtils ? DateUtils.normalizeDate(ahora) : `${ahora.getFullYear()}-${ahora.getMonth() + 1}-${ahora.getDate()}`,
      esHoy,
      diaSemana,
      diaSemanaTexto: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][diaSemana],
      horaActual: `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')} LOCAL`,
      horaUTC: `${ahora.getUTCHours().toString().padStart(2, '0')}:${ahora.getUTCMinutes().toString().padStart(2, '0')} UTC`,
      timestamp: Date.now(),
      useNewUtils
    });

    // Primero verificar si hay una excepción que marque el día como NO disponible
    const excepcionNoDisponible = excepciones.find(exc => {
      const fechaExcepcion = useNewUtils ? DateUtils.normalizeDate(exc.fecha) : (() => {
        if (typeof exc.fecha === 'string') {
          return exc.fecha.slice(0, 10);
        }
        const d = exc.fecha as Date;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      })();
      logDate('Verificando excepción NO disponible:', { 
        excFecha: exc.fecha, 
        fechaExcepcion, 
        fechaParametro: fecha, 
        disponible: exc.disponible,
        coincide: fechaExcepcion === fecha
      });
      return fechaExcepcion === fecha && !exc.disponible;
    });

    if (excepcionNoDisponible) {
      logDate('Día marcado como NO disponible por excepción, retornando array vacío');
      return [];
    }

    // Determinar hora_inicio, hora_fin e intervalo del día (excepción tiene prioridad)
    const excepcionDia = excepciones.find(exc => {
      const fechaExcepcion = useNewUtils ? DateUtils.normalizeDate(exc.fecha) : (() => {
        if (typeof exc.fecha === 'string') {
          return exc.fecha.slice(0, 10);
        }
        const d = exc.fecha as Date;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      })();
      logDate('Buscando excepción CON disponibilidad:', { 
        excFecha: exc.fecha, 
        fechaExcepcion, 
        fechaParametro: fecha, 
        disponible: exc.disponible,
        coincide: fechaExcepcion === fecha
      });
      return fechaExcepcion === fecha && exc.disponible;
    });
    
    logDate('Excepción encontrada para el día:', excepcionDia);
    
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
      const slotDateTime = useNewUtils ? DateUtils.combineDateTime(fecha, slot) : new Date(
        fechaObj.getFullYear(),
        fechaObj.getMonth(), 
        fechaObj.getDate(),
        horas,
        minutos
      );
      
      // Usar hora local para comparación
      const slotTimestamp = slotDateTime.getTime();
      const ahoraTimestamp = ahora.getTime();
      const debeIncluirse = !esHoy || slotTimestamp > ahoraTimestamp;
      
      logDate('Evaluando slot:', {
        slot,
        esHoy,
        slotDateTime,
        slotTimestamp,
        ahora,
        ahoraTimestamp,
        debeIncluirse,
        diferenciaMinutos: Math.round((slotTimestamp - ahoraTimestamp) / (1000 * 60)),
        razon: esHoy 
          ? (slotTimestamp > ahoraTimestamp 
              ? `Futuro (+${Math.round((slotTimestamp - ahoraTimestamp) / (1000 * 60))} min) - Incluir` 
              : `Pasado (${Math.round((ahoraTimestamp - slotTimestamp) / (1000 * 60))} min) - Excluir`)
          : 'No es hoy - Incluir',
        useNewUtils
      });
      
      if (debeIncluirse) {
        slots.push(slot);
      }
      
      currentMinutos += intervaloMinutos;
    }

    // Restar slots ocupados por turnos con estado pendiente o confirmado
    const slotsOcupados = turnosExistentes
      .filter(turno => turno.estado === 'pendiente' || turno.estado === 'confirmado')
      .map(turno => {
        const horaNormalizada = turno.hora.slice(0, 5);
        logDate('Turno ocupado:', {
          turno_id: turno.id,
          hora_original: turno.hora,
          hora_normalizada: horaNormalizada,
          estado: turno.estado
        });
        return horaNormalizada;
      });

    const slotsFinales = slots.filter(slot => {
      const estaOcupado = slotsOcupados.includes(slot);
      logDate('Verificando slot:', {
        slot,
        estaOcupado,
        slotsOcupados
      });
      return !estaOcupado;
    });
    
    logDate('Slots generados:', slots);
    logDate('Slots ocupados:', slotsOcupados);
    logDate('Slots finales disponibles:', slotsFinales);
    logDate('calcularSlotsDisponibles - FIN');

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
    const useNewUtils = isFeatureEnabled('USE_DATE_UTILS_IN_DISPONIBILIDAD');
    const fechaObj = useNewUtils ? DateUtils.combineDateTime(fecha, '00:00') : new Date(fecha);
    const diaSemana = fechaObj.getDay();

    // Verificar que la fecha esté disponible
    const diasDisponibles = this.calcularDiasDisponiblesMes(
      disponibilidades,
      vacaciones,
      excepciones,
      useNewUtils ? (fechaObj.getMonth() + 1) : fechaObj.getMonth() + 1,
      useNewUtils ? fechaObj.getFullYear() : fechaObj.getFullYear()
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
