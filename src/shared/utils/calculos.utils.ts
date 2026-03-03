import { CalculoCompletoTurno, ComisionesCalculadas } from '../../domain/entities/Turno';

export interface ComisionesConfig {
  comision_turno: number;      // % para empresa
  comision_producto: number;   // % para empresa
}

export const calcularComisiones = (
  montoServicio: number,
  montoProductos: number,
  descuentoPorcentaje: number,
  config: ComisionesConfig
): CalculoCompletoTurno => {
  
  // 1. Calcular descuento
  const subtotalOriginal = montoServicio + montoProductos;
  const descuentoMonto = subtotalOriginal * (descuentoPorcentaje / 100);
  const totalConDescuento = subtotalOriginal - descuentoMonto;
  
  // 2. Distribuir descuento proporcionalmente
  const proporcionServicio = montoServicio / subtotalOriginal;
  const proporcionProductos = montoProductos / subtotalOriginal;
  
  const servicioConDescuento = montoServicio - (descuentoMonto * proporcionServicio);
  const productosConDescuento = montoProductos - (descuentoMonto * proporcionProductos);
  
  // 3. Calcular comisiones (empresa se queda con el %)
  const comisionServicioMonto = servicioConDescuento * (config.comision_turno / 100);
  const comisionProductosMonto = productosConDescuento * (config.comision_producto / 100);
  
  return {
    precioOriginalServicio: montoServicio,
    precioOriginalProductos: montoProductos,
    subtotalOriginal,
    descuentoPorcentaje,
    descuentoMonto,
    totalConDescuento,
    comisionServicio: {
      base: servicioConDescuento,
      porcentajeEmpresa: config.comision_turno,
      montoEmpresa: comisionServicioMonto,
      netoProfesional: servicioConDescuento - comisionServicioMonto
    },
    comisionProductos: {
      base: productosConDescuento,
      porcentajeEmpresa: config.comision_producto,
      montoEmpresa: comisionProductosMonto,
      netoProfesional: productosConDescuento - comisionProductosMonto
    },
    totales: {
      totalRecaudado: totalConDescuento,
      totalEmpresa: comisionServicioMonto + comisionProductosMonto,
      totalProfesional: (servicioConDescuento - comisionServicioMonto) + (productosConDescuento - comisionProductosMonto)
    }
  };
};

export const calcularComisionesSeparadas = (
  montoServicio: number,
  montoProductos: number,
  comisionServicioPorcentaje: number,
  comisionProductoPorcentaje: number
): ComisionesCalculadas => {
  
  // Calcular comisiones sobre montos ya con descuento
  const comisionServicioMonto = montoServicio * (comisionServicioPorcentaje / 100);
  const comisionProductosMonto = montoProductos * (comisionProductoPorcentaje / 100);
  
  return {
    servicio: {
      monto: montoServicio,
      comisionPorcentaje: comisionServicioPorcentaje,
      comisionMonto: comisionServicioMonto,
      netoProfesional: montoServicio - comisionServicioMonto
    },
    productos: {
      monto: montoProductos,
      comisionPorcentaje: comisionProductoPorcentaje,
      comisionMonto: comisionProductosMonto,
      netoProfesional: montoProductos - comisionProductosMonto
    },
    totales: {
      totalRecaudado: montoServicio + montoProductos,
      totalComisionEmpresa: comisionServicioMonto + comisionProductosMonto,
      totalNetoProfesional: (montoServicio - comisionServicioMonto) + (montoProductos - comisionProductosMonto)
    }
  };
};

export const generarId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}`;
};
