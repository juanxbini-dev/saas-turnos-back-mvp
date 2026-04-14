import { CalculoCompletoTurno, ComisionesCalculadas } from '../../domain/entities/Turno';

export interface ComisionesConfig {
  comision_turno: number;      // % para el profesional
  comision_producto: number;   // % para el profesional
}

export interface DescuentoAplicarA {
  servicio: boolean;
  productos: boolean;
}

export const calcularComisiones = (
  montoServicio: number,
  montoProductos: number,
  descuentoPorcentaje: number,
  config: ComisionesConfig,
  descuentoAplicarA: DescuentoAplicarA = { servicio: true, productos: true }
): CalculoCompletoTurno => {

  // 1. Calcular descuento según a qué ítems aplica
  const subtotalOriginal = montoServicio + montoProductos;
  const baseDescuentoServicio = descuentoAplicarA.servicio ? montoServicio : 0;
  const baseDescuentoProductos = descuentoAplicarA.productos ? montoProductos : 0;
  const baseDescuento = baseDescuentoServicio + baseDescuentoProductos;
  const descuentoMonto = baseDescuento * (descuentoPorcentaje / 100);
  const totalConDescuento = subtotalOriginal - descuentoMonto;

  // 2. Aplicar descuento solo a los ítems seleccionados
  const servicioConDescuento = descuentoAplicarA.servicio
    ? montoServicio - (baseDescuento > 0 ? descuentoMonto * (baseDescuentoServicio / baseDescuento) : 0)
    : montoServicio;
  const productosConDescuento = descuentoAplicarA.productos
    ? montoProductos - (baseDescuento > 0 ? descuentoMonto * (baseDescuentoProductos / baseDescuento) : 0)
    : montoProductos;
  
  // 3. Calcular comisiones (el profesional recibe el %)
  const netoServicioProfesional = servicioConDescuento * (config.comision_turno / 100);
  const comisionServicioMonto = servicioConDescuento - netoServicioProfesional;
  const netoProductosProfesional = productosConDescuento * (config.comision_producto / 100);
  const comisionProductosMonto = productosConDescuento - netoProductosProfesional;

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
      netoProfesional: netoServicioProfesional
    },
    comisionProductos: {
      base: productosConDescuento,
      porcentajeEmpresa: config.comision_producto,
      montoEmpresa: comisionProductosMonto,
      netoProfesional: netoProductosProfesional
    },
    totales: {
      totalRecaudado: totalConDescuento,
      totalEmpresa: comisionServicioMonto + comisionProductosMonto,
      totalProfesional: netoServicioProfesional + netoProductosProfesional
    }
  };
};

export const calcularComisionesSeparadas = (
  montoServicio: number,
  montoProductos: number,
  comisionServicioPorcentaje: number,
  comisionProductoPorcentaje: number
): ComisionesCalculadas => {

  // El profesional recibe el porcentaje configurado
  const netoServicio = montoServicio * (comisionServicioPorcentaje / 100);
  const comisionServicioMonto = montoServicio - netoServicio;
  const netoProductos = montoProductos * (comisionProductoPorcentaje / 100);
  const comisionProductosMonto = montoProductos - netoProductos;

  return {
    servicio: {
      monto: montoServicio,
      comisionPorcentaje: comisionServicioPorcentaje,
      comisionMonto: comisionServicioMonto,
      netoProfesional: netoServicio
    },
    productos: {
      monto: montoProductos,
      comisionPorcentaje: comisionProductoPorcentaje,
      comisionMonto: comisionProductosMonto,
      netoProfesional: netoProductos
    },
    totales: {
      totalRecaudado: montoServicio + montoProductos,
      totalComisionEmpresa: comisionServicioMonto + comisionProductosMonto,
      totalNetoProfesional: netoServicio + netoProductos
    }
  };
};

export const generarId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}`;
};
