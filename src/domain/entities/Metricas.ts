// Métricas de negocio a nivel empresa (solo admin)

export interface MetricasPeriodo {
  fecha_desde: string; // YYYY-MM-DD
  fecha_hasta: string; // YYYY-MM-DD
}

export interface MetricasResumen {
  total_venta: number;
  total_venta_servicios: number;
  total_venta_productos: number;
  total_pendiente: number;
  turnos_completados: number;
  turnos_cancelados: number;
  tasa_cancelacion: number; // % sobre (completados + cancelados)
  ticket_promedio: number;
  cantidad_productos_vendidos: number;
  clientes_activos: number; // clientes con al menos un turno no cancelado en el período
  clientes_nuevos: number;  // clientes cuyo primer turno cae dentro del período
}

export type MetricasAgrupacion = 'dia' | 'mes';

export interface MetricasEvolucionPunto {
  fecha: string; // YYYY-MM-DD (dia) o YYYY-MM (mes)
  total: number;
  servicios: number;
  productos: number;
}

// --- Clientes nuevos: quiénes son y qué profesional eligieron ---

export interface MetricasClienteNuevoItem {
  cliente_id: string;
  cliente_nombre: string;
  telefono: string | null;
  fecha_primera_visita: string; // YYYY-MM-DD
  profesional_id: string | null;
  profesional_nombre: string | null;
  servicio: string;
  origen: 'web' | 'interno' | null;
  volvio: boolean; // tiene al menos un turno no cancelado posterior a la primera visita
}

export interface MetricasClientesNuevosPorProfesional {
  profesional_id: string;
  nombre: string;
  avatar_url: string | null;
  clientes_nuevos: number;
}

export interface MetricasClientesNuevos {
  total: number;
  por_profesional: MetricasClientesNuevosPorProfesional[];
  clientes: MetricasClienteNuevoItem[];
}

// --- Comparativa detallada de profesionales ---

export interface MetricasServicioDesglose {
  servicio: string;
  cantidad: number;   // turnos cobrados de ese servicio
  facturado: number;
}

export interface MetricasComparativaItem {
  profesional_id: string;
  nombre: string;
  username: string;
  avatar_url: string | null;
  // Facturación (solo cobrado, igual criterio que el resto de métricas)
  facturado: number;
  facturado_servicios: number;
  facturado_productos: number;
  neto_profesional: number;
  comision_empresa: number;
  pendiente_cobro: number;
  // Turnos
  turnos_completados: number;
  turnos_cancelados: number;
  tasa_cancelacion: number; // % sobre (completados + cancelados)
  ticket_promedio: number;
  productos_vendidos: number; // unidades
  // Clientes
  clientes_atendidos: number;   // distintos, con turno completado en el período
  clientes_nuevos: number;      // primera visita histórica a la empresa dentro del período, con este profesional
  clientes_recurrentes: number; // atendidos que ya habían visitado la empresa antes del período
  tasa_recurrencia: number;     // % recurrentes sobre atendidos
  // Tiempo
  horas_trabajadas: number;        // suma de duración de turnos completados, en horas
  facturacion_por_hora: number;    // facturado / horas_trabajadas
  // Desgloses
  servicios: MetricasServicioDesglose[];
  evolucion: MetricasEvolucionPunto[]; // facturación del profesional por día/mes
}

export interface MetricasEquipoItem {
  profesional_id: string;
  nombre: string;
  username: string;
  avatar_url: string | null;
  facturado: number;
  facturado_servicios: number;
  facturado_productos: number;
  neto_profesional: number;
  turnos_completados: number;
  turnos_cancelados: number;
  ticket_promedio: number;
}
