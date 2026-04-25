import { DisponibilidadSemanal, DiasVacacion, ExcepcionDia } from '../entities/Disponibilidad';
import { BloqueoSlot } from '../entities/BloqueoSlot';
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

      // Verificar excepciones para este día (pueden ser múltiples)
      const excepcionesDelDia = excepciones.filter(exc => {
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

      if (excepcionesDelDia.length > 0) {
        // El día tiene slots disponibles si al menos una excepción lo habilita
        // (una excepción adicional prevalece sobre el bloqueo del día completo)
        const tieneSlotHabilitado = excepcionesDelDia.some(exc => exc.disponible);
        if (tieneSlotHabilitado) {
          logDate(`Día ${fechaStr} disponible por excepción`);
          diasDisponibles.push(fechaStr);
        } else {
          logDate(`Día ${fechaStr} NO disponible por excepción`);
        }
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
    fecha: string,
    bloqueosSlots: BloqueoSlot[] = [],
    duracionMinutos: number = 0
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

    logDate('Fecha procesada:', {
      fechaParametro: fecha,
      fechaObj,
      fechaObjLocal: useNewUtils ? DateUtils.normalizeDate(fechaObj) : `${fechaObj.getFullYear()}-${fechaObj.getMonth() + 1}-${fechaObj.getDate()}`,
      diaSemana,
      diaSemanaTexto: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][diaSemana],
      useNewUtils
    });

    // Normalizar fecha de una excepción (helper inline reutilizable)
    const normalizarFechaExc = (excFecha: string | Date): string => {
      if (useNewUtils) return DateUtils.normalizeDate(excFecha as string);
      if (typeof excFecha === 'string') return excFecha.slice(0, 10);
      const d = excFecha as Date;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Calcular adicionales ANTES del early return: slots habilitados individualmente
    // tienen prioridad sobre el bloqueo de día completo
    const excepcionesAdicionales = excepciones.filter(exc =>
      normalizarFechaExc(exc.fecha) === fecha &&
      exc.disponible &&
      exc.tipo === 'adicional'
    );

    // Verificar si hay una excepción que marque el día como NO disponible
    const excepcionNoDisponible = excepciones.find(exc => {
      const fechaExcepcion = normalizarFechaExc(exc.fecha);
      logDate('Verificando excepción NO disponible:', {
        excFecha: exc.fecha,
        fechaExcepcion,
        fechaParametro: fecha,
        disponible: exc.disponible,
        coincide: fechaExcepcion === fecha
      });
      return fechaExcepcion === fecha && !exc.disponible;
    });

    // Early return solo si no hay adicionales que sobreescriban el bloqueo del día
    if (excepcionNoDisponible && excepcionesAdicionales.length === 0) {
      logDate('Día marcado como NO disponible por excepción, retornando array vacío');
      return [];
    }

    // Excepción de tipo reemplazo: sustituye el horario semanal del día
    const excepcionReemplazo = excepciones.find(exc =>
      normalizarFechaExc(exc.fecha) === fecha &&
      exc.disponible &&
      (!exc.tipo || exc.tipo === 'reemplazo')
    );

    logDate('Excepción reemplazo encontrada:', excepcionReemplazo);
    logDate('Excepciones adicionales encontradas:', excepcionesAdicionales.length);

    let horaInicio: string;
    let horaFin: string;
    let intervaloMinutos: number;

    if (excepcionNoDisponible) {
      // Día no disponible pero con slots adicionales habilitados: omitir horario base
      horaInicio = '';
      horaFin = '';
      intervaloMinutos = 0;
    } else if (excepcionReemplazo?.hora_inicio && excepcionReemplazo?.hora_fin && excepcionReemplazo?.intervalo_minutos) {
      horaInicio = excepcionReemplazo.hora_inicio;
      horaFin = excepcionReemplazo.hora_fin;
      intervaloMinutos = excepcionReemplazo.intervalo_minutos;
    } else {
      const disponibilidad = disponibilidades.find(disp =>
        disp.activo &&
        diaSemana >= disp.dia_inicio &&
        diaSemana <= disp.dia_fin
      );

      if (!disponibilidad && excepcionesAdicionales.length === 0) {
        return [];
      }

      if (!disponibilidad) {
        // Solo hay excepciones adicionales, sin horario base
        horaInicio = '';
        horaFin = '';
        intervaloMinutos = 0;
      } else {
        horaInicio = disponibilidad.hora_inicio;
        horaFin = disponibilidad.hora_fin;
        intervaloMinutos = disponibilidad.intervalo_minutos;
      }
    }

    // Helper para generar slots de un rango y agregarlos al array (sin duplicados)
    const generarSlotsDeRango = (inicio: string, fin: string, intervalo: number, destino: string[]) => {
      const [ih, im] = inicio.split(':').map(Number);
      const [fh, fm] = fin.split(':').map(Number);
      let cur = (ih ?? 0) * 60 + (im ?? 0);
      const finTotal = (fh ?? 0) * 60 + (fm ?? 0);

      while (cur < finTotal) {
        const horas = Math.floor(cur / 60);
        const minutos = cur % 60;
        const slot = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;

        if (!destino.includes(slot)) destino.push(slot);

        cur += intervalo;
      }
    };

    // Generar todos los slots según el intervalo
    const slots: string[] = [];

    if (horaInicio && horaFin && intervaloMinutos > 0) {
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
      
      // El filtrado de slots pasados se delega al frontend (usa hora local del browser).
      // El servidor corre en UTC y no puede conocer la timezone del cliente.
      slots.push(slot);

      currentMinutos += intervaloMinutos;
    }
    } // fin if (horaInicio && horaFin)

    // Agregar slots de excepciones adicionales (se suman al horario base)
    for (const exc of excepcionesAdicionales) {
      if (exc.hora_inicio && exc.hora_fin && exc.intervalo_minutos) {
        generarSlotsDeRango(exc.hora_inicio, exc.hora_fin, exc.intervalo_minutos, slots);
      }
    }

    // Ordenar slots cronológicamente tras el merge
    slots.sort();

    // Helper: convierte "HH:MM" a minutos totales
    const toMin = (hora: string): number => {
      const parts = hora.slice(0, 5).split(':').map(Number);
      return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    };

    // Segmentos de horario disponibles para el día (base + adicionales)
    const segmentos: { inicio: number; fin: number }[] = [];
    if (horaInicio && horaFin && intervaloMinutos > 0) {
      segmentos.push({ inicio: toMin(horaInicio), fin: toMin(horaFin) });
    }
    for (const exc of excepcionesAdicionales) {
      if (exc.hora_inicio && exc.hora_fin) {
        segmentos.push({ inicio: toMin(exc.hora_inicio), fin: toMin(exc.hora_fin) });
      }
    }

    // Bloquear todos los turnos no cancelados (pendiente, confirmado, completado)
    const turnosActivos = turnosExistentes.filter(t => t.estado !== 'cancelado');

    const slotsFinales = slots.filter(slot => {
      const slotMin = toMin(slot);

      // Cuando se solicita duración específica: el slot completo debe caber dentro de un segmento
      if (duracionMinutos > 0) {
        const slotEndMin = slotMin + duracionMinutos;
        const cabe = segmentos.some(seg => slotMin >= seg.inicio && slotEndMin <= seg.fin);
        if (!cabe) {
          logDate('Slot excluido (no cabe la duración):', { slot, duracionMinutos });
          return false;
        }

        // Verificar que el rango [slot, slot+duracion) no se superponga con ningún turno
        return !turnosActivos.some(t => {
          const tStart = toMin(t.hora);
          const tEnd = tStart + (t.duracion_minutos || 60);
          return tStart < slotEndMin && tEnd > slotMin;
        });
      }

      // Sin duración específica: comportamiento legacy (match exacto)
      const estaOcupado = turnosActivos.some(t => t.hora.slice(0, 5) === slot);
      logDate('Verificando slot:', { slot, estaOcupado });
      return !estaOcupado;
    });
    
    // Restar slots bloqueados puntualmente
    const bloqueosDelDia = bloqueosSlots.filter(b => {
      let fechaBloqueo: string;
      if (typeof b.fecha === 'string') {
        fechaBloqueo = b.fecha.slice(0, 10);
      } else {
        const d = b.fecha as unknown as Date;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        fechaBloqueo = `${y}-${m}-${day}`;
      }
      return fechaBloqueo === fecha;
    });

    const slotsSinBloqueos = slotsFinales.filter(slot => {
      const parts = slot.split(':').map(Number);
      const slotMinutos = (parts[0] ?? 0) * 60 + (parts[1] ?? 0);

      return !bloqueosDelDia.some(b => {
        const iParts = b.hora_inicio.split(':').map(Number);
        const fParts = b.hora_fin.split(':').map(Number);
        const bIMin = (iParts[0] ?? 0) * 60 + (iParts[1] ?? 0);
        const bFMin = (fParts[0] ?? 0) * 60 + (fParts[1] ?? 0);
        return slotMinutos >= bIMin && slotMinutos < bFMin;
      });
    });

    logDate('Slots generados:', slots);
    logDate('Turnos confirmados:', turnosActivos.map(t => t.hora.slice(0, 5)));
    logDate('Bloqueos del día:', bloqueosDelDia);
    logDate('Slots finales disponibles:', slotsSinBloqueos);
    logDate('calcularSlotsDisponibles - FIN');

    return slotsSinBloqueos;
  }

  validarSlotDisponible(
    disponibilidades: DisponibilidadSemanal[],
    excepciones: ExcepcionDia[],
    turnosExistentes: Turno[],
    vacaciones: DiasVacacion[],
    fecha: string,
    hora: string,
    bloqueosSlots: BloqueoSlot[] = [],
    duracionMinutos: number = 0
  ): boolean {
    const useNewUtils = isFeatureEnabled('USE_DATE_UTILS_IN_DISPONIBILIDAD');
    const fechaObj = useNewUtils ? DateUtils.combineDateTime(fecha, '00:00') : new Date(fecha + 'T00:00:00');

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

    // Verificar que el slot esté disponible (con chequeo de duración si aplica)
    const slotsDisponibles = this.calcularSlotsDisponibles(
      disponibilidades,
      excepciones,
      turnosExistentes,
      fecha,
      bloqueosSlots,
      duracionMinutos
    );

    return slotsDisponibles.includes(hora);
  }
}
