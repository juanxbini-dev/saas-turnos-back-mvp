export interface ConfiguracionProductos {
  empresa_id: string;
  pct_efectivo: number;
  pct_transferencia: number;
  pct_tarjeta: number;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateConfiguracionProductosData {
  pct_efectivo: number;
  pct_transferencia: number;
  pct_tarjeta: number;
}

export const CONFIGURACION_PRODUCTOS_DEFAULT: Omit<ConfiguracionProductos, 'empresa_id'> = {
  pct_efectivo: 0,
  pct_transferencia: 0,
  pct_tarjeta: 0,
};
