/**
 * Utilidad unificada para manejo de fechas en el backend
 * Centraliza toda la lógica de fechas para evitar inconsistencias y duplicación
 */

export class DateUtils {
  // Configuración de zona horaria (puede ser 'UTC' o 'local')
  private static readonly TIMEZONE = 'UTC'; // Siempre UTC para consistencia
  
  /**
   * Normaliza cualquier entrada de fecha a formato YYYY-MM-DD UTC
   * @param fecha Date o string en cualquier formato
   * @returns string en formato YYYY-MM-DD (UTC)
   */
  static normalizeDate(fecha: string | Date): string {
    if (typeof fecha === 'string') {
      // Maneja ambos formatos: ISO y YYYY-MM-DD
      if (fecha.includes('T')) {
        // Formato ISO: convertir a UTC y extraer fecha
        return new Date(fecha).toISOString().split('T')[0] || '';
      }
      // Formato YYYY-MM-DD: asumir medianoche UTC
      return fecha.slice(0, 10);
    }
    
    // Date: convertir a UTC y extraer fecha
    return fecha.toISOString().split('T')[0] || '';
  }

  /**
   * Crea un Date consistentemente en UTC
   * @param año Año (ej: 2024)
   * @param mes Mes (1-12)
   * @param día Día (1-31)
   * @param hora Hora (0-23, default 0)
   * @param minuto Minuto (0-59, default 0)
   * @returns Date en UTC
   */
  static createDate(año: number, mes: number, dia: number, hora = 0, minuto = 0): Date {
    if (this.TIMEZONE === 'UTC') {
      return new Date(Date.UTC(año, mes - 1, dia, hora, minuto));
    } else {
      return new Date(año, mes - 1, dia, hora, minuto);
    }
  }

  /**
   * Valida si una fecha es válida
   * @param fecha Date o string a validar
   * @returns boolean true si es válida
   */
  static isValidDate(fecha: string | Date): boolean {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return !isNaN(date.getTime());
  }

  /**
   * Compara dos fechas ignorando tiempo (solo día)
   * @param fecha1 Primera fecha
   * @param fecha2 Segunda fecha
   * @returns boolean true si son el mismo día
   */
  static isSameDay(fecha1: string | Date, fecha2: string | Date): boolean {
    return this.normalizeDate(fecha1) === this.normalizeDate(fecha2);
  }

  /**
   * Verifica si una fecha es hoy (en UTC)
   * @param fecha Fecha a verificar
   * @returns boolean true si es hoy
   */
  static isToday(fecha: string | Date): boolean {
    return this.isSameDay(fecha, new Date());
  }

  /**
   * Verifica si una fecha es pasada (antes de hoy)
   * @param fecha Fecha a verificar
   * @param incluirHoy Si incluye hoy como pasado
   * @returns boolean true si es pasada
   */
  static isPast(fecha: string | Date, incluirHoy = false): boolean {
    const date = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    
    const fechaUTC = new Date(date);
    fechaUTC.setUTCHours(0, 0, 0, 0);
    
    if (incluirHoy) {
      return fechaUTC < hoy;
    }
    return fechaUTC <= hoy;
  }

  /**
   * Obtiene días del mes para un año/mes específicos
   * @param año Año
   * @param mes Mes (1-12)
   * @returns número de días en el mes
   */
  static getDaysInMonth(año: number, mes: number): number {
    return new Date(Date.UTC(año, mes, 0)).getUTCDate();
  }

  /**
   * Genera rango de fechas entre inicio y fin (inclusive)
   * @param inicio Fecha de inicio
   * @param fin Fecha de fin
   * @returns Array de strings YYYY-MM-DD
   */
  static getDateRange(inicio: string | Date, fin: string | Date): string[] {
    const fechas: string[] = [];
    const start = typeof inicio === 'string' ? new Date(inicio + 'T00:00:00') : inicio;
    const end = typeof fin === 'string' ? new Date(fin + 'T00:00:00') : fin;
    
    const current = new Date(start);
    while (current <= end) {
      fechas.push(this.normalizeDate(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    
    return fechas;
  }

  /**
   * Calcula diferencia en días entre dos fechas
   * @param fecha1 Fecha inicial
   * @param fecha2 Fecha final
   * @returns número de días (positivo si fecha2 > fecha1)
   */
  static daysDifference(fecha1: string | Date, fecha2: string | Date): number {
    const date1 = typeof fecha1 === 'string' ? new Date(fecha1 + 'T00:00:00') : fecha1;
    const date2 = typeof fecha2 === 'string' ? new Date(fecha2 + 'T00:00:00') : fecha2;
    
    return Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Combina fecha y hora en un Date UTC
   * @param fecha Fecha en formato YYYY-MM-DD
   * @param hora Hora en formato HH:MM
   * @returns Date combinado en UTC
   */
  static combineDateTime(fecha: string, hora: string): Date {
    const fechaStr = this.normalizeDate(fecha);
    return new Date(`${fechaStr}T${hora}:00Z`);
  }

  /**
   * Extrae hora de un Date en formato HH:MM
   * @param date Date
   * @returns string HH:MM
   */
  static extractTime(date: Date): string {
    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  }

  /**
   * Formatea fecha para display localizado
   * @param fecha Fecha a formatear
   * @param locale Locale (default 'es-ES')
   * @returns string formateado
   */
  static formatDisplay(fecha: string | Date, locale = 'es-ES'): string {
    const date = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }

  /**
   * Convierte fecha a formato de base de datos (ISO UTC)
   * @param fecha Fecha a convertir
   * @returns string ISO UTC
   */
  static toDBFormat(fecha: string | Date): string {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toISOString();
  }

  /**
   * Convierte desde formato de base de datos (ISO UTC)
   * @param dateString String ISO UTC
   * @returns Date
   */
  static fromDBFormat(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Obtiene timestamp UTC actual
   * @returns número de milisegundos desde epoch
   */
  static now(): number {
    return Date.now();
  }

  /**
   * Crea fecha UTC actual a medianoche
   * @returns Date de hoy a medianoche UTC
   */
  static today(): Date {
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0
    ));
  }
}
